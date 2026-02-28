param(
    [string]$ZipPath = "glove.2024.wikigiga.50d.zip",
    [string]$SourceEntry = "wiki_giga_2024_50_MFT20_vectors_seed_123_alpha_0.75_eta_0.075_combined.txt",
    [string]$FrequencyZipPath = "word-frequency.zip",
    [string]$FrequencyEntry = "unigram_freq.csv",
    [int]$SmallTopN = 14000,
    [string]$SmallOutputPath = "web/data/glove.2024.wikigiga.50d.top14000.txt",
    [int]$MediumTopN = 50000,
    [string]$MediumOutputPath = "web/data/glove.2024.wikigiga.50d.top50000.txt",
    [string]$GermanVecGzPath = "cc.de.300.vec.gz",
    [int]$GermanSmallTopN = 14000,
    [string]$GermanSmallOutputPath = "web/data/cc.de.300.top14000.txt",
    [int]$GermanMediumTopN = 50000,
    [string]$GermanMediumOutputPath = "web/data/cc.de.300.top50000.txt",
    [switch]$SkipEnglish,
    [switch]$SkipGerman
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ZipPath)) {
    throw "Zip file not found: $ZipPath"
}

if (-not (Test-Path -LiteralPath $FrequencyZipPath)) {
    throw "Frequency zip file not found: $FrequencyZipPath"
}

function Get-TopFrequencyWords {
    param(
        [string]$ZipFile,
        [string]$EntryName,
        [int]$Count
    )

    $words = New-Object System.Collections.Generic.List[string]
    $seen = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)

    $freqZip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $ZipFile))
    try {
        $freqEntry = $freqZip.GetEntry($EntryName)
        if (-not $freqEntry) {
            $available = $freqZip.Entries | Select-Object -ExpandProperty FullName
            throw "Could not find entry '$EntryName' in frequency zip. Available entries: $($available -join ', ')"
        }

        $stream = $freqEntry.Open()
        $reader = New-Object System.IO.StreamReader($stream)
        try {
            if (-not $reader.EndOfStream) {
                [void]$reader.ReadLine()
            }

            while (-not $reader.EndOfStream -and $words.Count -lt $Count) {
                $line = $reader.ReadLine()
                if ([string]::IsNullOrWhiteSpace($line)) {
                    continue
                }

                $parts = $line.Split(',', 2)
                if ($parts.Length -lt 1) {
                    continue
                }

                $word = $parts[0].Trim()
                if ([string]::IsNullOrWhiteSpace($word)) {
                    continue
                }

                if ($seen.Add($word)) {
                    $words.Add($word)
                }
            }
        }
        finally {
            $reader.Dispose()
            $stream.Dispose()
        }
    }
    finally {
        $freqZip.Dispose()
    }

    return $words
}

function Write-FilteredEmbeddings {
    param(
        [string]$ZipFile,
        [string]$EntryName,
        [System.Collections.Generic.List[string]]$TargetWords,
        [string]$DestinationPath
    )

    $targetSet = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($word in $TargetWords) {
        [void]$targetSet.Add($word)
    }

    $zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $ZipFile))
    try {
        $entry = $zip.GetEntry($EntryName)
        if (-not $entry) {
            $available = $zip.Entries | Select-Object -ExpandProperty FullName
            throw "Could not find entry '$EntryName' in zip. Available entries: $($available -join ', ')"
        }

        $resolvedOutput = Join-Path -Path (Get-Location) -ChildPath $DestinationPath
        $outputDir = Split-Path -Path $resolvedOutput -Parent
        if (-not (Test-Path -LiteralPath $outputDir)) {
            New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
        }

        $inStream = $entry.Open()
        $reader = New-Object System.IO.StreamReader($inStream)

        $outStream = [System.IO.File]::Open($resolvedOutput, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
        $writer = New-Object System.IO.StreamWriter($outStream)

        try {
            $writer.NewLine = "`n"
            $matchedLinesByWord = @{}

            while (-not $reader.EndOfStream -and $matchedLinesByWord.Count -lt $TargetWords.Count) {
                $line = $reader.ReadLine()
                if ([string]::IsNullOrWhiteSpace($line)) {
                    continue
                }

                $spaceIndex = $line.IndexOf(' ')
                if ($spaceIndex -le 0) {
                    continue
                }

                $word = $line.Substring(0, $spaceIndex)
                if ($targetSet.Contains($word) -and -not $matchedLinesByWord.ContainsKey($word)) {
                    $matchedLinesByWord[$word] = $line
                }
            }

            $kept = 0
            foreach ($word in $TargetWords) {
                if ($matchedLinesByWord.ContainsKey($word)) {
                    $writer.WriteLine($matchedLinesByWord[$word])
                    $kept++
                }
            }

            Write-Host "Wrote $kept embeddings to $resolvedOutput"
            if ($kept -lt $TargetWords.Count) {
                Write-Host "Warning: $($TargetWords.Count - $kept) frequency words were not found in the embeddings."
            }
        }
        finally {
            $writer.Dispose()
            $reader.Dispose()
            $inStream.Dispose()
        }
    }
    finally {
        $zip.Dispose()
    }
}

function Write-TopFastTextFromGzip {
    param(
        [string]$GzipFile,
        [int]$Count,
        [string]$DestinationPath
    )

    if ($Count -le 0) {
        throw "Count must be > 0 for destination '$DestinationPath'."
    }

    $resolvedInput = Resolve-Path -LiteralPath $GzipFile
    $resolvedOutput = Join-Path -Path (Get-Location) -ChildPath $DestinationPath
    $outputDir = Split-Path -Path $resolvedOutput -Parent
    if (-not (Test-Path -LiteralPath $outputDir)) {
        New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    }

    $inStream = [System.IO.File]::OpenRead($resolvedInput)
    $gzipStream = New-Object System.IO.Compression.GzipStream($inStream, [System.IO.Compression.CompressionMode]::Decompress)
    $reader = New-Object System.IO.StreamReader($gzipStream)

    $outStream = [System.IO.File]::Open($resolvedOutput, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
    $writer = New-Object System.IO.StreamWriter($outStream)

    try {
        $writer.NewLine = "`n"

        $seen = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
        $kept = 0
        $headerSkipped = $false

        while (-not $reader.EndOfStream -and $kept -lt $Count) {
            $line = $reader.ReadLine()
            if ([string]::IsNullOrWhiteSpace($line)) {
                continue
            }

            if (-not $headerSkipped -and $line -match '^\d+\s+\d+$') {
                $headerSkipped = $true
                continue
            }

            $headerSkipped = $true

            $spaceIndex = $line.IndexOf(' ')
            if ($spaceIndex -le 0) {
                continue
            }

            $word = $line.Substring(0, $spaceIndex)
            if ($seen.Add($word)) {
                $writer.WriteLine($line)
                $kept++
            }
        }

        if ($kept -eq 0) {
            throw "No vectors were written from '$GzipFile'."
        }

        Write-Host "Wrote $kept fastText embeddings to $resolvedOutput"
        if ($kept -lt $Count) {
            Write-Host "Warning: requested $Count vectors but only wrote $kept from '$GzipFile'."
        }
    }
    finally {
        $writer.Dispose()
        $reader.Dispose()
        $outStream.Dispose()
        $gzipStream.Dispose()
        $inStream.Dispose()
    }
}

Add-Type -AssemblyName System.IO.Compression.FileSystem

$didBuildAny = $false

if (-not $SkipEnglish) {
    if ((Test-Path -LiteralPath $ZipPath) -and (Test-Path -LiteralPath $FrequencyZipPath)) {
        $smallTargetWords = Get-TopFrequencyWords -ZipFile $FrequencyZipPath -EntryName $FrequencyEntry -Count $SmallTopN
        if ($smallTargetWords.Count -eq 0) {
            throw "No words loaded from frequency file for small English dataset."
        }

        $mediumTargetWords = Get-TopFrequencyWords -ZipFile $FrequencyZipPath -EntryName $FrequencyEntry -Count $MediumTopN
        if ($mediumTargetWords.Count -eq 0) {
            throw "No words loaded from frequency file for medium English dataset."
        }

        Write-Host "Building English small dataset ($SmallTopN words)..."
        Write-FilteredEmbeddings -ZipFile $ZipPath -EntryName $SourceEntry -TargetWords $smallTargetWords -DestinationPath $SmallOutputPath

        Write-Host "Building English medium dataset ($MediumTopN words)..."
        Write-FilteredEmbeddings -ZipFile $ZipPath -EntryName $SourceEntry -TargetWords $mediumTargetWords -DestinationPath $MediumOutputPath
        $didBuildAny = $true
    }
    else {
        Write-Host "Skipping English build: missing '$ZipPath' or '$FrequencyZipPath'."
    }
}

if (-not $SkipGerman) {
    if (Test-Path -LiteralPath $GermanVecGzPath) {
        Write-Host "Building German small dataset ($GermanSmallTopN words)..."
        Write-TopFastTextFromGzip -GzipFile $GermanVecGzPath -Count $GermanSmallTopN -DestinationPath $GermanSmallOutputPath

        Write-Host "Building German medium dataset ($GermanMediumTopN words)..."
        Write-TopFastTextFromGzip -GzipFile $GermanVecGzPath -Count $GermanMediumTopN -DestinationPath $GermanMediumOutputPath
        $didBuildAny = $true
    }
    else {
        Write-Host "Skipping German build: file not found '$GermanVecGzPath'."
    }
}

if (-not $didBuildAny) {
    throw "No datasets were built. Provide source files or disable skipped pipelines with -SkipEnglish / -SkipGerman."
}

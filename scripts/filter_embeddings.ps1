param(
    [string]$ZipPath = "glove.2024.wikigiga.50d.zip",
    [string]$SourceEntry = "wiki_giga_2024_50_MFT20_vectors_seed_123_alpha_0.75_eta_0.075_combined.txt",
    [string]$FrequencyZipPath = "word-frequency.zip",
    [string]$FrequencyEntry = "unigram_freq.csv",
    [int]$TopN = 20000,
    [string]$OutputPath = "web/data/glove.2024.wikigiga.50d.top20000.txt"
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

Add-Type -AssemblyName System.IO.Compression.FileSystem
$targetWords = Get-TopFrequencyWords -ZipFile $FrequencyZipPath -EntryName $FrequencyEntry -Count $TopN
if ($targetWords.Count -eq 0) {
    throw "No words loaded from frequency file."
}

$targetSet = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
foreach ($word in $targetWords) {
    [void]$targetSet.Add($word)
}

$zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $ZipPath))

try {
    $entry = $zip.GetEntry($SourceEntry)
    if (-not $entry) {
        $available = $zip.Entries | Select-Object -ExpandProperty FullName
        throw "Could not find entry '$SourceEntry' in zip. Available entries: $($available -join ', ')"
    }

    $resolvedOutput = Join-Path -Path (Get-Location) -ChildPath $OutputPath
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

        while (-not $reader.EndOfStream -and $matchedLinesByWord.Count -lt $targetWords.Count) {
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
        foreach ($word in $targetWords) {
            if ($matchedLinesByWord.ContainsKey($word)) {
                $writer.WriteLine($matchedLinesByWord[$word])
                $kept++
            }
        }

        Write-Host "Wrote $kept embeddings to $resolvedOutput"
        if ($kept -lt $targetWords.Count) {
            Write-Host "Warning: $($targetWords.Count - $kept) frequency words were not found in the embeddings."
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

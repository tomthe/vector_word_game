# vector Codenames

idea
    The board game codenames, but as single player computer game on a website
    you get 4 random words: 2 left, 2 right.
    Now you have to find one word that is nearer to both the 2 left  words than any of the right words!
    Then more words...
Plan
    download pretrained word embeddings
    They should not have too many dimensions
        This site has word embeddings in different vector sizes and the most frequent words are at the top. So we can use a small vector size and use the top. This will only be a few MB then as text
            https://nlp.stanford.edu/projects/glove/
            https://nlp.stanford.edu/data/wordvecs/glove.2024.wikigiga.50d.zip
    I already downloaded them into this folder. look at the beginning!
    filter them down to the ca. 20 000 most used words - more is nice, but it needs to be fine for browsers!
    Save them in a browser-digestible format. JSON? CSV? DUCKDB? - maybe the provided text files (one line per word: word, number number...) is fine
    Game logic - implemented in JS+HTML
        Setup: Let the user select n and how many players
        Load word embedding dataset
        pick n random "left" and n random "right" words
        Show them to the player
        let the player (or players! (later, do not implement multiplayer yet)) pick a word. The player inputs text into an autocomplete textbox. Autocomplete.js with all available words
        calculate distance between the picked word and the random words - use vector distance metric: cosine? Library is probably overkill, just implement vector distance and go through all words... not sure about this.
        Show the result and count points, pick new words
            show the distance to every word. mark left words red, when the chosen word is nearer to a right word than that left word.

/* 
File: script.js
This file contains all the game logic for the Scrabble game. It starts by dynamically generating the Scrabble board overlay with bonus squares highlighted.
The drag-and-drop functionality allows players to move tiles from the rack to valid cells on the board while reverting tiles dropped in invalid locations.
The Word Validation process uses a dictionary API and a fallback local word list, ensuring even obscure words like "qi" or "za" are recognized.
Scoring is calculated dynamically, incorporating tile values and bonus square effects. The game also includes interactive buttons for controls: 
refreshing tiles (while managing remaining tiles), clearing the board, and restarting the game. A modal is used to provide real-time feedback to users, 
such as error messages or validation confirmations. Additionally, the logic ensures players cannot refresh tiles when no tiles are left, maintaining game integrity.
*/

$(document).ready(function () {
    const scrabbleBoardOverlay = $("#scrabble-board-overlay");
    const tileRack = $("#tile-rack");
    let currentScore = 0;
    let highestScore = 0;
    let remainingTiles = 100; // Initial number of tiles
    let validatedWords = new Set(); // Track validated words

    // Create interactive cells overlay
    function createBoardOverlay() {
        scrabbleBoardOverlay.empty(); // Clear existing cells

        // Create 7 cells
        for (let i = 0; i < 7; i++) {
            const isBonus = i === 1 || i === 5; // Double-word scores
            scrabbleBoardOverlay.append(`
                <div class="board-cell ${isBonus ? 'double-word-score' : ''}" data-cell-index="${i}"></div>
            `);
        }

        enableCellDropping(); // Ensure droppable functionality is re-applied
    }

    // Make tiles draggable
    function enableTileDragging() {
        $(".tile").draggable({
            revert: "invalid", // Return to original position if not dropped on a valid cell
            cursor: "move",
            stack: ".tile",
            containment: "document",
        });
    }

    // Make board cells droppable
    function enableCellDropping() {
        $(".board-cell").droppable({
            accept: ".tile", // Only accept elements with the class 'tile'
            hoverClass: "droppable-hover", // Add a hover effect
            drop: function (event, ui) {
                const tile = ui.draggable; // Get the dragged tile

                // Check if the cell already has a tile
                if ($(this).children(".tile").length > 0) {
                    // Move the tile back to the tile rack
                    $("#tile-rack").append(tile);
                    tile.css({
                        position: "relative",
                        top: "0",
                        left: "0",
                    });

                    alert("This cell already has a tile! The tile will be moved back to the rack.");
                    return; // Prevent further action
                }

                const letter = tile.data("letter");
                const value = tile.data("value");

                // Move the tile into the cell
                $(this).append(tile);
                tile.css({
                    top: "0",
                    left: "0",
                    position: "absolute", // Ensure it aligns with the cell
                });

                // Store tile data in the cell for later use
                $(this).data("tile", { letter, value });
                console.log(`Tile ${letter} placed in cell.`);
            },
        });
    }

    // Make tile rack droppable to accept tiles back
    function enableTileRackDropping() {
        tileRack.droppable({
            accept: ".tile", // Accept tiles from the board
            hoverClass: "droppable-hover", // Add a hover effect
            drop: function (event, ui) {
                const tile = ui.draggable; // Get the dragged tile

                // Remove tile from its current board cell
                const parentCell = tile.parent(".board-cell");
                if (parentCell.length > 0) {
                    parentCell.removeData("tile"); // Clear the data from the cell
                }

                // Append the tile back to the tile rack
                $(this).append(tile);
                tile.css({
                    top: "0",
                    left: "0",
                    position: "relative", // Align within the tile rack
                });

                console.log(`Tile ${tile.data("letter")} returned to rack.`);
            },
        });
    }

    // Generate random tiles for the tile rack
    function fillTileRack() {
        const tileKeys = Object.keys(ScrabbleTiles);
        tileRack.empty(); // Clear any existing tiles

        if (remainingTiles <= 0) {
            displayMessage("No more tiles remaining! You cannot refresh anymore.", "red");
            return; // Prevent further action if no tiles are left
        }

        const tilesToGenerate = remainingTiles >= 7 ? 7 : remainingTiles; // Generate only the remaining tiles if less than 7

        for (let i = 0; i < tilesToGenerate; i++) {
            const randomIndex = Math.floor(Math.random() * tileKeys.length);
            const letter = tileKeys[randomIndex];

            const tile = ScrabbleTiles[letter];
            const tileImagePath = letter === "_"
                ? "./graphics_data/Scrabble_Tiles/Scrabble_Tile_Blank.jpg"
                : `./graphics_data/Scrabble_Tiles/Scrabble_Tile_${letter}.jpg`;

            tileRack.append(`
                <div class="tile" 
                     data-letter="${letter}" 
                     data-value="${tile.value}" 
                     style="background-image: url('${tileImagePath}'); width: 80px; height: 80px;">
                </div>
            `);
        }

        remainingTiles -= tilesToGenerate; // Deduct only the number of tiles generated
        $("#remaining-tiles").text(remainingTiles); // Update remaining tiles display

        enableTileDragging(); // Ensure dragging functionality is applied
        enableTileRackDropping(); // Enable rack to accept tiles back
    }

    // Display modal messages with conditional styling
    function displayMessage(message, color = "green") {
        const modalMessage = $("#modal-message");
        modalMessage.text(message);

        // Set the color based on the passed parameter
        if (color === "red") {
            modalMessage.css("color", "red");
        } else if (color === "black") {
            modalMessage.css("color", "black");
        } else {
            modalMessage.css("color", "green");
        }

        $("#modal").removeClass("hidden");
    }

    // Add event listener for closing the modal
    $("#close-modal").on("click", function () {
        $("#modal").addClass("hidden");
    });

    // The scoring function (only called if the word is valid)
    function calculateScore() {
        let score = 0;
        let multiplier = 1; // Tracks word multipliers like "Double Word Score"

        $(".board-cell").each(function () {
            const tileData = $(this).data("tile"); // Get the stored tile data
            if (tileData) {
                const tileValue = tileData.value; // Get the value of the tile
                score += tileValue; // Add tile value to the score

                // Apply bonus square logic
                if ($(this).hasClass("double-word-score")) {
                    multiplier *= 2; // Apply double word score multiplier
                }
            }
        });

        score *= multiplier; // Apply word multiplier
        currentScore += score; // Update current score
        $("#score").text(currentScore); // Update the score on the webpage
        console.log(`Word Score: ${score}, Current Score: ${currentScore}`);
    }

    // Function to capture the formed word
    function getFormedWord() {
        let formedWord = "";

        $(".board-cell").each(function () {
            const tileData = $(this).data("tile");
            if (tileData) {
                formedWord += tileData.letter; // Concatenate letters to form the word
            }
        });

        // Update the displayed formed word
        $("#current-word").text(formedWord);

        return formedWord;
    }

    // Local word list as fallback
    const localWordList = [
        "aa", "ab", "ad", "ae", "ag", "ah", "ai", "al", "am", "an", "ar", "as", "at", "aw", "ax", "ay",
        "ba", "be", "bi", "bo", "by",
        "da", "de", "do",
        "ed", "ef", "eh", "el", "em", "en", "er", "es", "et", "ex",
        "fa", "fe",
        "go",
        "ha", "he", "hi", "ho",
        "id", "if", "in", "is", "it",
        "jo",
        "ka", "ki",
        "la", "li", "lo",
        "ma", "me", "mi", "mm", "mo", "mu", "my",
        "na", "ne", "no", "nu",
        "od", "oe", "of", "oh", "oi", "om", "on", "op", "or", "os", "ow", "ox", "oy",
        "pa", "pe", "pi",
        "qi",
        "re",
        "sh", "si", "so",
        "ta", "te", "ti", "to",
        "uh", "um", "un", "up", "us", "ut",
        "we", "wo",
        "xi", "xu",
        "ya", "ye", "yo",
        "za"
      ];
      

    // Validate word using a dictionary API
    function validateWordAPI(word) {
        if (word.length < 2) {
            displayMessage("The word must contain at least 2 letters!", "red");
            return;
        }
    
        if (validatedWords.has(word)) {
            displayMessage(`The word "${word}" has already been validated.`, "black");
            return;
        }
    
        const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
    
        $.ajax({
            url: apiUrl,
            method: "GET",
            success: function () {
                validatedWords.add(word); // Mark word as validated
                displayMessage(`The word "${word}" is valid and has been validated!`, "green"); // Green message
                calculateScore(); // Only calculate score if the word is valid
            },
            error: function () {
                // Check the local word list if API fails
                if (localWordList.includes(word.toLowerCase())) {
                    validatedWords.add(word); // Mark word as validated
                    displayMessage(`The word "${word}" is valid and has been validated!`, "green"); // Green message
                    calculateScore(); // Only calculate score if the word is valid
                } else {
                    displayMessage(`The word "${word}" is not valid. Please try again.`, "red"); // Red message
                }
            },
        });
    }

    // Add event listener for "Validate Word" button
    $("#validate-word").on("click", function () {
        const formedWord = getFormedWord();
        validateWordAPI(formedWord);
    });

    // Add functionality for "Refresh Letters" button
    $("#refresh-letters").on("click", function () {
        // Clear the board
        $(".board-cell").each(function () {
            const tile = $(this).children(".tile");
            if (tile.length > 0) {
                tileRack.append(tile); // Move tile back to rack
                tile.css({
                    top: "0",
                    left: "0",
                    position: "relative",
                });
                $(this).removeData("tile"); // Clear data from cell
            }
        });

        validatedWords.clear(); // Clear validated words
        fillTileRack(); // Generate a new set of random tiles
        console.log("Letters refreshed and board cleared. A new set of tiles has been given.");
    });

    // Add functionality for "Start Over" button
    $("#new-game").on("click", function () {
        if (currentScore > highestScore) {
            highestScore = currentScore; // Update highest score if current score is greater
        }
        $("#highest-score").text(highestScore); // Update the highest score on the webpage

        currentScore = 0; // Reset current score
        $("#score").text(currentScore); // Reset score display

        validatedWords.clear(); // Clear validated words
        createBoardOverlay(); // Reset board
        fillTileRack(); // Refill the tile rack
        remainingTiles = 100; // Reset remaining tiles
        $("#remaining-tiles").text(remainingTiles);
        console.log("New game started. Highest Score: " + highestScore);
    });

    // Add functionality for "Clear Board" button
    $("#clear-board").on("click", function () {
        $(".board-cell").each(function () {
            const tile = $(this).children(".tile");
            if (tile.length > 0) {
                tileRack.append(tile); // Move tile back to rack
                tile.css({
                    top: "0",
                    left: "0",
                    position: "relative",
                });
                $(this).removeData("tile"); // Clear data from cell
            }
        });
        console.log("Board cleared. All tiles have been moved back to the rack.");
    });

    // Initialize the game
    function initializeGame() {
        createBoardOverlay();
        fillTileRack();
    }

    initializeGame();
});

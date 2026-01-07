const chessboard = document.getElementById('chessboard');
const API_URL = 'http://localhost:5001';
const BOARD_SIZE = 8;
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];

// Map piece symbols to Unicode characters
const pieceSymbols = {
    'k': '♔', // white king
    'q': '♕', // white queen
    'r': '♖', // white rook
    'b': '♗', // white bishop
    'n': '♘', // white knight
    'p': '♙', // white pawn
    'K': '♚', // black king
    'Q': '♛', // black queen
    'R': '♜', // black rook
    'B': '♝', // black bishop
    'N': '♞', // black knight
    'P': '♟', // black pawn
};

let selectedSquare = null;
let gameState = null;
let playerColor = 'white'; // Player is white, pieces at the bottom of the board
let isComputerThinking = false;
let statusElement = null;
let moveHistoryElement = null;
let resetButton = null;
let moveHistory = [];
let skillSlider = null;
let skillLabel = null;
let skillValue = null;

// Initialize the board
function initializeBoard() {
    // Create status display
    statusElement = document.createElement('div');
    statusElement.id = 'status';
    statusElement.className = 'status';
    document.body.insertBefore(statusElement, document.querySelector('.game-container'));
    
    // Initialize move history element
    moveHistoryElement = document.getElementById('move-history');
    
    // Initialize reset button
    resetButton = document.getElementById('reset-button');
    resetButton.addEventListener('click', resetGame);

    // Initialize skill slider
    skillSlider = document.getElementById('skill-slider');
    skillLabel = document.getElementById('skill-label');
    skillValue = document.getElementById('skill-value');

    if (skillSlider) {
        skillSlider.addEventListener('input', handleSkillChange);
        // Fetch initial skill level from server
        fetchSkillLevel();
    }

    // Create the squares
    // Note: We create the board from bottom to top (rank 1 to 8)
    // This ensures the board is oriented correctly with white at the bottom
    for (let rankIndex = 0; rankIndex < BOARD_SIZE; rankIndex++) {
        for (let fileIndex = 0; fileIndex < BOARD_SIZE; fileIndex++) {
            const square = document.createElement('div');
            square.classList.add('square');
            // Alternate colors for the chess board pattern
            square.classList.add((rankIndex + fileIndex) % 2 === 0 ? 'white' : 'black');
            
            // Get the square name (e.g., "a1", "e4")
            const squareName = FILES[fileIndex] + RANKS[7 - rankIndex];
            square.dataset.position = squareName;
            square.addEventListener('click', () => handleSquareClick(square));
            
            chessboard.appendChild(square);
        }
    }
    
    // Get initial board state
    fetchBoardState();
}

// Fetch the current board state from the API
async function fetchBoardState() {
    try {
        const response = await fetch(`${API_URL}/board`);
        if (!response.ok) {
            throw new Error('Failed to fetch board state');
        }
        
        gameState = await response.json();
        updateBoard();
        updateStatus();
    } catch (error) {
        console.error('Error fetching board state:', error);
        setStatus('Error connecting to server');
    }
}

// Update the board display based on the current game state
function updateBoard() {
    // Clear all pieces
    document.querySelectorAll('.square span').forEach(span => span.remove());
    
    // Place pieces according to the current state
    if (gameState && gameState.pieces) {
        Object.entries(gameState.pieces).forEach(([square, piece]) => {
            const squareElement = document.querySelector(`.square[data-position="${square}"]`);
            if (squareElement) {
                const pieceElement = document.createElement('span');
                pieceElement.textContent = pieceSymbols[piece.type];
                pieceElement.classList.add(piece.color);
                squareElement.appendChild(pieceElement);
            }
        });
    }
    
    // Clear any highlights
    document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
    selectedSquare = null;
}

// Update the game status display
function updateStatus() {
    if (!gameState) return;
    
    let statusText = `Current turn: ${gameState.turn}`;
    
    if (gameState.is_check) {
        statusText += ' | CHECK!';
    }
    
    if (gameState.is_checkmate) {
        statusText = `CHECKMATE! ${gameState.turn === 'white' ? 'Black' : 'White'} wins!`;
    } else if (gameState.is_stalemate) {
        statusText = 'STALEMATE! Game is drawn.';
    } else if (gameState.is_game_over) {
        statusText = 'Game over!';
    }
    
    setStatus(statusText);
}

// Set the status message
function setStatus(message) {
    if (statusElement) {
        statusElement.textContent = message;
    }
}

// Handle square click events
function handleSquareClick(square) {
    if (isComputerThinking || (gameState && gameState.is_game_over)) {
        return; // Ignore clicks while computer is thinking or game is over
    }
    
    if (gameState && gameState.turn !== playerColor) {
        setStatus("It's not your turn!");
        return;
    }
    
    const position = square.dataset.position;
    const pieceElement = square.querySelector('span');
    
    console.log("Clicked square:", position);
    console.log("Piece:", pieceElement ? pieceElement.textContent : "none");
    console.log("Piece color:", pieceElement ? pieceElement.classList : "none");
    
    // Check if this is a valid move in the legal moves list
    if (selectedSquare) {
        if (square === selectedSquare) {
            // Unselect the piece
            square.classList.remove('highlight');
            selectedSquare = null;
        } else {
            // Try to move the piece
            const fromPosition = selectedSquare.dataset.position;
            console.log("Attempting move from", fromPosition, "to", position);
            
            // Map the coordinates to server format to check against legal moves
            const fromFile = fromPosition.charAt(0);
            const fromRank = fromPosition.charAt(1);
            const toFile = position.charAt(0);
            const toRank = position.charAt(1);
            
            // Map the rank from UI to server (e.g., d7 -> d2)
            const fromCoord = fromFile + (9 - parseInt(fromRank));
            const toCoord = toFile + (9 - parseInt(toRank));
            
            const moveUCI = fromCoord + toCoord;
            console.log("Mapped move:", moveUCI);
            console.log("Legal moves:", gameState.legal_moves);
            
            if (gameState.legal_moves && gameState.legal_moves.includes(moveUCI)) {
                console.log("Move is legal according to server");
                makeMove(fromPosition, position);
            } else {
                console.log("Move is not in legal moves list");
                // Try the move anyway - our mapping might be off
                makeMove(fromPosition, position);
            }
        }
    } else if (pieceElement) {
        // Check if the piece belongs to the player
        const pieceColor = pieceElement.classList.contains('white') ? 'white' : 'black';
        console.log("Piece color:", pieceColor, "Player color:", playerColor);
        
        if (pieceColor === playerColor) {
            // Select the piece
            square.classList.add('highlight');
            selectedSquare = square;
            console.log("Selected piece at", position);
        } else {
            console.log("Cannot select opponent's piece");
        }
    }
}

// Make a move and send it to the server
async function makeMove(from, to) {
    // We need to map the UI coordinates to the server's coordinates
    // The UI has white pieces at the bottom (a1-h1), but they're displayed at the top (a8-h8)
    // We need to flip the rank (number) part of the coordinate
    const fromFile = from.charAt(0);
    const fromRank = from.charAt(1);
    const toFile = to.charAt(0);
    const toRank = to.charAt(1);
    
    // Map the rank from UI to server (e.g., d7 -> d2)
    const fromCoord = fromFile + (9 - parseInt(fromRank));
    const toCoord = toFile + (9 - parseInt(toRank));
    
    const moveUCI = fromCoord + toCoord;
    
    try {
        isComputerThinking = true;
        setStatus('Making move...');
        
        // Store the current board state to detect the computer's move later
        const previousPieces = gameState ? JSON.stringify(gameState.pieces) : null;
        
        // Store the previous board state for comparison
        const previousBoard = { ...gameState };
        
        console.log("Making move:", moveUCI);
        console.log("From piece:", gameState.pieces[from]);
        console.log("To square:", gameState.pieces[to] || "empty");
        console.log("Legal moves:", gameState.legal_moves);
        
        const response = await fetch(`${API_URL}/move`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ move: moveUCI })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Server error:", errorData);
            throw new Error(errorData.error || 'Invalid move');
        }
        
        // Get the new game state
        gameState = await response.json();
        console.log("New game state:", gameState);
        
        // Always add the move to history if the server accepted it
        // Check if this is a promotion move (pawn reaching the last rank)
        let promotionPiece = '';
        if ((from[1] === '7' && to[1] === '8' && gameState.pieces[to] && gameState.pieces[to].type !== 'p') ||
            (from[1] === '2' && to[1] === '1' && gameState.pieces[to] && gameState.pieces[to].type !== 'P')) {
            // This is a promotion - add the promotion piece to the move
            promotionPiece = gameState.pieces[to].type.toLowerCase() === gameState.pieces[to].type ?
                gameState.pieces[to].type : gameState.pieces[to].type.toLowerCase();
            addMoveToHistory(moveUCI + promotionPiece, 'white');
        } else {
            // Regular move
            addMoveToHistory(moveUCI, 'white');
        }
        
        updateBoard();
        updateStatus();
        
        // If the computer made a move in response, add it to the history
        if (gameState.turn === playerColor && !gameState.is_game_over) {
            // Try to determine the computer's move by comparing board states
            // This is a simplified approach - in a real implementation, the server should return the last move
            const computerMove = detectComputerMove(previousPieces, gameState.pieces);
            if (computerMove) {
                addMoveToHistory(computerMove, 'black');
            }
        }
        
        if (gameState.turn !== playerColor && !gameState.is_game_over) {
            setStatus('Computer is thinking...');
        }
    } catch (error) {
        console.error('Error making move:', error);
        setStatus(`Error: ${error.message}`);
    } finally {
        isComputerThinking = false;
    }
}

// Verify that a move was actually made
function verifyMoveMade(from, to, pieces) {
    // Map UI coordinates to server coordinates
    const fromFile = from.charAt(0);
    const fromRank = from.charAt(1);
    const toFile = to.charAt(0);
    const toRank = to.charAt(1);
    
    // Map the rank from UI to server (e.g., d7 -> d2)
    const fromCoord = fromFile + (9 - parseInt(fromRank));
    const toCoord = toFile + (9 - parseInt(toRank));
    
    // Special case for castling
    if (fromCoord === 'e1' && (toCoord === 'g1' || toCoord === 'c1')) {
        // King-side or Queen-side castling for white
        return pieces[to] && pieces[to].type === 'k' && pieces[to].color === 'white';
    }
    
    if (fromCoord === 'e8' && (toCoord === 'g8' || toCoord === 'c8')) {
        // King-side or Queen-side castling for black
        return pieces[to] && pieces[to].type === 'K' && pieces[to].color === 'black';
    }
    
    // Check if there's a piece at the destination square
    if (!pieces[to]) {
        // Special case for en passant (pawn capture)
        if (pieces[from] && (pieces[from].type === 'p' || pieces[from].type === 'P')) {
            // For en passant, the destination square might be empty in some implementations
            // We'll consider the move successful if the source square is now empty
            return !pieces[from];
        }
        return false;
    }
    
    // Check if the piece at the destination is the same color as the player
    if (pieces[to].color !== playerColor) {
        console.log("Color mismatch:", pieces[to].color, playerColor);
        return true; // Temporarily allow any color to move for debugging
    }
    
    // Check if the source square is now empty (unless it was a capture)
    if (pieces[from] && pieces[from].color === playerColor) {
        return false;
    }
    
    return true;
}

// Detect the computer's move by comparing board states
function detectComputerMove(previousPiecesJson, currentPieces) {
    if (!previousPiecesJson) return null;
    
    try {
        const previousPieces = JSON.parse(previousPiecesJson);
        
        // Special case for castling
        // King-side castling (e8-g8)
        if (previousPieces['e8'] && previousPieces['e8'].type === 'K' &&
            previousPieces['h8'] && previousPieces['h8'].type === 'R' &&
            currentPieces['g8'] && currentPieces['g8'].type === 'K' &&
            currentPieces['f8'] && currentPieces['f8'].type === 'R') {
            // Map to UI coordinates
            return 'e8g8'; // King-side castling
        }
        
        // Queen-side castling (e8-c8)
        if (previousPieces['e8'] && previousPieces['e8'].type === 'K' &&
            previousPieces['a8'] && previousPieces['a8'].type === 'R' &&
            currentPieces['c8'] && currentPieces['c8'].type === 'K' &&
            currentPieces['d8'] && currentPieces['d8'].type === 'R') {
            // Map to UI coordinates
            return 'e8c8'; // Queen-side castling
        }
        
        // Find a piece that moved (disappeared from its original position)
        let fromSquare = null;
        let possibleFromSquares = [];
        
        // Find squares where pieces disappeared (potential 'from' squares)
        for (const square in previousPieces) {
            const prevPiece = previousPieces[square];
            // Computer is black
            if (prevPiece.color === 'black' &&
                (!currentPieces[square] ||
                 currentPieces[square].color !== 'black' ||
                 currentPieces[square].type !== prevPiece.type)) {
                possibleFromSquares.push(square);
            }
        }
        
        // Find squares where black pieces appeared (potential 'to' squares)
        for (const square in currentPieces) {
            const currentPiece = currentPieces[square];
            // Computer is black
            if (currentPiece.color === 'black' &&
                (!previousPieces[square] ||
                 previousPieces[square].color !== 'black' ||
                 previousPieces[square].type !== currentPiece.type)) {
                
                // This is likely the destination square
                // Find the most likely source square (same piece type)
                for (const fromCandidate of possibleFromSquares) {
                    if (previousPieces[fromCandidate].type === currentPiece.type) {
                        return fromCandidate + square;
                    }
                }
                
                // If no exact match found, just use the first possible square
                if (possibleFromSquares.length > 0) {
                    return possibleFromSquares[0] + square;
                }
            }
        }
        
        // Special case for en passant (pawn capture where the captured pawn disappears)
        // This is a simplified detection - might need refinement based on actual implementation
        if (possibleFromSquares.length === 1 &&
            previousPieces[possibleFromSquares[0]].type === 'P') {
            // A black pawn disappeared, but we don't see where it went
            // Look for empty squares diagonally forward from the pawn's position
            const file = possibleFromSquares[0].charAt(0);
            const rank = parseInt(possibleFromSquares[0].charAt(1));
            
            // Check diagonally forward squares
            const possibleCaptures = [
                String.fromCharCode(file.charCodeAt(0) - 1) + (rank - 1),
                String.fromCharCode(file.charCodeAt(0) + 1) + (rank - 1)
            ];
            
            for (const captureSquare of possibleCaptures) {
                if (captureSquare.match(/^[a-h][1-8]$/) && !currentPieces[captureSquare]) {
                    return possibleFromSquares[0] + captureSquare;
                }
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error detecting computer move:', error);
        return null;
    }
}

// Add a move to the move history
function addMoveToHistory(move, color) {
    const moveNumber = Math.floor(moveHistory.length / 2) + 1;
    const isWhiteMove = color === 'white';
    
    // Check if this move is already in the history to avoid duplicates
    if (isWhiteMove) {
        const lastMove = moveHistory[moveHistory.length - 1];
        if (lastMove && lastMove.white === move) {
            console.log("Duplicate white move, skipping:", move);
            return;
        }
    } else {
        const lastMove = moveHistory[moveHistory.length - 1];
        if (lastMove && lastMove.black === move) {
            console.log("Duplicate black move, skipping:", move);
            return;
        }
    }
    
    // Create a new move entry
    const moveEntry = document.createElement('div');
    moveEntry.className = 'move-entry';
    
    if (isWhiteMove) {
        moveEntry.textContent = `${moveNumber}. White: ${move}`;
        moveHistory.push({ number: moveNumber, white: move });
    } else {
        // Find the last move entry or create a new one
        const lastMove = moveHistory[moveHistory.length - 1];
        if (lastMove && lastMove.number === moveNumber && !lastMove.black) {
            lastMove.black = move;
            moveEntry.textContent = `${moveNumber}. White: ${lastMove.white} Black: ${move}`;
        } else {
            moveEntry.textContent = `${moveNumber}... Black: ${move}`;
            moveHistory.push({ number: moveNumber, black: move });
        }
    }
    
    // Add the move entry to the move history element
    moveHistoryElement.appendChild(moveEntry);
    
    // Scroll to the bottom of the move history
    moveHistoryElement.scrollTop = moveHistoryElement.scrollHeight;
}

// Reset the game
async function resetGame() {
    try {
        setStatus('Resetting game...');
        
        const response = await fetch(`${API_URL}/reset`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Failed to reset game');
        }
        
        gameState = await response.json();
        updateBoard();
        updateStatus();
        
        // Clear the move history
        clearMoveHistory();
        
        setStatus('Game reset. White to move.');
    } catch (error) {
        console.error('Error resetting game:', error);
        setStatus(`Error: ${error.message}`);
    }
}

// Clear the move history
function clearMoveHistory() {
    moveHistory = [];
    if (moveHistoryElement) {
        moveHistoryElement.innerHTML = '';
    }
}

// Skill level descriptions mapping
function getSkillDescription(level) {
    const descriptions = {
        1: "Complete Beginner",
        2: "Novice",
        3: "Learning",
        4: "Improving",
        5: "Intermediate",
        6: "Club Player",
        7: "Strong Player",
        8: "Advanced",
        9: "Expert",
        10: "Master"
    };
    return descriptions[level] || "Intermediate";
}

// Fetch current skill level from server
async function fetchSkillLevel() {
    try {
        const response = await fetch(`${API_URL}/skill-level`);
        if (response.ok) {
            const data = await response.json();
            updateSkillDisplay(data.skill_level, data.description);
        }
    } catch (error) {
        console.error('Error fetching skill level:', error);
    }
}

// Handle skill slider change
async function handleSkillChange(event) {
    const level = parseInt(event.target.value);
    const description = getSkillDescription(level);

    // Update UI immediately for responsive feel
    updateSkillDisplay(level, description);

    // Send to server
    try {
        const response = await fetch(`${API_URL}/skill-level`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ skill_level: level })
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`Skill level set to ${data.skill_level}: ${data.description}`);
            setStatus(`Computer skill level: ${data.description} (${data.skill_level})`);
        } else {
            console.error('Failed to set skill level');
            setStatus('Error setting skill level');
        }
    } catch (error) {
        console.error('Error setting skill level:', error);
        setStatus('Error setting skill level');
    }
}

// Update skill display elements
function updateSkillDisplay(level, description) {
    if (skillSlider) skillSlider.value = level;
    if (skillValue) skillValue.textContent = level;
    if (skillLabel) skillLabel.textContent = description;
}

// Initialize the board when the page loads
window.addEventListener('DOMContentLoaded', initializeBoard);

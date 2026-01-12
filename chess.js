const chessboard = document.getElementById('chessboard');
const API_URL = ''; // Use relative URL since frontend and backend are served from same domain
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

// Map piece types to readable names
const pieceNames = {
    'k': 'King',
    'q': 'Queen',
    'r': 'Rook',
    'b': 'Bishop',
    'n': 'Knight',
    'p': 'Pawn',
    'K': 'King',
    'Q': 'Queen',
    'R': 'Rook',
    'B': 'Bishop',
    'N': 'Knight',
    'P': 'Pawn'
};

let selectedSquare = null;
let gameState = null;
let playerColor = 'white'; // Player is white, but board is displayed flipped (white at top, black at bottom)
let isComputerThinking = false;
let statusElement = null;
let moveHistoryElement = null;
let resetButton = null;
let moveHistory = [];
let skillSlider = null;
let skillLabel = null;
let skillValue = null;
let lastMoveSquares = [];
let loadingOverlay = null;
let boardWrapper = null;
let capturedPieces = { white: [], black: [] };

// Hint system variables
let hintButton = null;
let learningModeToggle = null;
let hintLevelSelect = null;
let hintDisplay = null;
let currentHint = null;
let learningModeEnabled = false;

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

    // Initialize hint system
    hintButton = document.getElementById('hint-button');
    learningModeToggle = document.getElementById('learning-mode-toggle');
    hintLevelSelect = document.getElementById('hint-level-select');
    hintDisplay = document.getElementById('hint-display');

    if (hintButton) {
        hintButton.addEventListener('click', requestHint);
    }

    if (learningModeToggle) {
        learningModeToggle.addEventListener('change', handleLearningModeToggle);
    }

    if (hintLevelSelect) {
        hintLevelSelect.addEventListener('change', handleHintLevelChange);
    }

    // Fetch initial learning mode settings
    fetchLearningModeSettings();

    // Initialize board wrapper for coordinate labels
    boardWrapper = document.getElementById('board-wrapper');

    // Create the squares
    // Note: We create the board from top to bottom (rank 8 to 1) - flipped for user view
    // Create the chess board with flipped coordinates (white at top, black at bottom)
    for (let rankIndex = 0; rankIndex < BOARD_SIZE; rankIndex++) {
        for (let fileIndex = 0; fileIndex < BOARD_SIZE; fileIndex++) {
            const square = document.createElement('div');
            square.classList.add('square');
            // Alternate colors for the chess board pattern
            square.classList.add((rankIndex + fileIndex) % 2 === 0 ? 'white' : 'black');

            // Get the square name (e.g., "a1", "e4") - flipped for white at top
            const squareName = FILES[fileIndex] + RANKS[rankIndex];
            square.dataset.position = squareName;
            square.addEventListener('click', () => handleSquareClick(square));

            chessboard.appendChild(square);
        }
    }

    // Add coordinate labels
    addCoordinateLabels();

    // Get initial board state
    fetchBoardState();
}

// Add coordinate labels to the board
function addCoordinateLabels() {
    if (!boardWrapper) return;

    // Add file labels (a-h) at the top (for flipped board)
    FILES.forEach((file, index) => {
        const label = document.createElement('div');
        label.className = 'coordinate-label file-label';
        label.textContent = file;
        label.style.top = '10px';
        boardWrapper.appendChild(label);
    });

    // Add rank labels (1-8) on the left (for flipped board)
    RANKS.forEach((rank, index) => {
        const label = document.createElement('div');
        label.className = 'coordinate-label rank-label';
        label.textContent = rank;
        label.style.top = `${(index * 60) + 30}px`;
        boardWrapper.appendChild(label);
    });
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
function updateBoard(previousPieces = null) {
    // Clear hints when board updates
    clearHintsOnBoardUpdate();
    
    // Detect captured pieces if we have previous state
    if (previousPieces && gameState && gameState.pieces) {
        detectCapturedPieces(previousPieces, gameState.pieces);
    }

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

    // Clear any highlights and last move highlighting
    document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
    document.querySelectorAll('.last-move').forEach(el => el.classList.remove('last-move'));

    // Highlight last move squares
    lastMoveSquares.forEach(squareName => {
        const squareElement = document.querySelector(`.square[data-position="${squareName}"]`);
        if (squareElement) {
            squareElement.classList.add('last-move');
        }
    });

    selectedSquare = null;
}

// Detect captured pieces by comparing board states
function detectCapturedPieces(previousPieces, currentPieces) {
    // Find pieces that existed before but don't exist now
    for (const square in previousPieces) {
        const prevPiece = previousPieces[square];

        // Check if piece is missing or replaced by opposite color
        if (!currentPieces[square] || currentPieces[square].color !== prevPiece.color) {
            // This piece was captured
            const capturingColor = prevPiece.color === 'white' ? 'black' : 'white';

            // Don't add if already in captured list
            const pieceSymbol = pieceSymbols[prevPiece.type];
            if (!capturedPieces[capturingColor].includes(pieceSymbol)) {
                capturedPieces[capturingColor].push(pieceSymbol);
                updateCapturedDisplay();
            }
        }
    }
}

// Update the captured pieces display
function updateCapturedDisplay() {
    // Update white's captures (black pieces)
    const whiteCapturedList = document.querySelector('#white-captured .captured-list');
    if (whiteCapturedList) {
        whiteCapturedList.innerHTML = '';
        capturedPieces.black.forEach(piece => {
            const pieceSpan = document.createElement('span');
            pieceSpan.className = 'captured-piece';
            pieceSpan.textContent = piece;
            whiteCapturedList.appendChild(pieceSpan);
        });
    }

    // Update black's captures (white pieces)
    const blackCapturedList = document.querySelector('#black-captured .captured-list');
    if (blackCapturedList) {
        blackCapturedList.innerHTML = '';
        capturedPieces.white.forEach(piece => {
            const pieceSpan = document.createElement('span');
            pieceSpan.className = 'captured-piece';
            pieceSpan.textContent = piece;
            blackCapturedList.appendChild(pieceSpan);
        });
    }
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
        showGameOverOverlay(`${gameState.turn === 'white' ? 'Black' : 'White'} wins!`, 'Checkmate');
    } else if (gameState.is_stalemate) {
        statusText = 'STALEMATE! Game is drawn.';
        showGameOverOverlay('Draw!', 'Stalemate');
    } else if (gameState.is_game_over) {
        statusText = 'Game over!';
        showGameOverOverlay('Game Over', '');
    }

    setStatus(statusText);
}

// Set the status message
function setStatus(message) {
    if (statusElement) {
        statusElement.textContent = message;
    }
}

// Show loading spinner
function showLoadingSpinner() {
    if (!boardWrapper) return;

    // Remove existing overlay if present
    hideLoadingSpinner();

    loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';

    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';

    loadingOverlay.appendChild(spinner);
    boardWrapper.appendChild(loadingOverlay);
}

// Hide loading spinner
function hideLoadingSpinner() {
    if (loadingOverlay && loadingOverlay.parentNode) {
        loadingOverlay.parentNode.removeChild(loadingOverlay);
        loadingOverlay = null;
    }
}

// Show game over overlay
function showGameOverOverlay(title, message) {
    if (!boardWrapper) return;

    const overlay = document.createElement('div');
    overlay.className = 'game-over-overlay';

    const content = document.createElement('div');
    content.className = 'game-over-content';

    const titleElement = document.createElement('div');
    titleElement.className = 'game-over-title';
    titleElement.textContent = title;

    const messageElement = document.createElement('div');
    messageElement.className = 'game-over-message';
    messageElement.textContent = message;

    const button = document.createElement('button');
    button.className = 'game-over-button';
    button.textContent = 'New Game';
    button.onclick = () => {
        overlay.remove();
        resetGame();
    };

    content.appendChild(titleElement);
    if (message) content.appendChild(messageElement);
    content.appendChild(button);
    overlay.appendChild(content);
    boardWrapper.appendChild(overlay);
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
    // The UI has white pieces at the top (a8-h8), but server expects standard (a1-h1)
    const fromFile = from.charAt(0);
    const fromRank = from.charAt(1);
    const toFile = to.charAt(0);
    const toRank = to.charAt(1);

    // Map the rank from UI to server (e.g., d7 -> d2) - flipped mapping
    const fromCoord = fromFile + (9 - parseInt(fromRank));
    const toCoord = toFile + (9 - parseInt(toRank));

    const moveUCI = fromCoord + toCoord;

    try {
        isComputerThinking = true;
        setStatus('Making move...');
        showLoadingSpinner();

        // Track last move for highlighting
        lastMoveSquares = [from, to];

        // Store the current board state to detect the computer's move later
        const previousPiecesJson = gameState ? JSON.stringify(gameState.pieces) : null;
        const previousPieces = gameState ? { ...gameState.pieces } : {};

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
            addMoveToHistory(moveUCI + promotionPiece, 'white', previousPieces);
        } else {
            // Regular move
            addMoveToHistory(moveUCI, 'white', previousPieces);
        }

        updateBoard(previousPieces);
        updateStatus();

        // If the computer made a move in response, add it to the history and track it
        if (gameState.turn === playerColor && !gameState.is_game_over) {
            // Try to determine the computer's move by comparing board states
            // This is a simplified approach - in a real implementation, the server should return the last move
            const computerMove = detectComputerMove(previousPiecesJson, gameState.pieces);
            if (computerMove) {
                // Store pieces before computer move for formatting
                const beforeComputerMove = JSON.parse(previousPiecesJson);

                addMoveToHistory(computerMove, 'black', beforeComputerMove);

                // Update last move squares for highlighting
                const fromSquare = computerMove.substring(0, 2);
                const toSquare = computerMove.substring(2, 4);
                lastMoveSquares = [fromSquare, toSquare];

                // Add flash animation to AI move squares
                animateAIMove(fromSquare, toSquare);

                updateBoard(beforeComputerMove);
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
        hideLoadingSpinner();
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

// Get piece information from a square
function getPieceInfo(square) {
    if (!gameState || !gameState.pieces || !gameState.pieces[square]) {
        return null;
    }
    return gameState.pieces[square];
}

// Animate AI move with flash effect
function animateAIMove(fromSquare, toSquare) {
    const fromElement = document.querySelector(`.square[data-position="${fromSquare}"]`);
    const toElement = document.querySelector(`.square[data-position="${toSquare}"]`);

    if (fromElement) {
        fromElement.classList.add('ai-move-flash');
        setTimeout(() => fromElement.classList.remove('ai-move-flash'), 5000);
    }

    if (toElement) {
        toElement.classList.add('ai-move-flash');
        setTimeout(() => toElement.classList.remove('ai-move-flash'), 5000);
    }
}

// Format move with piece name for display
function formatMoveWithPieceName(move, previousPieces = null) {
    const fromSquare = move.substring(0, 2);
    const toSquare = move.substring(2, 4);
    const promotion = move.length > 4 ? move.substring(4) : '';

    // Try to get piece info from previous board state if available
    let pieceType = null;
    if (previousPieces) {
        const prevPieceInfo = previousPieces[fromSquare];
        if (prevPieceInfo) {
            pieceType = prevPieceInfo.type;
        }
    }

    // If not found in previous state, check current state
    if (!pieceType) {
        const pieceInfo = getPieceInfo(toSquare);
        pieceType = pieceInfo ? pieceInfo.type : null;
    }

    const pieceName = pieceType ? pieceNames[pieceType] : 'Piece';
    const pieceSymbol = pieceType ? pieceSymbols[pieceType] : '';

    // Check for special moves
    if (pieceName === 'King' && Math.abs(fromSquare.charCodeAt(0) - toSquare.charCodeAt(0)) > 1) {
        // Castling
        return toSquare.charCodeAt(0) > fromSquare.charCodeAt(0)
            ? `${pieceSymbol} Castled King-side`
            : `${pieceSymbol} Castled Queen-side`;
    }

    // Regular move
    let moveText = `${pieceSymbol} ${pieceName} ${fromSquare} → ${toSquare}`;

    if (promotion) {
        const promotionName = pieceNames[promotion] || promotion;
        moveText += ` (promoted to ${promotionName})`;
    }

    return moveText;
}

// Add a move to the move history
function addMoveToHistory(move, color, previousPieces = null) {
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

    // Format the move with piece name
    const formattedMove = formatMoveWithPieceName(move, previousPieces);

    // Create a new move entry
    const moveEntry = document.createElement('div');
    moveEntry.className = 'move-entry';

    if (isWhiteMove) {
        moveEntry.innerHTML = `<strong>${moveNumber}.</strong> ${formattedMove}`;
        moveHistory.push({ number: moveNumber, white: move });
    } else {
        // Find the last move entry or create a new one
        const lastMove = moveHistory[moveHistory.length - 1];
        if (lastMove && lastMove.number === moveNumber && !lastMove.black) {
            lastMove.black = move;
            const whiteFormatted = formatMoveWithPieceName(lastMove.white, previousPieces);
            moveEntry.innerHTML = `<strong>${moveNumber}.</strong> ${whiteFormatted}<br/><span style="margin-left: 1.5em;">${formattedMove}</span>`;
        } else {
            moveEntry.innerHTML = `<strong>${moveNumber}...</strong> ${formattedMove}`;
            moveHistory.push({ number: moveNumber, black: move });
        }

        // Add special styling for AI moves
        moveEntry.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
        moveEntry.style.borderLeft = '3px solid rgba(102, 126, 234, 0.5)';
        moveEntry.style.paddingLeft = '10px';
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

        // Clear last move tracking
        lastMoveSquares = [];

        // Clear captured pieces
        capturedPieces = { white: [], black: [] };
        updateCapturedDisplay();

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

// Hint system functions
async function requestHint() {
    if (isComputerThinking) {
        setStatus('Cannot get hint while computer is thinking...');
        return;
    }

    if (!gameState || gameState.is_game_over) {
        setStatus('Cannot get hint - game is over');
        return;
    }

    // Disable hint button during request
    if (hintButton) hintButton.disabled = true;
    setStatus('Generating hint...');

    try {
        const hintLevel = hintLevelSelect ? hintLevelSelect.value : 'basic';
        const response = await fetch(`${API_URL}/hint`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ level: hintLevel })
        });

        if (response.ok) {
            const hint = await response.json();
            displayHint(hint);
            setStatus('Hint generated!');
        } else {
            const error = await response.json();
            setStatus(`Error: ${error.error}`);
        }
    } catch (error) {
        console.error('Error requesting hint:', error);
        setStatus('Error generating hint');
    } finally {
        // Re-enable hint button
        if (hintButton) hintButton.disabled = false;
    }
}

function displayHint(hint) {
    currentHint = hint;
    
    if (!hintDisplay) return;

    // Update hint display content
    const hintMoveElement = hintDisplay.querySelector('.hint-move');
    const hintExplanationElement = hintDisplay.querySelector('.hint-explanation');

    if (hintMoveElement) {
        // Convert UCI move to readable notation
        const moveNotation = formatMoveForDisplay(hint.move);
        hintMoveElement.textContent = `Suggested move: ${moveNotation}`;
        
        // Add category class for styling
        hintMoveElement.className = 'hint-move';
        if (hint.category) {
            hintMoveElement.classList.add(`hint-category-${hint.category}`);
        }
    }

    if (hintExplanationElement) {
        hintExplanationElement.textContent = hint.explanation;
    }

    // Show hint display
    hintDisplay.style.display = 'block';

    // Visualize hint on board
    visualizeHintOnBoard(hint);
}

function formatMoveForDisplay(uciMove) {
    if (!uciMove || uciMove.length < 4) return uciMove;
    
    const from = uciMove.substring(0, 2);
    const to = uciMove.substring(2, 4);
    const promotion = uciMove.length > 4 ? uciMove.substring(4) : '';
    
    // Convert to standard algebraic notation (simplified)
    let notation = `${from}-${to}`;
    if (promotion) {
        notation += `=${promotion.toUpperCase()}`;
    }
    
    return notation;
}

function visualizeHintOnBoard(hint) {
    // Clear previous hint visualizations
    clearHintVisualization();

    if (!hint.from_square || !hint.to_square) return;

    // Flip the hint coordinates for user's perspective (white at top, black at bottom)
    const flippedFromSquare = flipCoordinate(hint.from_square);
    const flippedToSquare = flipCoordinate(hint.to_square);

    // Highlight the from square
    const fromSquare = document.querySelector(`[data-position="${flippedFromSquare}"]`);
    if (fromSquare) {
        fromSquare.classList.add('hint-highlight');
    }

    // Highlight the to square
    const toSquare = document.querySelector(`[data-position="${flippedToSquare}"]`);
    if (toSquare) {
        toSquare.classList.add('hint-highlight');
    }

    // Draw arrow from from to to
    drawHintArrow(flippedFromSquare, flippedToSquare);
}

// Helper function to flip coordinates for user perspective
function flipCoordinate(square) {
    if (!square || square.length !== 2) return square;
    
    const file = square.charAt(0);
    const rank = square.charAt(1);
    
    // Flip the rank: 1->8, 2->7, 3->6, 4->5, 5->4, 6->3, 7->2, 8->1
    const flippedRank = 9 - parseInt(rank);
    
    return file + flippedRank;
}

function clearHintVisualization() {
    // Remove hint highlights
    document.querySelectorAll('.hint-highlight').forEach(square => {
        square.classList.remove('hint-highlight');
    });

    // Remove hint arrows
    document.querySelectorAll('.hint-arrow').forEach(arrow => {
        arrow.remove();
    });
}

function drawHintArrow(fromSquare, toSquare) {
    const fromElement = document.querySelector(`[data-position="${fromSquare}"]`);
    const toElement = document.querySelector(`[data-position="${toSquare}"]`);
    
    if (!fromElement || !toElement) return;

    const fromRect = fromElement.getBoundingClientRect();
    const toRect = toElement.getBoundingClientRect();
    const boardRect = chessboard.getBoundingClientRect();

    // Calculate arrow coordinates relative to board
    const fromX = fromRect.left + fromRect.width / 2 - boardRect.left;
    const fromY = fromRect.top + fromRect.height / 2 - boardRect.top;
    const toX = toRect.left + toRect.width / 2 - boardRect.left;
    const toY = toRect.top + toRect.height / 2 - boardRect.top;

    // Calculate arrow length and angle
    const deltaX = toX - fromX;
    const deltaY = toY - fromY;
    const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;

    // Create arrow element
    const arrow = document.createElement('div');
    arrow.className = 'hint-arrow';
    arrow.style.left = `${fromX}px`;
    arrow.style.top = `${fromY}px`;
    arrow.style.width = `${length}px`;
    arrow.style.transform = `rotate(${angle}deg)`;

    chessboard.appendChild(arrow);
}

async function handleLearningModeToggle(event) {
    learningModeEnabled = event.target.checked;
    
    try {
        const hintLevel = hintLevelSelect ? hintLevelSelect.value : 'basic';
        const response = await fetch(`${API_URL}/learning-mode`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                enabled: learningModeEnabled,
                hint_level: hintLevel
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`Learning mode ${data.enabled ? 'enabled' : 'disabled'}`);
            setStatus(`Learning mode ${data.enabled ? 'enabled' : 'disabled'}`);
        } else {
            console.error('Failed to set learning mode');
        }
    } catch (error) {
        console.error('Error setting learning mode:', error);
    }
}

async function handleHintLevelChange(event) {
    const hintLevel = event.target.value;
    
    try {
        const response = await fetch(`${API_URL}/learning-mode`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                enabled: learningModeEnabled,
                hint_level: hintLevel
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`Hint level set to ${data.hint_level}`);
        } else {
            console.error('Failed to set hint level');
        }
    } catch (error) {
        console.error('Error setting hint level:', error);
    }
}

async function fetchLearningModeSettings() {
    try {
        const response = await fetch(`${API_URL}/learning-mode`);
        
        if (response.ok) {
            const data = await response.json();
            learningModeEnabled = data.enabled;
            
            if (learningModeToggle) {
                learningModeToggle.checked = data.enabled;
            }
            
            if (hintLevelSelect) {
                hintLevelSelect.value = data.hint_level;
            }
            
            console.log(`Learning mode: ${data.enabled ? 'enabled' : 'disabled'}, hint level: ${data.hint_level}`);
        }
    } catch (error) {
        console.error('Error fetching learning mode settings:', error);
    }
}

// Clear hint visualization when board is updated
function clearHintsOnBoardUpdate() {
    clearHintVisualization();
    if (hintDisplay && hintDisplay.style.display !== 'none') {
        hintDisplay.style.display = 'none';
    }
}

// Initialize the board when the page loads
window.addEventListener('DOMContentLoaded', initializeBoard);

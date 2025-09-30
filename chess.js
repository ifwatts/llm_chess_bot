const chessboard = document.getElementById('chessboard');
const board = [
    ['a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8'],
    ['a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7'],
    ['a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6'],
    ['a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5'],
    ['a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4'],
    ['a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3'],
    ['a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2'],
    ['a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1']
];

const pieces = {
    white: {
        king: "e1",
        queen: "d1",
        rooks: ["a1", "h1"],
        bishops: ["c1", "f1"],
        knights: ["b1", "g1"],
        pawns: ["a2", "b2", "c2", "d2", "e2", "f2", "g2", "h2"]
    },
    black: {
        king: "e8",
        queen: "d8",
        rooks: ["a8", "h8"],
        bishops: ["c8", "f8"],
        knights: ["b8", "g8"],
        pawns: ["a7", "b7", "c7", "d7", "e7", "f7", "g7", "h7"]
    }
};

const pieceSymbols = {
    king: '♔',
    queen: '♕',
    rooks: '♖',
    bishops: '♗',
    knights: '♘',
    pawns: '♙'
};

const pieceColors = {
    white: 'white',
    black: 'black'
};

let selectedPiece = null;
let selectedSquare = null;

function createSquare(row, col) {
    const square = document.createElement('div');
    square.classList.add('square');
    square.classList.add((row + col) % 2 === 0 ? 'white' : 'black');
    square.dataset.position = board[row][col];
    square.addEventListener('click', () => handleSquareClick(square));
    return square;
}

function placePiece(square, piece, color) {
    const pieceElement = document.createElement('span');
    pieceElement.textContent = pieceSymbols[piece];
    pieceElement.style.color = color;
    square.appendChild(pieceElement);
}

function handleSquareClick(square) {
    if (selectedPiece) {
        if (square === selectedSquare) {
            // Unselect the piece
            selectedSquare.classList.remove('highlight');
            selectedPiece = null;
            selectedSquare = null;
        } else {
            // Move the piece
            movePiece(square);
        }
    } else {
        // Select the piece
        selectPiece(square);
    }
}

function selectPiece(square) {
    const pieceElement = square.querySelector('span');
    if (pieceElement) {
        selectedPiece = pieceElement;
        selectedSquare = square;
        square.classList.add('highlight');
    }
}

function movePiece(square) {
    // Check if the move is valid (basic example, not all rules implemented)
    if (isValidMove(selectedSquare.dataset.position, square.dataset.position)) {
        square.appendChild(selectedPiece);
        selectedSquare.classList.remove('highlight');
        selectedPiece = null;
        selectedSquare = null;
    }
}

function isValidMove(from, to) {
    // Implement basic move validation (this is a simplified example)
    // You can expand this function to include all chess rules
    return true;
}

board.forEach((row, rowIndex) => {
    row.forEach((col, colIndex) => {
        const square = createSquare(rowIndex, colIndex);
        chessboard.appendChild(square);

        Object.keys(pieces).forEach(color => {
            Object.keys(pieces[color]).forEach(piece => {
                if (Array.isArray(pieces[color][piece])) {
                    if (pieces[color][piece].includes(col)) {
                        placePiece(square, piece, pieceColors[color]);
                    }
                } else {
                    if (pieces[color][piece] === col) {
                        placePiece(square, piece, pieceColors[color]);
                    }
                }
            });
        });
    });
});

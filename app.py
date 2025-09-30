from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
from board import ChessBoard
from player import HumanPlayer, ComputerPlayer

app = Flask(__name__, static_folder='.')
CORS(app)  # Enable CORS for all routes

# Initialize game state
chess_board = ChessBoard()
human_player = HumanPlayer('white')
computer_player = ComputerPlayer('black')

def add_pieces_to_state(state):
    """Add piece positions to the state for the frontend"""
    state['pieces'] = {}
    for square in range(64):  # Chess has 64 squares (0-63)
        piece = chess_board.board.piece_at(square)
        if piece:
            # Convert square index to name (e.g., 0 -> 'a1')
            file_idx = square % 8
            rank_idx = 7 - (square // 8)
            square_name = chr(97 + file_idx) + str(rank_idx + 1)
            
            # Map the colors correctly to the frontend's expectations
            # In python-chess, piece.color is True for white, False for black
            state['pieces'][square_name] = {
                'type': piece.symbol().lower(),
                'color': 'white' if piece.color else 'black'  # Correct color mapping
            }
    return state

@app.route('/')
def index():
    """Serve the main HTML page"""
    return send_from_directory('.', 'index.html')

@app.route('/board', methods=['GET'])
def get_board():
    """Get the current board state"""
    state = chess_board.get_board_state()
    state = add_pieces_to_state(state)
    return jsonify(state)

@app.route('/move', methods=['POST'])
def make_move():
    """Make a move on the board"""
    data = request.json
    move = data.get('move')
    test_mode = data.get('test_mode', False)
    
    print(f"Received move: {move}")
    print(f"Current board state: {chess_board.board.fen()}")
    print(f"Current turn: {'white' if chess_board.board.turn else 'black'}")
    print(f"Legal moves: {[m.uci() for m in chess_board.board.legal_moves]}")
    
    # Human player makes a move
    success, state = human_player.make_move(chess_board, move)
    
    if not success:
        print(f"Move {move} failed: {state.get('error', 'Unknown error')}")
        return jsonify(state), 400
    
    print(f"Move {move} successful")
    
    # Check if game is over after human move
    if state.get('is_game_over'):
        state = add_pieces_to_state(state)
        return jsonify(state)
    
    # Only make computer move if not in test mode
    if not test_mode:
        # Computer player makes a move
        success, state = computer_player.make_move(chess_board)
    
    # Add piece positions for the frontend
    state = add_pieces_to_state(state)
    
    return jsonify(state)

@app.route('/reset', methods=['POST'])
def reset_game():
    """Reset the game to the initial state"""
    global chess_board
    # Re-initialize the chess board
    chess_board = ChessBoard()
    # Get the new board state
    state = chess_board.get_board_state()
    # Add piece positions for the frontend
    state = add_pieces_to_state(state)
    return jsonify(state)

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files"""
    return send_from_directory('.', path)

if __name__ == '__main__':
    # Get port from environment variable or use default
    port = int(os.environ.get('PORT', 5000))
    # Use 0.0.0.0 to make the server accessible from outside the container
    app.run(host='0.0.0.0', port=port, debug=True)

# Made with Bob

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
# Default skill level is 5 (intermediate)
computer_player = ComputerPlayer('black', skill_level=5)

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

@app.route('/skill-level', methods=['GET'])
def get_skill_level():
    """Get the current computer player skill level"""
    return jsonify({
        'skill_level': computer_player.skill_level,
        'description': get_skill_description(computer_player.skill_level)
    })

@app.route('/skill-level', methods=['POST'])
def set_skill_level():
    """Set the computer player skill level (1-10)"""
    global computer_player
    data = request.json
    skill_level = data.get('skill_level', 5)

    # Validate skill level
    try:
        skill_level = int(skill_level)
        if skill_level < 1 or skill_level > 10:
            return jsonify({'error': 'Skill level must be between 1 and 10'}), 400
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid skill level format'}), 400

    # Recreate computer player with new skill level
    computer_player = ComputerPlayer('black', skill_level=skill_level)

    print(f"Computer player skill level set to {skill_level}")

    return jsonify({
        'success': True,
        'skill_level': skill_level,
        'description': get_skill_description(skill_level)
    })

@app.route('/hint', methods=['POST'])
def get_hint():
    """Get a hint for the current position"""
    data = request.json
    hint_level = data.get('level', 'basic')  # 'basic', 'intermediate', 'advanced'
    
    # Validate hint level
    valid_levels = ['basic', 'intermediate', 'advanced']
    if hint_level not in valid_levels:
        return jsonify({'error': f'Hint level must be one of: {", ".join(valid_levels)}'}), 400
    
    # Check if it's the human player's turn (White)
    board_state = chess_board.get_board_state()
    if board_state['turn'] != 'white':
        return jsonify({'error': 'Hints are only available on your turn (White to move)'}), 400
    
    # Create a temporary ComputerPlayer for White to generate hints
    temp_hint_player = ComputerPlayer('white', skill_level=10)
    hint = temp_hint_player.get_hint(chess_board, hint_level)
    
    if hint is None:
        return jsonify({'error': 'Unable to generate hint'}), 500
    
    return jsonify(hint)

@app.route('/learning-mode', methods=['GET'])
def get_learning_mode():
    """Get current learning mode settings"""
    return jsonify({
        'enabled': getattr(computer_player, 'learning_mode', False),
        'hint_level': getattr(computer_player, 'hint_level', 'basic')
    })

@app.route('/learning-mode', methods=['POST'])
def set_learning_mode():
    """Set learning mode settings"""
    global computer_player
    data = request.json
    
    enabled = data.get('enabled', False)
    hint_level = data.get('hint_level', 'basic')
    
    # Validate hint level
    valid_levels = ['basic', 'intermediate', 'advanced']
    if hint_level not in valid_levels:
        return jsonify({'error': f'Hint level must be one of: {", ".join(valid_levels)}'}), 400
    
    # Update computer player settings
    computer_player.learning_mode = enabled
    computer_player.hint_level = hint_level
    
    print(f"Learning mode: {'enabled' if enabled else 'disabled'}, hint level: {hint_level}")
    
    return jsonify({
        'success': True,
        'enabled': enabled,
        'hint_level': hint_level
    })

def get_skill_description(skill_level):
    """Get a description for the skill level"""
    descriptions = {
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
    }
    return descriptions.get(skill_level, "Intermediate")

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

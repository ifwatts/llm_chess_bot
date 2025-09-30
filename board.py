import chess
import json

class ChessBoard:
    def __init__(self):
        # Initialize the board with the standard starting position
        self.board = chess.Board()
        # Ensure the board is set up with white at the bottom (a1-h1) and black at the top (a8-h8)
        # This is the standard chess setup
        
    def get_board_state(self):
        """Return the current state of the board as a dictionary"""
        state = {
            'fen': self.board.fen(),
            'turn': 'white' if self.board.turn else 'black',
            'is_check': self.board.is_check(),
            'is_checkmate': self.board.is_checkmate(),
            'is_stalemate': self.board.is_stalemate(),
            'is_game_over': self.board.is_game_over(),
            'legal_moves': [move.uci() for move in self.board.legal_moves]
        }
        return state
    
    def make_move(self, move_uci):
        """Make a move on the board using UCI notation (e.g., 'e2e4')"""
        try:
            print(f"Attempting move: {move_uci}")
            print(f"Current FEN: {self.board.fen()}")
            print(f"Current turn: {'white' if self.board.turn else 'black'}")
            print(f"Legal moves: {[move.uci() for move in self.board.legal_moves]}")
            
            move = chess.Move.from_uci(move_uci)
            if move in self.board.legal_moves:
                self.board.push(move)
                print(f"Move {move_uci} successful")
                return True, self.get_board_state()
            else:
                print(f"Move {move_uci} is illegal")
                print(f"From square: {move_uci[:2]}, To square: {move_uci[2:4]}")
                from_square = chess.parse_square(move_uci[:2])
                to_square = chess.parse_square(move_uci[2:4])
                piece = self.board.piece_at(from_square)
                print(f"Piece at from square: {piece}")
                print(f"Piece color: {piece.color if piece else 'None'}")
                print(f"Current turn: {self.board.turn}")
                return False, {'error': 'Illegal move'}
        except ValueError as e:
            print(f"Invalid move format: {move_uci}, Error: {str(e)}")
            return False, {'error': 'Invalid move format'}
    
    def get_piece_at(self, square_name):
        """Get the piece at the given square (e.g., 'e4')"""
        try:
            square = chess.parse_square(square_name)
            piece = self.board.piece_at(square)
            if piece:
                return {
                    'piece': piece.symbol(),
                    'color': 'white' if piece.color else 'black'
                }
            else:
                return None
        except ValueError:
            return None
    
    def to_json(self):
        """Convert the board state to JSON"""
        state = self.get_board_state()
        # Add piece positions for the frontend
        state['pieces'] = {}
        for square in chess.SQUARES:
            piece = self.board.piece_at(square)
            if piece:
                square_name = chess.square_name(square)
                state['pieces'][square_name] = {
                    'type': piece.symbol().lower(),
                    'color': 'white' if piece.color else 'black'
                }
        return json.dumps(state)

# Made with Bob

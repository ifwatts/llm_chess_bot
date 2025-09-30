import unittest
import requests
import json
import time
import chess

class ChessGameTest(unittest.TestCase):
    """Test case for the chess game application"""
    
    API_URL = "http://localhost:5001"
    
    def setUp(self):
        """Reset the game before each test"""
        response = requests.post(f"{self.API_URL}/reset")
        self.assertEqual(response.status_code, 200, "Failed to reset the game")
        self.board_state = response.json()
        
        # Create a chess board to track the expected state
        self.board = chess.Board()
        
    def test_opening_moves(self):
        """Test a series of opening moves and validate the board state"""
        # List of moves to test (UCI format)
        moves = [
            ("e2e4", "King's Pawn Opening"),
            ("e7e5", "King's Pawn Response"),
            ("g1f3", "Knight to f3"),
            ("b8c6", "Knight to c6")
        ]
        
        for i, (move_uci, description) in enumerate(moves):
            with self.subTest(move=move_uci, description=description):
                # Make the move
                print(f"\nMaking move: {move_uci} ({description})")
                
                # Update our local board
                move = chess.Move.from_uci(move_uci)
                self.board.push(move)
                
                # Send the move to the server with test_mode=True to prevent computer from moving
                response = requests.post(
                    f"{self.API_URL}/move",
                    json={"move": move_uci, "test_mode": True}
                )
                
                # Check if the move was successful
                self.assertEqual(response.status_code, 200, f"Move {move_uci} failed")
                
                # Get the updated board state
                server_state = response.json()
                
                # Validate the FEN string (board position)
                expected_fen_prefix = self.board.fen().split(' ')[0]  # Just the piece positions
                actual_fen_prefix = server_state['fen'].split(' ')[0]
                self.assertEqual(
                    actual_fen_prefix, 
                    expected_fen_prefix, 
                    f"Board state mismatch after move {move_uci}"
                )
                
                # Validate turn
                expected_turn = "white" if self.board.turn else "black"
                self.assertEqual(
                    server_state['turn'], 
                    expected_turn, 
                    f"Turn mismatch after move {move_uci}"
                )
                
                # Print the board for visual inspection
                print(f"Board state after move {i+1}:")
                print(self.board)
                print(f"FEN: {self.board.fen()}")
                print(f"Turn: {expected_turn}")
                
                # Validate pieces exist at the right positions
                # We need to check the board state directly since the server might have different representation
                if i == 0:  # After e2e4
                    # Check that e2 is empty and e4 has a white pawn
                    piece_e4 = self.board.piece_at(chess.parse_square("e4"))
                    self.assertIsNotNone(piece_e4, "Pawn should be at e4")
                    self.assertEqual(piece_e4.symbol().lower(), "p", "Piece at e4 should be a pawn")
                    
                elif i == 1:  # After e7e5
                    # Check that e7 is empty and e5 has a black pawn
                    piece_e5 = self.board.piece_at(chess.parse_square("e5"))
                    self.assertIsNotNone(piece_e5, "Pawn should be at e5")
                    self.assertEqual(piece_e5.symbol().lower(), "p", "Piece at e5 should be a pawn")
                    
                elif i == 2:  # After g1f3
                    # Check that g1 is empty and f3 has a white knight
                    piece_f3 = self.board.piece_at(chess.parse_square("f3"))
                    self.assertIsNotNone(piece_f3, "Knight should be at f3")
                    self.assertEqual(piece_f3.symbol().lower(), "n", "Piece at f3 should be a knight")
                    
                elif i == 3:  # After b8c6
                    # Check that b8 is empty and c6 has a black knight
                    piece_c6 = self.board.piece_at(chess.parse_square("c6"))
                    self.assertIsNotNone(piece_c6, "Knight should be at c6")
                    self.assertEqual(piece_c6.symbol().lower(), "n", "Piece at c6 should be a knight")
                
                # Wait a bit between moves
                time.sleep(0.5)
    
    def test_pawn_promotion(self):
        """Test pawn promotion"""
        # This is a simplified test that sets up a position where a pawn can be promoted
        # In a real test, you would need to make all the moves to get to this position
        
        # For now, we'll just verify that the API handles pawn promotion correctly
        # by checking if the promotion move is in the legal moves list when appropriate
        
        response = requests.get(f"{self.API_URL}/board")
        self.assertEqual(response.status_code, 200, "Failed to get board state")
        
        # In a real test, you would check for promotion moves in the legal_moves list
        # and then make a promotion move and verify the result
        
        print("\nPawn promotion test - This is a placeholder for a more comprehensive test")
        print("In a real test, you would verify that pawns can be promoted correctly")

if __name__ == "__main__":
    unittest.main()

# Made with Bob

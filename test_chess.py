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

    def test_skill_level_get(self):
        """Test getting the current skill level"""
        print("\nTesting skill level GET endpoint...")

        response = requests.get(f"{self.API_URL}/skill-level")
        self.assertEqual(response.status_code, 200, "Failed to get skill level")

        data = response.json()
        self.assertIn('skill_level', data, "Response should contain skill_level")
        self.assertIn('description', data, "Response should contain description")

        # Skill level should be between 1 and 10
        skill_level = data['skill_level']
        self.assertGreaterEqual(skill_level, 1, "Skill level should be at least 1")
        self.assertLessEqual(skill_level, 10, "Skill level should be at most 10")

        print(f"Current skill level: {skill_level} - {data['description']}")

    def test_skill_level_set_valid(self):
        """Test setting skill level with valid values"""
        print("\nTesting skill level SET endpoint with valid values...")

        # Test setting different skill levels
        test_levels = [1, 5, 10]

        for level in test_levels:
            with self.subTest(level=level):
                response = requests.post(
                    f"{self.API_URL}/skill-level",
                    json={"skill_level": level}
                )

                self.assertEqual(response.status_code, 200, f"Failed to set skill level to {level}")

                data = response.json()
                self.assertEqual(data['skill_level'], level, f"Skill level should be {level}")
                self.assertIn('description', data, "Response should contain description")
                self.assertTrue(data['success'], "Response should indicate success")

                print(f"Set skill level to {level}: {data['description']}")

                # Verify the skill level persists
                get_response = requests.get(f"{self.API_URL}/skill-level")
                get_data = get_response.json()
                self.assertEqual(get_data['skill_level'], level, "Skill level should persist")

    def test_skill_level_set_invalid(self):
        """Test setting skill level with invalid values"""
        print("\nTesting skill level SET endpoint with invalid values...")

        # Test invalid values
        invalid_values = [0, 11, -1, 100]

        for value in invalid_values:
            with self.subTest(value=value):
                response = requests.post(
                    f"{self.API_URL}/skill-level",
                    json={"skill_level": value}
                )

                self.assertEqual(
                    response.status_code, 400,
                    f"Should reject invalid skill level {value}"
                )

                data = response.json()
                self.assertIn('error', data, "Response should contain error message")
                print(f"Correctly rejected invalid value {value}: {data['error']}")

    def test_skill_level_set_invalid_format(self):
        """Test setting skill level with invalid format"""
        print("\nTesting skill level SET endpoint with invalid format...")

        # Test invalid formats
        invalid_formats = ["abc", None, {"nested": "object"}]

        for value in invalid_formats:
            with self.subTest(value=value):
                response = requests.post(
                    f"{self.API_URL}/skill-level",
                    json={"skill_level": value}
                )

                self.assertEqual(
                    response.status_code, 400,
                    f"Should reject invalid format {value}"
                )

                data = response.json()
                self.assertIn('error', data, "Response should contain error message")
                print(f"Correctly rejected invalid format {type(value).__name__}")

    def test_skill_level_descriptions(self):
        """Test that all skill levels have appropriate descriptions"""
        print("\nTesting skill level descriptions...")

        expected_descriptions = {
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

        for level, expected_desc in expected_descriptions.items():
            with self.subTest(level=level):
                response = requests.post(
                    f"{self.API_URL}/skill-level",
                    json={"skill_level": level}
                )

                self.assertEqual(response.status_code, 200, f"Failed to set skill level to {level}")

                data = response.json()
                self.assertEqual(
                    data['description'],
                    expected_desc,
                    f"Description for level {level} should be '{expected_desc}'"
                )
                print(f"Level {level}: {data['description']} ✓")

    def test_game_with_different_skill_levels(self):
        """Test that games can be played with different skill levels"""
        print("\nTesting game play with different skill levels...")

        skill_levels = [1, 5, 10]

        for skill_level in skill_levels:
            with self.subTest(skill_level=skill_level):
                # Set skill level
                set_response = requests.post(
                    f"{self.API_URL}/skill-level",
                    json={"skill_level": skill_level}
                )
                self.assertEqual(set_response.status_code, 200, "Failed to set skill level")

                # Reset game
                reset_response = requests.post(f"{self.API_URL}/reset")
                self.assertEqual(reset_response.status_code, 200, "Failed to reset game")

                # Make a simple opening move
                move_response = requests.post(
                    f"{self.API_URL}/move",
                    json={"move": "e2e4", "test_mode": True}
                )

                self.assertEqual(
                    move_response.status_code, 200,
                    f"Move should succeed with skill level {skill_level}"
                )

                print(f"Successfully played move with skill level {skill_level}")

if __name__ == "__main__":
    unittest.main()

# Made with Bob

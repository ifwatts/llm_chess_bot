import requests
import json
import random
import os
from board import ChessBoard

class Player:
    def __init__(self, color):
        self.color = color  # 'white' or 'black'

class HumanPlayer(Player):
    def make_move(self, board, move):
        """Process a move from the human player"""
        return board.make_move(move)

class ComputerPlayer(Player):
    def __init__(self, color, llm_url=None):
        super().__init__(color)
        # Get Ollama host from environment variable or use default
        ollama_host = os.environ.get('OLLAMA_HOST', 'http://localhost:11434')
        self.llm_url = llm_url or f"{ollama_host}/api/generate"
        self.model = "llama2"  # Default model for Ollama
    
    def make_move(self, board):
        """Generate a move using the LLM"""
        # Get the current board state
        board_state = board.get_board_state()
        legal_moves = board_state['legal_moves']
        
        if not legal_moves:
            return False, {"error": "No legal moves available"}
        
        # If there are legal moves, use LLM to choose the best one
        best_move = self._get_llm_move(board, legal_moves)
        
        # Make the move on the board
        return board.make_move(best_move)
    
    def _get_llm_move(self, board, legal_moves):
        """Use a free LLM to determine the best move"""
        try:
            # Prepare the prompt for the LLM
            prompt = self._create_chess_prompt(board, legal_moves)
            
            # Call the LLM API (Ollama)
            response = self._call_ollama_api(prompt)
            
            # Parse the response to get the move
            move = self._parse_llm_response(response, legal_moves)
            
            return move
        except Exception as e:
            print(f"Error using LLM: {str(e)}")
            # Fallback to random move if LLM fails
            return random.choice(legal_moves)
    
    def _create_chess_prompt(self, board, legal_moves):
        """Create a prompt for the LLM to analyze the chess position"""
        board_state = board.get_board_state()
        fen = board_state['fen']
        
        prompt = f"""
        You are a chess engine. Analyze this chess position in FEN notation:
        {fen}
        
        I am playing as {self.color}. The legal moves in UCI notation are:
        {', '.join(legal_moves)}
        
        Choose the best move for {self.color} from the legal moves list.
        Respond with only the UCI notation of the move (e.g., 'e2e4').
        """
        return prompt
    
    def _call_ollama_api(self, prompt):
        """Call the Ollama API to get a response"""
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False
        }
        
        try:
            response = requests.post(self.llm_url, json=payload)
            response.raise_for_status()
            return response.json()['response'].strip()
        except requests.exceptions.RequestException as e:
            print(f"Error calling Ollama API: {str(e)}")
            print("Using fallback random move strategy")
            # Return a placeholder response that will trigger the fallback
            return "FALLBACK_RANDOM_MOVE"
    
    def _parse_llm_response(self, response, legal_moves):
        """Parse the LLM response to extract a valid chess move"""
        # Check for fallback indicator
        if response == "FALLBACK_RANDOM_MOVE":
            print("Using random move as fallback")
            return random.choice(legal_moves)
            
        # Clean up the response
        response = response.strip()
        
        # Check if the response is directly a move in the legal moves list
        if response in legal_moves:
            return response
        
        # Try to find any legal move in the response
        for move in legal_moves:
            if move in response:
                return move
        
        # If no valid move found, return a random legal move
        return random.choice(legal_moves)

# Made with Bob

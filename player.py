import requests
import json
import random
import os
import chess

class Player:
    def __init__(self, color):
        self.color = color  # 'white' or 'black'

class HumanPlayer(Player):
    def make_move(self, board, move):
        """Process a move from the human player"""
        return board.make_move(move)

class ComputerPlayer(Player):
    def __init__(self, color, llm_url=None, skill_level=5):
        super().__init__(color)
        # Get Ollama host from environment variable or use default
        ollama_host = os.environ.get('OLLAMA_HOST', 'http://localhost:11434')
        self.llm_url = llm_url or f"{ollama_host}/api/generate"
        self.model = "llama2"  # Default model for Ollama
        # Skill level: 1-10 (1=beginner, 5=intermediate, 10=master)
        self.skill_level = max(1, min(10, skill_level))  # Clamp between 1-10
    
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
        """Use a free LLM to determine the best move with skill-based selection"""
        try:
            # Filter moves based on skill level (Phase 3)
            filtered_moves = self._filter_moves_by_skill(board, legal_moves)

            # Prepare the prompt for the LLM
            prompt = self._create_chess_prompt(board, filtered_moves)

            # Call the LLM API (Ollama)
            response = self._call_ollama_api(prompt)

            # Parse the response to get the move
            move = self._parse_llm_response(response, filtered_moves)

            # Apply skill-based probabilistic selection
            final_move = self._select_move_by_skill(move, legal_moves)

            return final_move
        except Exception as e:
            print(f"Error using LLM: {str(e)}")
            # Fallback to random move if LLM fails
            return random.choice(legal_moves)
    
    def _create_chess_prompt(self, board, legal_moves):
        """Create a prompt for the LLM to analyze the chess position with skill level tuning"""
        board_state = board.get_board_state()
        fen = board_state['fen']

        # Skill-based instruction mapping
        skill_instructions = {
            1: "You are a complete beginner learning chess. Make simple, straightforward moves without much planning. You sometimes miss obvious threats.",
            2: "You are a novice player. Focus on basic piece development and control of the center. You understand basic principles but make frequent mistakes.",
            3: "You are learning chess strategy. Consider piece safety and basic tactics, but occasionally overlook threats or miss simple combinations.",
            4: "You are an improving player. Think one or two moves ahead and try to develop your pieces harmoniously. You occasionally miss tactical opportunities.",
            5: "You are an intermediate player. Consider basic tactics, piece activity, and pawn structure. Look for simple combinations and tactical threats.",
            6: "You are a club-level player. Look for tactical opportunities like forks, pins, and skewers. Consider both tactics and positional factors.",
            7: "You are a strong club player. Evaluate multiple candidate moves carefully. Consider tactical combinations and strategic plans.",
            8: "You are an advanced player. Analyze tactical and positional factors deeply. Consider piece coordination, king safety, and long-term plans.",
            9: "You are an expert player. Conduct deep analysis with strategic planning. Evaluate multiple lines and consider complex positional factors.",
            10: "You are a chess master. Find the objectively best move by analyzing all tactical and strategic elements with precision."
        }

        skill_instruction = skill_instructions.get(self.skill_level, skill_instructions[5])

        prompt = f"""
        {skill_instruction}

        Analyze this chess position in FEN notation:
        {fen}

        You are playing as {self.color}. The legal moves in UCI notation are:
        {', '.join(legal_moves)}

        Choose a move that matches your skill level from the legal moves list.
        Respond with ONLY the UCI notation of your chosen move (e.g., 'e2e4'). Do not include any explanation.
        """
        return prompt
    
    def _call_ollama_api(self, prompt):
        """Call the Ollama API to get a response with skill-based temperature control"""
        # Map skill level (1-10) to temperature (0.9-0.1)
        # Lower skill = higher temperature (more randomness/mistakes)
        # Higher skill = lower temperature (more deterministic/accurate)
        temperature = max(0.1, 1.0 - (self.skill_level * 0.09))

        # Adjust top_p based on skill level
        # Lower skills have more varied move selection
        top_p = 0.85 if self.skill_level < 5 else 0.95

        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "temperature": temperature,
            "top_p": top_p
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

    def _select_move_by_skill(self, best_move, legal_moves):
        """
        Apply probabilistic move selection based on skill level.
        Lower skill levels have higher chance of making suboptimal moves.

        Skill level mistake probabilities:
        - Level 1-2: 50% chance of random move
        - Level 3-4: 35% chance of random move
        - Level 5-6: 20% chance of random move
        - Level 7-8: 10% chance of random move
        - Level 9: 5% chance of random move
        - Level 10: 0% chance (always best move)
        """
        if self.skill_level >= 10:
            return best_move

        # Calculate mistake probability based on skill level
        # Higher skill = lower mistake chance
        if self.skill_level <= 2:
            mistake_chance = 0.50
        elif self.skill_level <= 4:
            mistake_chance = 0.35
        elif self.skill_level <= 6:
            mistake_chance = 0.20
        elif self.skill_level <= 8:
            mistake_chance = 0.10
        else:  # skill_level == 9
            mistake_chance = 0.05

        # Roll the dice - should we make a mistake?
        if random.random() < mistake_chance:
            print(f"Skill level {self.skill_level}: Making a suboptimal move (mistake chance: {mistake_chance*100}%)")
            return random.choice(legal_moves)

        return best_move

    def _filter_moves_by_skill(self, board, legal_moves):
        """
        Filter legal moves based on skill level before asking LLM.
        Lower skills won't see advanced moves or tactical opportunities.

        Skill level 1-3: Only basic moves (development, captures)
        Skill level 4-6: Add some tactical awareness
        Skill level 7-9: Most moves available, filter obvious blunders
        Skill level 10: All moves available
        """
        if self.skill_level >= 8:
            # Advanced players see all moves
            return legal_moves

        if len(legal_moves) <= 3:
            # If there are very few moves, don't filter
            return legal_moves

        # Score all legal moves
        scored_moves = []
        for move_uci in legal_moves:
            try:
                move = chess.Move.from_uci(move_uci)
                score = self._evaluate_move(board.board, move, self.skill_level)
                scored_moves.append((move_uci, score))
            except Exception as e:
                # If we can't evaluate, give it a neutral score
                scored_moves.append((move_uci, 50))

        # Sort moves by score (descending)
        scored_moves.sort(key=lambda x: x[1], reverse=True)

        # Determine how many moves to keep based on skill level
        if self.skill_level <= 3:
            # Beginners: keep top 30-50% of moves
            keep_percentage = 0.4
        elif self.skill_level <= 6:
            # Intermediate: keep top 60-70% of moves
            keep_percentage = 0.65
        else:
            # Advanced: keep top 80% of moves
            keep_percentage = 0.8

        num_moves_to_keep = max(3, int(len(scored_moves) * keep_percentage))
        filtered = [move for move, score in scored_moves[:num_moves_to_keep]]

        print(f"Skill level {self.skill_level}: Filtered from {len(legal_moves)} to {len(filtered)} moves")
        return filtered

    def _evaluate_move(self, board, move, skill_level):
        """
        Simple heuristic evaluation of a chess move.
        Returns a score (higher is better).
        """
        score = 50  # Base score

        # Piece value mapping
        piece_values = {
            chess.PAWN: 1,
            chess.KNIGHT: 3,
            chess.BISHOP: 3,
            chess.ROOK: 5,
            chess.QUEEN: 9,
            chess.KING: 0
        }

        # Check if this is a capture
        if board.is_capture(move):
            captured_piece = board.piece_at(move.to_square)
            if captured_piece:
                # Reward captures based on piece value
                score += piece_values.get(captured_piece.piece_type, 0) * 10

        # Make the move temporarily to evaluate position
        board.push(move)

        # Check if this move gives check
        if board.is_check():
            score += 15  # Checks are tactically valuable

        # Check if this move leads to checkmate
        if board.is_checkmate():
            score += 1000  # Checkmate is always best

        # Check if we're putting our own pieces in danger (simple hanging piece detection)
        # This is a simplified approach - a real engine would do much more
        attacking_squares = board.attacks(move.to_square)
        piece_at_dest = board.piece_at(move.to_square)
        if piece_at_dest:
            piece_value = piece_values.get(piece_at_dest.piece_type, 0)
            # Count attackers and defenders
            attackers = len(list(board.attackers(not board.turn, move.to_square)))
            if attackers > 0:
                # Piece might be hanging - penalize based on skill
                if skill_level < 5:
                    # Lower skill might not notice hanging pieces
                    score -= piece_value * 5 * random.uniform(0, 1)
                else:
                    score -= piece_value * 5

        # Center control bonus (e4, e5, d4, d5)
        center_squares = [chess.E4, chess.E5, chess.D4, chess.D5]
        if move.to_square in center_squares:
            score += 8

        # Development bonus (moving pieces from back rank)
        from_rank = chess.square_rank(move.from_square)
        if self.color == 'black' and from_rank == 7:
            score += 5  # Developing from back rank
        elif self.color == 'white' and from_rank == 0:
            score += 5

        # Undo the move
        board.pop()

        # Add some randomness for lower skill levels
        if skill_level < 5:
            randomness = random.randint(-20, 20)
            score += randomness
        elif skill_level < 8:
            randomness = random.randint(-10, 10)
            score += randomness

        return score

# Made with Bob

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An interactive chess web application with an AI opponent powered by Ollama's LLM (Llama2 by default). The application uses Flask for the backend, python-chess for game logic, and vanilla JavaScript for the frontend.

## Commands

### Running the Application

**With Podman/Docker:**
```bash
podman-compose up -d
# or
docker-compose up -d
```

**Manual setup:**
```bash
pip install -r requirements.txt
python app.py
```

The app runs on port 5000 by default (configurable via PORT environment variable).

### First-time Setup

After starting containers, pull the LLM model:
```bash
podman exec -it llm_chess_bot-ollama-1 ollama pull llama2
```

### Testing

Tests require the application to be running on port 5001:
```bash
# Run all tests
python run_tests.py

# Run tests directly with unittest
python -m unittest test_chess.py
```

## Architecture

### Core Components

**Three-layer architecture:**

1. **Frontend (chess.js, index.html, style.css)**: Interactive chess board UI with drag-and-drop functionality. Communicates with backend via REST API.

2. **Backend API (app.py)**: Flask server that orchestrates game flow. Key endpoints:
   - `GET /board` - Returns current board state with piece positions
   - `POST /move` - Processes player move, triggers computer move unless `test_mode: true`
   - `POST /reset` - Resets game to initial state
   - `GET /skill-level` - Returns current computer skill level (1-10) and description
   - `POST /skill-level` - Sets computer skill level (1-10)

3. **Game Logic Layer**:
   - `board.py` (ChessBoard): Wraps python-chess library, manages board state and legal moves
   - `player.py` (HumanPlayer, ComputerPlayer): Player abstractions with skill-based AI tuning

### Data Flow

1. User makes move in UI → POST /move with UCI notation (e.g., "e2e4")
2. app.py processes human move via HumanPlayer → ChessBoard.make_move()
3. If valid and game not over, ComputerPlayer generates move via LLM
4. ComputerPlayer._get_llm_move() sends FEN + legal moves to Ollama
5. LLM response parsed to extract valid UCI move (falls back to random if parsing fails)
6. Updated board state returned to frontend with piece positions

### Key Implementation Details

**Color Mapping**: python-chess uses `True` for white, `False` for black. Frontend expects 'white'/'black' strings. Conversion happens in `add_pieces_to_state()` (app.py:28-31).

**Move Format**: UCI notation throughout (e.g., "e2e4", "e7e8q" for promotion). python-chess handles validation.

**Test Mode**: POST /move accepts `test_mode: true` to skip computer response, enabling deterministic testing of board states.

**LLM Integration**: ComputerPlayer calls Ollama API at OLLAMA_HOST (defaults to http://localhost:11434, configurable via environment). Gracefully degrades to random moves on API failure.

**Board State Serialization**: FEN strings represent positions, supplemented with piece dictionaries mapping square names (e.g., "e4") to {type, color} for frontend rendering.

### Containerization

docker-compose.yml defines two services:
- `chess-app`: Flask application (port 5000)
- `ollama`: LLM server (port 11434)

Services communicate via `chess-network` bridge. Ollama data persists in named volume `ollama-data`.

## Skill Tuning System

The application features a sophisticated skill tuning system that allows players to adjust the computer opponent's difficulty from level 1 (beginner) to level 10 (master). This is implemented through three complementary strategies:

### Skill Level Strategy

The skill tuning system uses a multi-layered approach:

1. **Prompt Engineering (player.py:65-76)**: Each skill level receives a unique system prompt that instructs the LLM to play at that skill level. For example:
   - Level 1: "You are a complete beginner learning chess. Make simple, straightforward moves without much planning."
   - Level 5: "You are an intermediate player. Consider basic tactics, piece activity, and pawn structure."
   - Level 10: "You are a chess master. Find the objectively best move by analyzing all tactical and strategic elements."

2. **Temperature Control (player.py:94-111)**: LLM temperature is inversely mapped to skill level:
   - Lower skills (1-3): Higher temperature (0.8-0.91) for more randomness and mistakes
   - Higher skills (8-10): Lower temperature (0.1-0.28) for more deterministic, accurate play
   - Top_p parameter also adjusts based on skill (0.85 for beginners, 0.95 for advanced)

3. **Probabilistic Move Selection (player.py:145-179)**: Even if the LLM suggests a good move, lower skill levels have a chance to make suboptimal moves:
   - Level 1-2: 50% chance of random move
   - Level 3-4: 35% chance of random move
   - Level 5-6: 20% chance of random move
   - Level 7-8: 10% chance of random move
   - Level 9: 5% chance of random move
   - Level 10: Always plays the LLM's suggested move

4. **Move Filtering (player.py:187-234)**: Before presenting moves to the LLM, lower skill levels filter out advanced tactical moves:
   - Level 1-3: Only sees top 40% of moves (based on heuristic evaluation)
   - Level 4-6: Sees top 65% of moves
   - Level 7-9: Sees top 80% of moves
   - Level 8+: Sees all legal moves

### Move Evaluation Heuristics (player.py:236-310)

The move filtering system uses chess heuristics to score moves:
- **Captures**: +10-90 points based on piece value (pawn=1, knight/bishop=3, rook=5, queen=9)
- **Checks**: +15 points for tactical pressure
- **Checkmate**: +1000 points (always best)
- **Center control**: +8 points for occupying e4, e5, d4, d5
- **Development**: +5 points for moving pieces from back rank
- **Hanging pieces**: Penalty for leaving pieces undefended (skill-dependent awareness)
- **Randomness**: Lower skills have ±20 random points added to scores

### UI Integration

The frontend includes an interactive skill slider (index.html:17-29, style.css:50-117, chess.js:531-598):
- Range slider (1-10) with gradient color coding (green → blue → red)
- Real-time skill level display with descriptive labels
- Persists across page refreshes via GET /skill-level
- Can be adjusted mid-game without reset

### Skill Level Descriptions

| Level | Description | Behavior |
|-------|-------------|----------|
| 1 | Complete Beginner | Random moves, no planning, misses obvious threats |
| 2 | Novice | Basic development, frequent mistakes |
| 3 | Learning | Some tactical awareness, occasional blunders |
| 4 | Improving | Thinks 1-2 moves ahead, developing strategy |
| 5 | Intermediate | Basic tactics, considers piece activity |
| 6 | Club Player | Looks for forks, pins, skewers |
| 7 | Strong Player | Multiple candidate moves, tactical combinations |
| 8 | Advanced | Deep tactical and positional analysis |
| 9 | Expert | Strategic planning, complex evaluations |
| 10 | Master | Objectively best moves, maximum strength |

## Configuration

**Change LLM model**: Modify `self.model` in player.py:22 to any Ollama-supported model (see https://ollama.ai/library).

**Change Ollama endpoint**: Set OLLAMA_HOST environment variable (player.py:20).

**Change server port**: Set PORT environment variable (app.py:101).

**Default skill level**: Set in app.py:14 (default is 5 - Intermediate).

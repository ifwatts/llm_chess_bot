# Architecture Documentation

This document provides detailed information about the LLM Chess Bot architecture, design decisions, and implementation details.

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Layers](#architecture-layers)
3. [Component Details](#component-details)
4. [Data Flow](#data-flow)
5. [Skill Tuning System](#skill-tuning-system)
6. [API Specification](#api-specification)
7. [Frontend Implementation](#frontend-implementation)
8. [Containerization](#containerization)
9. [Design Decisions](#design-decisions)

## System Overview

The LLM Chess Bot is a three-tier web application that combines a modern JavaScript frontend, a Python Flask backend, and an AI chess opponent powered by a Large Language Model (LLM).

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Client)                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  index.html + style.css + chess.js (Frontend)          │ │
│  │  - Interactive chess board UI                          │ │
│  │  - Move validation and display                         │ │
│  │  - Game state management                               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ REST API (HTTP/JSON)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Chess App Container (Port 5001)                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  app.py (Flask Server)                                 │ │
│  │  - API endpoints (/board, /move, /reset, /skill-level)│ │
│  │  - Request orchestration                               │ │
│  │  - Static file serving                                 │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  board.py (ChessBoard)                                 │ │
│  │  - python-chess wrapper                                │ │
│  │  - Legal move validation                               │ │
│  │  - Board state management                              │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  player.py (HumanPlayer, ComputerPlayer)              │ │
│  │  - Player abstractions                                 │ │
│  │  - AI skill tuning (10 levels)                        │ │
│  │  - LLM prompt engineering                              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP API (Port 11434)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Ollama Container (Port 11434)                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Ollama Server                                         │ │
│  │  - LLM inference engine                                │ │
│  │  - Model: Llama2 (default)                            │ │
│  │  - Generates chess moves                               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Architecture Layers

### 1. Presentation Layer (Frontend)

**Location**: Browser
**Technologies**: HTML5, CSS3, Vanilla JavaScript
**Responsibilities**:
- Rendering the chess board and pieces
- Handling user interactions (clicks, moves)
- Displaying move history and captured pieces
- Managing UI animations and visual feedback
- Communicating with backend via REST API

**Key Files**:
- `index.html` - DOM structure
- `style.css` - Visual styling and animations
- `chess.js` - Game logic and API communication

### 2. Application Layer (Backend)

**Location**: Chess App Container
**Technologies**: Python 3.11, Flask 2.3.3
**Responsibilities**:
- Serving API endpoints
- Orchestrating game flow
- Managing player turns
- Coordinating with chess engine and AI

**Key Files**:
- `app.py` - Flask server and API routes

### 3. Domain Layer (Game Logic)

**Location**: Chess App Container
**Technologies**: Python 3.11, python-chess 1.999
**Responsibilities**:
- Chess rules enforcement
- Legal move validation
- Board state tracking
- Game state detection (check, checkmate, stalemate)

**Key Files**:
- `board.py` - Chess logic wrapper
- `player.py` - Player behavior implementations

### 4. AI Layer (LLM Integration)

**Location**: Ollama Container
**Technologies**: Ollama, Llama2 LLM
**Responsibilities**:
- Generating chess moves via natural language processing
- Adjusting play strength based on skill level
- Providing move reasoning (optional)

**Key Files**:
- `player.py` - `ComputerPlayer` class with LLM integration

## Component Details

### app.py - Flask Backend Server

**Purpose**: Central orchestration of the chess application

**Key Components**:

```python
# Global state
chess_board = ChessBoard()           # Game board instance
human_player = HumanPlayer(chess_board)
computer_player = ComputerPlayer(chess_board, skill_level=5)
```

**API Endpoints**:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/board` | GET | Returns current board state and legal moves |
| `/move` | POST | Processes a player move, triggers AI response |
| `/reset` | POST | Resets game to initial state |
| `/skill-level` | GET | Returns current AI skill level |
| `/skill-level` | POST | Updates AI skill level (1-10) |
| `/hint` | POST | Generates a hint for current position |
| `/learning-mode` | GET | Returns learning mode settings |
| `/learning-mode` | POST | Updates learning mode settings |

**Request Flow** (app.py:41-80):
1. Receive move from frontend
2. Validate move with `chess_board.make_move()`
3. Check game state (checkmate, stalemate)
4. If game continues, trigger `computer_player.make_move()`
5. Return updated board state

### board.py - Chess Logic Wrapper

**Purpose**: Wraps python-chess library with application-specific interface

**Key Class**: `ChessBoard`

**Methods**:
- `get_state()` - Returns FEN, legal moves, and piece positions
- `make_move(uci_move)` - Validates and executes a move
- `reset()` - Returns board to starting position
- `is_game_over()`, `is_checkmate()`, `is_stalemate()` - Game state checks

**Data Structures** (board.py:28-43):

```python
{
    'fen': 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    'legal_moves': ['e2e4', 'e2e3', 'd2d4', ...],
    'turn': 'white',  # or 'black'
    'is_check': False,
    'is_checkmate': False,
    'is_stalemate': False,
    'is_game_over': False,
    'pieces': {
        'e2': {'type': 'p', 'color': 'white'},
        'e7': {'type': 'P', 'color': 'black'},
        ...
    }
}
```

**Color Mapping** (board.py:76-77):
- python-chess uses `True` (white) and `False` (black)
- Frontend expects `'white'` and `'black'` strings
- Conversion happens in `add_pieces_to_state()`

### player.py - Player Abstractions and AI Logic

**Purpose**: Defines player behavior and implements AI skill tuning

**Class Hierarchy**:

```
Player (Abstract Base)
├── HumanPlayer
└── ComputerPlayer (AI with skill tuning)
```

**HumanPlayer Class** (player.py:9-16):
- Simple wrapper for human moves
- Delegates move validation to ChessBoard

**ComputerPlayer Class** (player.py:18-508):
- Generates AI moves using LLM
- Implements sophisticated skill tuning system
- Handles LLM communication and error recovery
- **NEW**: Generates educational hints with explanations
- **NEW**: Categorizes moves by tactical type
- **NEW**: Provides skill-appropriate learning content

**Key Attributes**:
- `skill_level` (1-10) - Difficulty setting
- `model` - Ollama model name (default: "llama2")
- `ollama_host` - API endpoint (default: "http://localhost:11434")

## Data Flow

### User Move Flow

```
┌─────────────┐
│   User      │
│  clicks     │
│  piece &    │
│ destination │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ chess.js: handleSquareClick()                            │
│ - Validates selection                                     │
│ - Calls makeMove(from, to)                               │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ chess.js: makeMove()                                      │
│ - Converts UI coordinates to UCI notation                │
│ - Shows loading spinner                                  │
│ - POST to /move endpoint                                 │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ app.py: /move endpoint                                    │
│ - Extracts UCI move from request                         │
│ - Calls human_player.make_move(uci)                      │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ board.py: ChessBoard.make_move()                         │
│ - Validates move legality via python-chess               │
│ - Executes move if legal                                 │
│ - Returns success/failure                                │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ app.py: Check game state                                 │
│ - If game over: return state                             │
│ - If game continues: trigger AI move                     │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ player.py: ComputerPlayer.make_move()                    │
│ - Filter legal moves based on skill level                │
│ - Generate skill-appropriate prompt                      │
│ - Call _get_llm_move()                                   │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ player.py: _get_llm_move()                               │
│ - POST to Ollama API with FEN + legal moves              │
│ - Parse LLM response for UCI move                        │
│ - Fallback to random move if parsing fails               │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ player.py: _should_make_random_move()                    │
│ - Based on skill level, randomly make suboptimal move    │
│ - Return either LLM move or random move                  │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ board.py: Execute AI move                                │
│ - Validate and apply AI move to board                    │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ app.py: Return updated state                             │
│ - Serialize board state to JSON                          │
│ - Send response to frontend                              │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ chess.js: Update UI                                       │
│ - Hide loading spinner                                   │
│ - Update board display                                   │
│ - Add moves to history                                   │
│ - Animate AI move (5-second flash)                       │
│ - Update captured pieces                                 │
└───────────────────────────────────────────────────────────┘
```

## Skill Tuning System

The AI skill tuning system uses four complementary strategies to adjust difficulty:

### 1. Prompt Engineering (player.py:65-76)

Each skill level receives a unique system prompt:

**Level 1 (Beginner)**:
```
You are a complete beginner learning chess. Make simple,
straightforward moves without much planning. Often miss
threats and make basic mistakes.
```

**Level 5 (Intermediate)**:
```
You are an intermediate player. Consider basic tactics like
forks, pins, and skewers. Think about piece activity and
pawn structure.
```

**Level 10 (Master)**:
```
You are a chess master. Find the objectively best move by
analyzing all tactical and strategic elements. Calculate deep
variations and positional nuances.
```

### 2. Temperature Control (player.py:94-111)

LLM temperature is inversely proportional to skill:

| Skill Level | Temperature | Top_p | Behavior |
|-------------|-------------|-------|----------|
| 1-3 | 0.80-0.91 | 0.85 | High randomness, frequent errors |
| 4-6 | 0.46-0.73 | 0.90 | Moderate consistency |
| 7-9 | 0.10-0.37 | 0.95 | Low randomness, accurate |
| 10 | 0.10 | 0.95 | Maximum accuracy |

**Formula** (player.py:107):
```python
temperature = max(0.1, 1.0 - (skill_level / 10) * 0.9)
```

### 3. Probabilistic Move Selection (player.py:145-179)

Even if LLM suggests a good move, lower skills randomly make mistakes:

| Skill Level | Random Move Chance |
|-------------|--------------------|
| 1-2 | 50% |
| 3-4 | 35% |
| 5-6 | 20% |
| 7-8 | 10% |
| 9 | 5% |
| 10 | 0% (always plays LLM move) |

**Implementation** (player.py:168-176):
```python
if self.skill_level <= 2:
    random_chance = 0.5
elif self.skill_level <= 4:
    random_chance = 0.35
# ... etc
if random.random() < random_chance:
    return random.choice(legal_moves)
```

### 4. Move Filtering (player.py:187-234)

Before presenting moves to the LLM, filter out advanced tactical moves for lower skills:

| Skill Level | Moves Shown | Logic |
|-------------|-------------|-------|
| 1-3 | Top 40% | Only simple, obvious moves |
| 4-6 | Top 65% | Most tactical moves included |
| 7-9 | Top 80% | Nearly all moves |
| 10 | 100% | All legal moves |

**Move Evaluation Heuristics** (player.py:236-310):

The system scores moves using chess principles:

```python
score = 0

# Checkmate
if board.is_checkmate():
    score += 1000

# Captures (weighted by piece value)
if board.is_capture(move):
    captured_piece = board.piece_at(move.to_square)
    piece_values = {PAWN: 1, KNIGHT: 3, BISHOP: 3, ROOK: 5, QUEEN: 9}
    score += piece_values.get(captured_piece.piece_type, 0) * 10

# Checks (tactical pressure)
if board.gives_check(move):
    score += 15

# Center control
if move.to_square in [E4, E5, D4, D5]:
    score += 8

# Development
if from_rank in [1, 8]:  # Back rank
    score += 5

# Hanging pieces (skill-dependent awareness)
if skill_level >= 4:
    if is_piece_hanging(board, move.to_square):
        score -= 10

# Random noise for variation
score += random.randint(-20, 20) if skill_level <= 7 else 0

return score
```

After scoring, moves are sorted and filtered based on skill level.

## Learning Mode & Hint System

The Learning Mode provides educational assistance through intelligent hint generation and visual feedback.

### Hint Generation Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Hint Request Flow                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend: User clicks "Get Hint"                           │
│  - Sends POST /hint with hint level                         │
│  - Shows loading state                                      │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend: /hint endpoint                                    │
│  - Validates hint level                                     │
│  - Calls computer_player.get_hint()                        │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  ComputerPlayer.get_hint()                                  │
│  - Analyzes current position                                │
│  - Generates best move using master-level LLM               │
│  - Creates skill-appropriate explanation                    │
│  - Categorizes move type                                   │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend: Display Hint                                     │
│  - Shows move notation and explanation                      │
│  - Highlights squares on board                             │
│  - Draws animated arrow                                    │
│  - Color-codes by category                                 │
└─────────────────────────────────────────────────────────────┘
```

### Hint Components

#### 1. Hint Generation (player.py:312-505)

**Key Methods**:
- `get_hint(board, hint_level)` - Main hint generation interface
- `_get_best_move_for_hint()` - Always uses master-level analysis
- `_generate_hint_explanation()` - Creates educational explanations
- `_categorize_move()` - Identifies move types for UI styling

**Hint Levels**:
- **Basic**: Simple explanations (1-2 sentences), focus on main ideas
- **Intermediate**: Tactical details (2-3 sentences), includes principles
- **Advanced**: Strategic analysis (3-4 sentences), considers variations

#### 2. Move Categorization System

**Categories & Colors**:
```python
categories = {
    'checkmate': '#805ad5',      # Purple - Game ending
    'check': '#dd6b20',          # Orange - King attack
    'capture': '#e53e3e',        # Red - Material gain
    'castling': '#d69e2e',       # Yellow - King safety
    'promotion': '#9f7aea',      # Pink - Pawn upgrade
    'center': '#38a169',         # Green - Central control
    'development': '#3182ce',    # Blue - Piece activity
    'general': '#718096'         # Gray - Positional
}
```

#### 3. Visual Feedback System

**Board Visualization**:
- Green highlighting on suggested squares
- Animated arrows showing move direction
- Light bulb icons with pulse animation
- Color-coded explanation boxes

**UI Components**:
- Hint display panel with smooth animations
- Category-specific styling
- Learning mode toggle
- Hint level selector

### Learning Mode Settings

**API Endpoints**:
- `GET /learning-mode` - Retrieve current settings
- `POST /learning-mode` - Update enabled state and hint level

**State Management**:
```javascript
// Frontend state
let learningModeEnabled = false;
let currentHintLevel = 'basic';
let currentHint = null;

// Backend state (ComputerPlayer)
computer_player.learning_mode = enabled;
computer_player.hint_level = hint_level;
```

### Educational Features

#### 1. Adaptive Explanations

The system adjusts explanation complexity based on selected hint level:

**Basic Example**: "Control the center - this is a key strategic principle in chess."

**Intermediate Example**: "Develop your knight to f3 to control the center and prepare for castling. This move follows opening principles and creates threats."

**Advanced Example**: "Develop your knight to f3, controlling key central squares (d4, e5) while preparing rapid castling. This move supports central control, creates tactical possibilities, and maintains flexibility for your pawn structure."

#### 2. Move Type Recognition

The system automatically identifies and explains different types of moves:

- **Tactical Moves**: Captures, checks, forks, pins
- **Strategic Moves**: Development, center control, prophylaxis
- **Special Moves**: Castling, promotion, en passant
- **Endgame Moves**: King activity, pawn promotion, zugzwang

#### 3. Error Handling & Fallbacks

**LLM Failure Recovery**:
- Fallback to rule-based explanations
- Random move selection with basic guidance
- Graceful degradation without breaking functionality

**Validation**:
- Move legality verification
- Hint level validation
- Position analysis (game over detection)

### Integration Points

#### 1. Board Update Integration

Hints are automatically cleared when:
- Player makes a move
- AI responds
- Game is reset
- Board state changes

```javascript
function updateBoard(previousPieces = null) {
    // Clear hints when board updates
    clearHintsOnBoardUpdate();
    // ... existing board update logic
}
```

#### 2. Skill System Integration

Hint generation uses master-level analysis regardless of AI skill level:
```python
def _get_best_move_for_hint(self, board, legal_moves):
    original_skill = self.skill_level
    self.skill_level = 10  # Temporarily use master level
    try:
        best_move = self._get_llm_move(board, legal_moves)
        return best_move
    finally:
        self.skill_level = original_skill
```

#### 3. Testing Integration

Comprehensive test coverage includes:
- Hint generation validation
- Move legality verification
- Category classification testing
- Learning mode settings testing
- Edge case handling (game over, invalid positions)

## API Specification

### GET /board

**Purpose**: Retrieve current board state

**Response** (200 OK):
```json
{
    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "legal_moves": ["e2e4", "e2e3", "d2d4", "d2d3", ...],
    "turn": "white",
    "is_check": false,
    "is_checkmate": false,
    "is_stalemate": false,
    "is_game_over": false,
    "pieces": {
        "a1": {"type": "r", "color": "white"},
        "e2": {"type": "p", "color": "white"},
        ...
    }
}
```

### POST /move

**Purpose**: Execute a move and get AI response

**Request Body**:
```json
{
    "move": "e2e4",
    "test_mode": false  // Optional: skip AI response
}
```

**Response** (200 OK):
```json
{
    "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
    "legal_moves": ["e7e5", "e7e6", "d7d5", ...],
    "turn": "white",  // After AI move
    "is_check": false,
    "is_checkmate": false,
    "is_stalemate": false,
    "is_game_over": false,
    "pieces": {...}
}
```

**Error Response** (400 Bad Request):
```json
{
    "error": "Illegal move"
}
```

### POST /reset

**Purpose**: Reset game to initial state

**Response** (200 OK):
```json
{
    "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "legal_moves": ["e2e4", "e2e3", ...],
    "turn": "white",
    ...
}
```

### GET /skill-level

**Purpose**: Get current AI skill level

**Response** (200 OK):
```json
{
    "level": 5,
    "description": "Intermediate"
}
```

### POST /skill-level

**Purpose**: Update AI skill level

**Request Body**:
```json
{
    "level": 7
}
```

**Response** (200 OK):
```json
{
    "level": 7,
    "description": "Strong Player"
}
```

**Error Response** (400 Bad Request):
```json
{
    "error": "Skill level must be between 1 and 10"
}
```

## Frontend Implementation

### chess.js - Game Client Logic

**Key Constants** (chess.js:1-13):
```javascript
const API_URL = 'http://localhost:5001';
const BOARD_SIZE = 8;
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];
```

**State Management** (chess.js:39-53):
```javascript
let gameState = null;              // Current board state from API
let selectedSquare = null;         // User's selected square
let playerColor = 'white';         // Player always plays white
let isComputerThinking = false;    // Prevent moves during AI turn
let moveHistory = [];              // Array of move objects
let lastMoveSquares = [];          // For highlighting
let capturedPieces = {white: [], black: []};  // Captured piece tracking
```

**Core Functions**:

1. **initializeBoard()** (chess.js:56-108)
   - Creates DOM elements for board squares
   - Adds coordinate labels
   - Initializes event listeners
   - Fetches initial board state

2. **handleSquareClick(square)** (chess.js:277-318)
   - Handles piece selection and destination
   - Validates user input
   - Calls makeMove() when valid

3. **makeMove(from, to)** (chess.js:221-324)
   - Converts UI coordinates to UCI notation
   - Shows loading spinner
   - Posts move to API
   - Updates UI with response
   - Handles AI move detection and animation

4. **updateBoard(previousPieces)** (chess.js:102-137)
   - Clears and redraws pieces
   - Applies move highlighting
   - Detects captured pieces

5. **animateAIMove(fromSquare, toSquare)** (chess.js:459-472)
   - Adds 5-second blue flash animation
   - Uses CSS class `.ai-move-flash`

**Coordinate Conversion** (chess.js:225-232):

The frontend displays white at bottom (rank 8 at top), but chess notation uses rank 1 at bottom:

```javascript
// Convert UI coordinates to chess coordinates
const fromCoord = fromFile + (9 - parseInt(fromRank));
// Example: UI d7 → Chess d2
```

### style.css - UI Styling

**Layout Structure**:

```
body (flex column, centered)
  ├── h1 (title, max-width: 870px)
  ├── .status (status bar, max-width: 870px)
  └── .game-container (max-width: 870px)
        ├── .left-panel
        │     ├── .captured-pieces.white-captured (480px + 60px margins)
        │     ├── .board-wrapper (480px + 60px margins)
        │     │     └── .chessboard (480px)
        │     │           └── 64 × .square (60px each)
        │     ├── .captured-pieces.black-captured
        │     ├── .controls (reset button)
        │     └── .skill-control (480px + 60px margins)
        └── .right-panel (max-width: 300px)
              └── .move-history
```

**Width Calculations**:
- Board: 480px (8 × 60px squares)
- Board wrapper margins: 60px (30px each side)
- Captured pieces/skill control: 480px + 60px margins
- Left panel total: 540px
- Right panel: 300px
- Gap: 30px
- **Total container: 870px**

**Key Animations**:

1. **AI Move Flash** (style.css:246-262):
```css
.ai-move-flash {
    animation: flashMove 5s ease-out;
}
@keyframes flashMove {
    0%, 100% { background-color: inherit; }
    15%, 45% { background-color: rgba(102, 126, 234, 0.7) !important; }
    30% { background-color: rgba(102, 126, 234, 0.9) !important; }
}
```

2. **Captured Piece Appearance** (style.css:326-335):
```css
@keyframes captureAppear {
    from {
        opacity: 0;
        transform: scale(0.5) rotate(180deg);
    }
    to {
        opacity: 1;
        transform: scale(1) rotate(0deg);
    }
}
```

3. **Page Load Fade** (style.css:42-50):
```css
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
```

## Containerization

### docker-compose.yml

**Services**:

```yaml
services:
  chess-app:
    build: .
    ports:
      - "5001:5000"
    environment:
      - OLLAMA_HOST=http://ollama:11434
      - PORT=5000
    depends_on:
      - ollama
    networks:
      - chess-network

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama
    networks:
      - chess-network

networks:
  chess-network:
    driver: bridge

volumes:
  ollama-data:
```

**Network Communication**:
- Containers communicate via `chess-network` bridge
- Chess app connects to Ollama via `http://ollama:11434` (internal DNS)
- External access to chess app via `http://localhost:5001`
- External access to Ollama via `http://localhost:11434`

### Dockerfile

**Multi-stage Build**:

```dockerfile
FROM python:3.11-alpine

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

EXPOSE 5000

CMD ["python", "app.py"]
```

**Image Details**:
- Base: Python 3.11 Alpine (lightweight)
- Size: ~150MB (with dependencies)
- No caching for pip ensures fresh builds

## Design Decisions

### 1. Why Flask Instead of FastAPI?

**Decision**: Use Flask 2.3.3

**Rationale**:
- Simpler for this use case (no async needed)
- Lower learning curve for contributors
- Excellent ecosystem and documentation
- Sufficient performance for chess game

### 2. Why Vanilla JavaScript Instead of React/Vue?

**Decision**: Use vanilla JavaScript with no framework

**Rationale**:
- No build step required
- Simpler deployment (just static files)
- Easier to understand for learners
- Adequate for single-page application
- Better for educational purposes

### 3. Why python-chess Library?

**Decision**: Use python-chess 1.999 for game logic

**Rationale**:
- Industry-standard chess library
- Handles all chess rules (en passant, castling, promotion)
- Excellent FEN/PGN support
- Well-tested and maintained
- Provides move validation out of the box

### 4. Why Ollama for LLM?

**Decision**: Use Ollama with Llama2 model

**Rationale**:
- Runs locally (no API keys or internet required)
- Open-source and free
- Easy model management (`ollama pull <model>`)
- Supports multiple models (Llama2, Mistral, etc.)
- Good balance of performance and quality

### 5. Why Skill Levels Instead of Simple Difficulty?

**Decision**: Implement 10-level skill system with multiple tuning strategies

**Rationale**:
- More granular control for players
- Demonstrates advanced AI techniques
- Makes the game playable for all skill levels
- Shows practical application of LLM parameters
- Educational value (shows prompt engineering impact)

### 6. Why Test Mode in /move Endpoint?

**Decision**: Add optional `test_mode` parameter to skip AI response

**Rationale**:
- Enables deterministic testing
- Allows validation of specific board states
- Simplifies test suite implementation
- Doesn't affect normal gameplay

### 7. Why Store Captured Pieces in Frontend?

**Decision**: Track captured pieces in JavaScript rather than backend

**Rationale**:
- python-chess doesn't track captures natively
- Simpler to detect via board state comparison in frontend
- Reduces backend complexity
- Matches frontend-driven UI updates

### 8. Why Use UCI Notation Internally?

**Decision**: Use UCI (Universal Chess Interface) notation for moves

**Rationale**:
- Standard format (e.g., "e2e4", "e7e8q")
- Supported by python-chess out of the box
- Unambiguous and compact
- Industry standard for chess engines

### 9. Why 5-Second AI Move Flash?

**Decision**: Highlight AI moves for 5 seconds with blue animation

**Rationale**:
- User feedback indicated moves were "too fast to see"
- 5 seconds provides ample time to notice without being intrusive
- Blue color distinguishes from last-move yellow highlighting
- Smooth fade-out maintains professional feel

### 10. Why 870px Container Width?

**Decision**: Set max-width to 870px instead of 1200px

**Rationale**:
- Matches actual content width:
  - Left panel: 540px (480px board + 60px margins)
  - Gap: 30px
  - Right panel: 300px
  - Total: 870px
- Prevents awkward off-center alignment
- Creates cohesive visual hierarchy
- All elements (title, status, game) align perfectly

## Performance Considerations

### Frontend
- **DOM Updates**: Efficient use of `querySelector` with caching
- **Event Delegation**: Click handlers on individual squares (not ideal for large grids, but fine for 8×8)
- **Animation Performance**: CSS transforms used instead of position changes

### Backend
- **Move Validation**: O(1) lookup in python-chess (pre-computed legal moves)
- **LLM Calls**: 3-10 seconds per move (primary bottleneck)
- **Memory**: Single shared board instance (minimal memory footprint)

### Optimization Opportunities
1. **Cache LLM responses** for common positions
2. **Use faster LLM** (e.g., Mistral instead of Llama2)
3. **Implement move prediction** (start LLM call before user move completes)
4. **Add connection pooling** for Ollama HTTP requests

## Security Considerations

### Current State
- No authentication required
- Local deployment only (no exposed services)
- No sensitive data storage
- No user accounts or personal information

### Production Deployment Recommendations
1. Add HTTPS/TLS
2. Implement rate limiting on API endpoints
3. Add CORS restrictions
4. Sanitize all user inputs (currently minimal risk)
5. Add authentication if multi-user

## Future Enhancements

### Planned Features
1. Save/load games (PGN export)
2. Undo move functionality
3. Move suggestions for players
4. Opening book integration
5. Game analysis mode
6. Multiplayer support (two humans)
7. Mobile-responsive design improvements
8. Custom themes
9. Sound effects
10. Chess clock/timer

### Technical Debt
1. Add comprehensive logging
2. Implement better error handling for LLM failures
3. Add integration tests
4. Improve test coverage
5. Add CI/CD pipeline
6. Document API with OpenAPI/Swagger

---

**Last Updated**: January 2026
**Version**: 1.0
**Authors**: Chess Bot Development Team

# LLM Chess Bot

A chess application with an AI opponent powered by a free Large Language Model (LLM).

## Features

- Interactive chess board UI
- Backend chess logic using python-chess
- Computer opponent powered by Ollama LLM
- Containerized for easy deployment with Podman

## Requirements

- Podman (or Docker)
- Podman Compose (or Docker Compose)

## Setup and Installation

### Using Podman

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/llm_chess_bot.git
   cd llm_chess_bot
   ```

2. Build and start the containers using Podman Compose:
   ```
   podman-compose up -d
   ```

   If you're using Docker instead:
   ```
   docker-compose up -d
   ```

3. The first time you run the application, Ollama will download the LLM model (this may take some time depending on your internet connection):
   ```
   podman exec -it llm_chess_bot-ollama-1 ollama pull llama2
   ```

4. Access the chess application in your web browser:
   ```
   http://localhost:5000
   ```

### Manual Setup (without containers)

If you prefer to run the application without containers:

1. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Install and run Ollama from [https://ollama.ai/](https://ollama.ai/)

3. Pull the Llama2 model:
   ```
   ollama pull llama2
   ```

4. Run the Flask application:
   ```
   python app.py
   ```

5. Access the chess application in your web browser:
   ```
   http://localhost:5000
   ```

## How It Works

- The frontend is built with HTML, CSS, and JavaScript
- The backend uses Flask to serve the API and static files
- The chess logic is handled by the python-chess library
- The computer player uses Ollama's Llama2 model to make chess moves
- Communication between components happens via REST API calls

## Customization

### Changing the LLM Model

You can use a different model by modifying the `model` property in the `ComputerPlayer` class in `player.py`:

```python
self.model = "llama2"  # Change to another model available in Ollama
```

Available models can be found on the [Ollama models page](https://ollama.ai/library).

### Adjusting the Board Size

You can modify the board size by changing the CSS in `style.css`:

```css
.chessboard {
    grid-template-columns: repeat(8, 60px);
    grid-template-rows: repeat(8, 60px);
    width: 480px;
    height: 480px;
}

.square {
    width: 60px;
    height: 60px;
}
```

## Testing

The application includes a test suite to validate that moves are processed correctly. To run the tests:

1. Make sure the application is running at http://localhost:5001
2. Install the required testing dependencies:
   ```
   pip install python-chess requests unittest
   ```
3. Run the tests:
   ```
   python run_tests.py
   ```

The test suite includes:
- Basic opening moves test: Makes a series of standard opening moves and validates the board state
- Pawn promotion test (placeholder): Demonstrates how to test pawn promotion

You can extend the tests by adding more test cases to `test_chess.py`.

## Troubleshooting

- **Connection refused to Ollama**: Make sure the Ollama service is running and accessible
- **Model not found**: Ensure you've pulled the model with `ollama pull llama2`
- **Slow computer moves**: LLM processing can take time, especially on the first few moves
- **Test failures**: If tests fail, check that the application is running and the board state is correct

## License

This project is licensed under the MIT License - see the LICENSE file for details.
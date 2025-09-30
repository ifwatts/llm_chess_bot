#!/bin/bash
set -e

# Start Ollama server
ollama serve &

# Wait for Ollama to start
echo "Waiting for Ollama to start..."
sleep 5

# Pull the llama2 model if it doesn't exist
if ! ollama list | grep -q "llama2"; then
    echo "Pulling llama2 model..."
    ollama pull llama2
fi

# Keep the container running
echo "Ollama is ready!"
tail -f /dev/null

# Made with Bob

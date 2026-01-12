FROM ollama/ollama:latest

# Expose Ollama API port
EXPOSE 11434

# Set CPU-only mode environment variable
ENV OLLAMA_GPU=0
ENV OLLAMA_MAX_LOADED_MODELS=1
ENV OLLAMA_NUM_PARALLEL=1

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Use entrypoint script to auto-download model
ENTRYPOINT ["/entrypoint.sh"]
# Try to use internal registry first, fallback to public registry
FROM image-registry.openshift-image-registry.svc:5000/llm-chess-bot/ollama-base:latest

# Expose Ollama API port
EXPOSE 11434

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Use entrypoint script to auto-download model
ENTRYPOINT ["/entrypoint.sh"]
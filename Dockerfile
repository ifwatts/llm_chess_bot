# Try to use internal registry first, fallback to public registry
FROM image-registry.openshift-image-registry.svc:5000/llm-chess-bot/python-311:latest

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application
CMD ["python", "app.py"]
FROM alpine:3.18

WORKDIR /app

# Install Python and pip
RUN apk add --no-cache python3 py3-pip

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application
CMD ["python", "app.py"]
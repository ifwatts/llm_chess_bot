#!/bin/bash

# Chess Bot Podman Deployment Script
# This script builds and deploys the LLM Chess Bot application to local Podman environment

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="llm_chess_bot"
OLLAMA_MODEL="${OLLAMA_MODEL:-llama2}"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_podman() {
    if ! command -v podman &> /dev/null; then
        log_error "Podman is not installed. Please install Podman first."
        exit 1
    fi
    log_success "Podman is installed"
}

check_podman_compose() {
    if ! command -v podman-compose &> /dev/null; then
        log_error "podman-compose is not installed. Please install it with: pip install podman-compose"
        exit 1
    fi
    log_success "podman-compose is installed"
}

stop_existing() {
    log_info "Stopping existing containers..."
    podman-compose -f "$COMPOSE_FILE" down 2>/dev/null || true
    log_success "Stopped existing containers"
}

build_images() {
    log_info "Building Docker images..."
    podman-compose -f "$COMPOSE_FILE" build --no-cache
    log_success "Images built successfully"
}

start_services() {
    log_info "Starting services..."
    podman-compose -f "$COMPOSE_FILE" up -d
    log_success "Services started"
}

wait_for_ollama() {
    log_info "Waiting for Ollama service to be ready..."
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if podman exec -it "${PROJECT_NAME}-ollama-1" curl -s http://localhost:11434/api/tags &> /dev/null; then
            log_success "Ollama service is ready"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done

    log_error "Ollama service did not become ready in time"
    return 1
}

pull_model() {
    log_info "Pulling Ollama model: $OLLAMA_MODEL"
    log_warning "This may take several minutes depending on the model size..."

    if podman exec -it "${PROJECT_NAME}-ollama-1" ollama pull "$OLLAMA_MODEL"; then
        log_success "Model $OLLAMA_MODEL pulled successfully"
    else
        log_error "Failed to pull model $OLLAMA_MODEL"
        return 1
    fi
}

show_status() {
    log_info "Container status:"
    podman-compose -f "$COMPOSE_FILE" ps
    echo ""
    log_info "Application URLs:"
    echo -e "  Chess App: ${GREEN}http://localhost:5000${NC}"
    echo -e "  Ollama API: ${GREEN}http://localhost:11434${NC}"
}

show_logs() {
    log_info "Recent logs (use 'podman-compose logs -f' to follow):"
    podman-compose -f "$COMPOSE_FILE" logs --tail=20
}

# Main deployment flow
main() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  LLM Chess Bot - Podman Deployment${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""

    # Pre-flight checks
    log_info "Running pre-flight checks..."
    check_podman
    check_podman_compose
    echo ""

    # Stop existing containers
    stop_existing
    echo ""

    # Build images
    build_images
    echo ""

    # Start services
    start_services
    echo ""

    # Wait for Ollama
    if wait_for_ollama; then
        echo ""
        # Pull model
        pull_model
    else
        log_warning "Continuing without waiting for Ollama..."
    fi

    echo ""
    echo -e "${BLUE}========================================${NC}"
    log_success "Deployment complete!"
    echo -e "${BLUE}========================================${NC}"
    echo ""

    show_status
    echo ""

    log_info "Useful commands:"
    echo "  View logs:        podman-compose logs -f"
    echo "  Stop services:    podman-compose down"
    echo "  Restart services: podman-compose restart"
    echo "  Pull new model:   podman exec -it ${PROJECT_NAME}-ollama-1 ollama pull <model-name>"
    echo ""
}

# Run main function
main

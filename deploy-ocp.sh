#!/bin/bash

# LLM Chess Bot - OpenShift Cluster Deployment Script
# This script deploys the LLM Chess Bot application to an OpenShift cluster

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables from .env file
if [ ! -f ".env" ]; then
    log_error ".env file not found. Please create it with OCP cluster configuration."
    exit 1
fi

# Source the .env file
set -a
source .env
set +a

# Configuration
PROJECT_NAME="llm-chess-bot"
APP_NAME="chess-app"
OLLAMA_NAME="ollama"
NAMESPACE="${PROJECT_NAME}"
APP_PORT=5000
OLLAMA_PORT=11434

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

check_oc() {
    if ! command -v oc &> /dev/null; then
        log_error "OpenShift CLI (oc) is not installed. Please install it first."
        echo "Download from: https://docs.openshift.com/container-platform/4.11/cli_reference/openshift_cli/getting-started-cli.html"
        exit 1
    fi
    log_success "OpenShift CLI is installed"
}

check_env_vars() {
    local required_vars=("OCP_API_URL" "OCP_USERNAME" "OCP_PASSWORD")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        exit 1
    fi
    
    log_success "Environment variables are set"
}

login_to_ocp() {
    log_info "Logging into OpenShift cluster: $OCP_API_URL"
    
    local login_cmd="oc login $OCP_API_URL -u $OCP_USERNAME -p $OCP_PASSWORD"
    
    if [ "$OCP_SKIP_TLS_VERIFY" = "true" ]; then
        login_cmd="$login_cmd --insecure-skip-tls-verify"
    fi
    
    if $login_cmd; then
        log_success "Successfully logged into OpenShift cluster"
    else
        log_error "Failed to login to OpenShift cluster"
        exit 1
    fi
}

create_namespace() {
    log_info "Creating namespace: $NAMESPACE"
    
    if oc get namespace "$NAMESPACE" &> /dev/null; then
        log_warning "Namespace $NAMESPACE already exists"
    else
        oc create namespace "$NAMESPACE"
        log_success "Namespace $NAMESPACE created"
    fi
    
    oc project "$NAMESPACE"
    log_success "Switched to namespace $NAMESPACE"
}

create_docker_config_secret() {
    log_info "Creating Docker registry secret (if needed)"
    
    # This is a placeholder for internal registry access
    # Adjust based on your specific registry requirements
    if ! oc get secret llm-chess-bot-pull-secret &> /dev/null; then
        oc create secret docker-registry llm-chess-bot-pull-secret \
            --docker-server=image-registry.openshift-image-registry.svc:5000 \
            --docker-username=$(oc whoami) \
            --docker-password=$(oc whoami -t) \
            --namespace=$NAMESPACE
        log_success "Docker registry secret created"
    else
        log_warning "Docker registry secret already exists"
    fi
}

pre_pull_base_images() {
    log_info "Pre-pulling base images to avoid rate limits..."
    
    # Pull Python base image for chess app
    log_info "Pulling Python base image..."
    if ! oc image mirror registry.access.redhat.com/ubi8/python-311:latest image-registry.openshift-image-registry.svc:5000/$NAMESPACE/python-311:latest -n $NAMESPACE; then
        log_warning "Failed to mirror Python base image, will try direct pull during build"
    fi
    
    # Pull Ollama base image
    log_info "Pulling Ollama base image..."
    if ! oc image mirror docker.io/ollama/ollama:latest image-registry.openshift-image-registry.svc:5000/$NAMESPACE/ollama-base:latest -n $NAMESPACE; then
        log_warning "Failed to mirror Ollama base image, will try direct pull during build"
    fi
    
    log_success "Base image mirroring completed"
}

build_and_push_images() {
    log_info "Building container images using OpenShift internal registry"
    
    # Pre-pull base images to avoid rate limits
    pre_pull_base_images
    
    # Build chess-app image using OCP's internal build system
    log_info "Building chess-app image with OpenShift BuildConfig..."
    
    # Create BuildConfig for chess-app if it doesn't exist
    if ! oc get buildconfig $APP_NAME -n $NAMESPACE &> /dev/null; then
        oc new-build \
            --name=$APP_NAME \
            --binary \
            --strategy=docker \
            --to=image-registry.openshift-image-registry.svc:5000/$NAMESPACE/$APP_NAME:latest \
            -n $NAMESPACE
        log_success "BuildConfig for $APP_NAME created"
    else
        log_warning "BuildConfig for $APP_NAME already exists"
    fi
    
    # Start binary build for chess-app
    log_info "Starting binary build for $APP_NAME..."
    if ! oc start-build $APP_NAME --from-dir=. --follow -n $NAMESPACE; then
        log_error "Chess app build failed"
        return 1
    fi
    
    # Build ollama image using OCP's internal build system
    log_info "Building ollama image with OpenShift BuildConfig..."
    
    # Create BuildConfig for ollama if it doesn't exist
    if ! oc get buildconfig $OLLAMA_NAME -n $NAMESPACE &> /dev/null; then
        oc new-build \
            --name=$OLLAMA_NAME \
            --binary \
            --strategy=docker \
            --to=image-registry.openshift-image-registry.svc:5000/$NAMESPACE/$OLLAMA_NAME:latest \
            -n $NAMESPACE
        log_success "BuildConfig for $OLLAMA_NAME created"
    else
        log_warning "BuildConfig for $OLLAMA_NAME already exists"
    fi
    
    # Start binary build for ollama
    log_info "Starting binary build for $OLLAMA_NAME..."
    if ! oc start-build $OLLAMA_NAME --from-dir=./ollama --follow -n $NAMESPACE; then
        log_error "Ollama build failed"
        return 1
    fi
    
    # Verify images are available in internal registry
    log_info "Verifying images in internal registry..."
    oc get imagestreamtag -n $NAMESPACE
    
    log_success "Images built successfully in OpenShift internal registry"
}

apply_kubernetes_manifests() {
    log_info "Applying Kubernetes manifests"
    
    # Apply all manifests
    oc apply -f k8s/ -n $NAMESPACE
    
    log_success "Kubernetes manifests applied"
}

wait_for_deployment() {
    local deployment_name=$1
    local max_attempts=30
    local attempt=1
    
    log_info "Waiting for deployment $deployment_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if oc get deployment $deployment_name -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' | grep -q '^[1-9]'; then
            log_success "Deployment $deployment_name is ready"
            return 0
        fi
        echo -n "."
        sleep 10
        attempt=$((attempt + 1))
    done
    
    log_error "Deployment $deployment_name did not become ready in time"
    return 1
}

wait_for_ollama() {
    log_info "Waiting for Ollama service to be ready..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if oc exec -n $NAMESPACE deployment/$OLLAMA_NAME -- curl -s http://localhost:11434/api/tags &> /dev/null; then
            log_success "Ollama service is ready"
            return 0
        fi
        echo -n "."
        sleep 10
        attempt=$((attempt + 1))
    done
    
    log_warning "Ollama service did not become ready in time, continuing..."
}

pull_ollama_model() {
    log_info "Pulling Ollama model: llama2"
    log_warning "This may take several minutes depending on the model size..."
    
    if oc exec -n $NAMESPACE deployment/$OLLAMA_NAME -- ollama pull llama2; then
        log_success "Model llama2 pulled successfully"
    else
        log_error "Failed to pull model llama2"
        return 1
    fi
}

get_app_url() {
    log_info "Getting application URL..."
    
    # Get the route URL
    local route_url=$(oc get route $APP_NAME -n $NAMESPACE -o jsonpath='{.spec.host}' 2>/dev/null || echo "")
    
    if [ -n "$route_url" ]; then
        local app_url="https://$route_url"
        log_success "Application is accessible at: $app_url"
        echo "$app_url"
    else
        log_warning "Route not found, checking for LoadBalancer service..."
        local lb_url=$(oc get svc $APP_NAME -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
        if [ -n "$lb_url" ]; then
            local app_url="http://$lb_url:$APP_PORT"
            log_success "Application is accessible at: $app_url"
            echo "$app_url"
        else
            log_error "Could not determine application URL"
            echo ""
        fi
    fi
}

show_deployment_status() {
    log_info "Deployment status:"
    oc get pods -n $NAMESPACE
    echo ""
    log_info "Services:"
    oc get svc -n $NAMESPACE
    echo ""
    log_info "Routes:"
    oc get routes -n $NAMESPACE
}

cleanup() {
    log_info "Cleaning up temporary files..."
    # Add any cleanup logic here
}

# Main deployment flow
main() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  LLM Chess Bot - OCP Deployment${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    # Pre-flight checks
    log_info "Running pre-flight checks..."
    check_oc
    check_env_vars
    echo ""
    
    # Login to cluster
    login_to_ocp
    echo ""
    
    # Create namespace
    create_namespace
    echo ""
    
    # Create Docker config secret
    create_docker_config_secret
    echo ""
    
    # Build and push images
    build_and_push_images
    echo ""
    
    # Apply Kubernetes manifests
    apply_kubernetes_manifests
    echo ""
    
    # Wait for deployments
    wait_for_deployment $OLLAMA_NAME
    wait_for_deployment $APP_NAME
    echo ""
    
    # Wait for Ollama and pull model
    if wait_for_ollama; then
        echo ""
        pull_ollama_model
    else
        log_warning "Continuing without waiting for Ollama..."
    fi
    echo ""
    
    echo -e "${BLUE}========================================${NC}"
    log_success "Deployment complete!"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    # Show status and URL
    show_deployment_status
    echo ""
    
    local app_url=$(get_app_url)
    if [ -n "$app_url" ]; then
        echo -e "${GREEN}🎮 Chess App URL: $app_url${NC}"
    fi
    
    echo ""
    log_info "Useful commands:"
    echo "  View logs:        oc logs -f deployment/$APP_NAME -n $NAMESPACE"
    echo "  View Ollama logs: oc logs -f deployment/$OLLAMA_NAME -n $NAMESPACE"
    echo "  Get shell:        oc exec -it deployment/$APP_NAME -n $NAMESPACE -- bash"
    echo "  Delete deployment: oc delete namespace $NAMESPACE"
    echo ""
}

# Handle cleanup on exit
trap cleanup EXIT

# Run main function
main

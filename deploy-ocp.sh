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
GITHUB_REPO_URL="${GITHUB_REPO_URL:-}"  # Can be set in .env file

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
    log_info "Creating Docker registry secrets (if needed)"
    
    # Create secret for internal OpenShift registry
    if ! oc get secret llm-chess-bot-pull-secret &> /dev/null; then
        oc create secret docker-registry llm-chess-bot-pull-secret \
            --docker-server=image-registry.openshift-image-registry.svc:5000 \
            --docker-username=$(oc whoami) \
            --docker-password=$(oc whoami -t) \
            --namespace=$NAMESPACE
        log_success "OpenShift registry secret created"
    else
        log_warning "OpenShift registry secret already exists"
    fi
    
    # Create secret for Docker Hub (needed for Ollama image)
    if ! oc get secret docker-hub-secret &> /dev/null; then
        log_info "Creating Docker Hub pull secret..."
        log_warning "Note: You'll need Docker Hub credentials for pulling ollama/ollama image"
        
        # Check if Docker Hub credentials are provided in environment
        if [ -n "$DOCKER_HUB_USERNAME" ] && [ -n "$DOCKER_HUB_PASSWORD" ]; then
            oc create secret docker-registry docker-hub-secret \
                --docker-server=docker.io \
                --docker-username=$DOCKER_HUB_USERNAME \
                --docker-password=$DOCKER_HUB_PASSWORD \
                --namespace=$NAMESPACE
            log_success "Docker Hub secret created from environment variables"
        else
            log_warning "Docker Hub credentials not found in environment"
            log_info "Add these to your .env file:"
            echo "DOCKER_HUB_USERNAME=your-dockerhub-username"
            echo "DOCKER_HUB_PASSWORD=your-dockerhub-token-or-password"
            log_info "Or use anonymous pulls (may hit rate limits)"
        fi
    else
        log_warning "Docker Hub secret already exists"
    fi
    
    # Create secret for custom external registry (if configured)
    if [ -n "$CUSTOM_REGISTRY_USERNAME" ] && [ -n "$CUSTOM_REGISTRY_PASSWORD" ] && [ -n "$DOCKER_REGISTRY_URL" ]; then
        if ! oc get secret custom-registry-secret &> /dev/null; then
            log_info "Creating custom registry pull secret..."
            oc create secret docker-registry custom-registry-secret \
                --docker-server=$DOCKER_REGISTRY_URL \
                --docker-username=$CUSTOM_REGISTRY_USERNAME \
                --docker-password=$CUSTOM_REGISTRY_PASSWORD \
                --namespace=$NAMESPACE
            log_success "Custom registry secret created"
        else
            log_warning "Custom registry secret already exists"
        fi
    fi
    
    # Link secrets to service account
    log_info "Linking secrets to service account..."
    oc secrets link default llm-chess-bot-pull-secret -n $NAMESPACE || true
    oc secrets link default docker-hub-secret -n $NAMESPACE || true
    oc secrets link default custom-registry-secret -n $NAMESPACE || true
    oc secrets link builder llm-chess-bot-pull-secret -n $NAMESPACE || true
    oc secrets link builder docker-hub-secret -n $NAMESPACE || true
    oc secrets link builder custom-registry-secret -n $NAMESPACE || true
}

process_deployment_templates() {
    log_info "Processing deployment templates..."
    
    # Check if using external registry
    if [ "$INTERNAL_REGISTRY" = "false" ]; then
        log_info "Using external registry configuration"
        
        # Validate required external registry variables
        if [ -z "$DOCKER_REGISTRY_URL" ] || [ -z "$CHESS_APP_IMAGE" ] || [ -z "$OLLAMA_IMAGE" ]; then
            log_error "External registry mode requires DOCKER_REGISTRY_URL, CHESS_APP_IMAGE, and OLLAMA_IMAGE variables"
            exit 1
        fi
        
        # Process templates with envsubst
        log_info "Processing chess-app deployment template..."
        envsubst < k8s/chess-app-deployment-template.yaml > k8s/chess-app-deployment.yaml
        log_success "Chess app deployment processed"
        
        log_info "Processing ollama deployment template..."
        envsubst < k8s/ollama-deployment-template.yaml > k8s/ollama-deployment.yaml
        log_success "Ollama deployment processed"
    else
        log_info "Using internal OpenShift registry (default)"
        # Use existing deployment files
        cp k8s/chess-app-deployment.yaml k8s/chess-app-deployment.yaml.bak
        cp k8s/ollama-deployment.yaml k8s/ollama-deployment.yaml.bak
    fi
}

build_and_push_images() {
    # Skip building if using external registry
    if [ "$INTERNAL_REGISTRY" = "false" ]; then
        log_info "Using external registry - skipping image build process"
        log_info "Images will be pulled from: $DOCKER_REGISTRY_URL"
        return 0
    fi
    
    log_info "Building container images using OpenShift internal registry from GitHub main branch"
    
    # Get GitHub repository URL from environment variable or git remote
    local git_repo_url="$GITHUB_REPO_URL"
    if [ -z "$git_repo_url" ]; then
        git_repo_url=$(git config --get remote.origin.url 2>/dev/null || echo "https://github.com/yourusername/llm_chess_bot.git")
    fi
    log_info "Using repository: $git_repo_url"
    
    # Build chess-app image using GitHub source
    log_info "Building chess-app image from GitHub main branch..."
    
    # Create BuildConfig for chess-app if it doesn't exist
    if ! oc get buildconfig $APP_NAME -n $NAMESPACE &> /dev/null; then
        oc new-build \
            --name=$APP_NAME \
            --strategy=docker \
            --image=python:3.11-alpine \
            $git_repo_url \
            --to=chess-app:latest \
            -n $NAMESPACE
        log_success "BuildConfig for $APP_NAME created"
    else
        log_warning "BuildConfig for $APP_NAME already exists"
    fi
    
    # Start build from GitHub main branch
    log_info "Starting build for $APP_NAME from main branch..."
    if ! oc start-build $APP_NAME --follow -n $NAMESPACE; then
        log_error "Chess app build failed"
        return 1
    fi
    
    # Build ollama image using GitHub source
    log_info "Building ollama image from GitHub main branch..."
    
    # Create BuildConfig for ollama if it doesn't exist
    if ! oc get buildconfig $OLLAMA_NAME -n $NAMESPACE &> /dev/null; then
        oc new-build \
            --name=$OLLAMA_NAME \
            --strategy=docker \
            --image=ollama/ollama:latest \
            $git_repo_url \
            --context-dir=./ollama \
            --to=ollama:latest \
            -n $NAMESPACE
        log_success "BuildConfig for $OLLAMA_NAME created"
        
        # Remove the imageChange trigger to prevent infinite build loops
        oc patch buildconfig $OLLAMA_NAME -n $NAMESPACE --type='json' -p='[{"op": "remove", "path": "/spec/triggers/3"}]' || true
        log_success "Removed problematic imageChange trigger from $OLLAMA_NAME BuildConfig"
    else
        log_warning "BuildConfig for $OLLAMA_NAME already exists"
    fi
    
    # Start build for ollama from GitHub main branch
    log_info "Starting build for $OLLAMA_NAME from main branch..."
    if ! oc start-build $OLLAMA_NAME --follow -n $NAMESPACE; then
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
        
        # Extract and display router certificate for import
        extract_router_cert
        
        echo ""
        log_info "SSL Certificate Options:"
        echo "• Accept risk in browser (Advanced → Proceed to unsafe)"
        echo "• Import certificate using command above"
        echo "• Use HTTP URL as temporary workaround: http://$route_url"
        echo ""
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

extract_router_cert() {
    log_info "Extracting router certificate for browser import..."
    
    # Try to get router certificate from OpenShift
    local cert_file="llm-chess-bot-router-cert.crt"
    local cert_extracted=false
    
    # Try different certificate secrets in openshift-ingress
    for secret_name in "router-certs-default" "router-ca" "router-metrics-certs-default"; do
        if oc get secret $secret_name -n openshift-ingress &> /dev/null; then
            log_info "Found certificate secret: $secret_name"
            
            # Extract certificate to a file
            oc get secret $secret_name -n openshift-ingress -o jsonpath='{.data.tls\.crt}' | \
                base64 -d > "$cert_file" 2>/dev/null
            
            if [ -f "$cert_file" ] && [ -s "$cert_file" ]; then
                log_success "Certificate saved to: $cert_file"
                cert_extracted=true
                
                # Verify certificate
                if openssl x509 -in "$cert_file" -checkend 0 -noout 2>/dev/null; then
                    log_info "Certificate is valid"
                    
                    # Show certificate details
                    echo ""
                    echo "Certificate Details:"
                    openssl x509 -in "$cert_file" -noout -subject -dates 2>/dev/null | sed 's/^/  /'
                    echo ""
                    
                    echo "To import this certificate:"
                    echo "1. Chrome/Edge: Settings → Privacy/Security → Manage certificates → Import → Browse files"
                    echo "2. Firefox: Settings → Privacy & Security → Certificates → View Certificates → Import"
                    echo "3. Safari: Keychain Access → Certificate Assistant → Import"
                    echo ""
                    echo "After import, restart browser and visit: https://$route_url"
                    echo ""
                    echo "Alternative: Accept SSL risk in browser (Advanced → Proceed to unsafe)"
                    break
                else
                    log_warning "Certificate is invalid or expired"
                    rm -f "$cert_file"
                fi
            fi
        fi
    done
    
    # Try alternative certificate locations
    if [ "$cert_extracted" = false ]; then
        log_warning "Router certificate not found in openshift-ingress namespace"
        
        for ns in "openshift-config openshift-master default"; do
            for secret_name in "router-certs-default" "router-ca" "router-metrics-certs-default"; do
                if oc get secret $secret_name -n $ns &> /dev/null; then
                    log_info "Found certificate in namespace: $ns"
                    oc get secret $secret_name -n $ns -o jsonpath='{.data.tls\.crt}' | \
                        base64 -d > "$cert_file" 2>/dev/null
                    
                    if [ -f "$cert_file" ] && [ -s "$cert_file" ]; then
                        log_success "Certificate saved to: $cert_file"
                        cert_extracted=true
                        break 2
                    fi
                fi
            done
        done
    fi
    
    if [ "$cert_extracted" = false ]; then
        log_warning "No router certificate found. You may need to accept the SSL risk in browser."
        echo ""
        echo "Manual certificate extraction:"
        echo "1. Open: https://$route_url"
        echo "2. Click the lock icon in browser address bar"
        echo "3. View certificate → Export/Save as .crt file"
        echo "4. Import the saved certificate into your browser"
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
    
    # Process deployment templates
    process_deployment_templates
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
    echo "  Re-run deployment: ./deploy-ocp.sh"
    echo ""
    log_info "SSL Certificate Setup:"
    echo "========================"
    echo ""
    log_info "The application uses a self-signed SSL certificate."
    echo "To resolve browser security warnings:"
    echo ""
    echo "1. Run SSL setup script:"
    echo "   ./setup-ssl.sh"
    echo ""
    echo "2. Or accept SSL risk in browser (Advanced → Proceed to unsafe)"
    echo ""
    echo "3. Or use HTTP URL: http://$route_url"
    echo ""
    echo "Certificate file already extracted: llm-chess-bot-router-cert.crt"
    echo ""
    
    # Run SSL verification
    if command -v ./verify-ssl.sh &> /dev/null; then
        log_info "Running SSL verification..."
        ./verify-ssl.sh | tail -10
    fi
}

# Handle cleanup on exit
trap cleanup EXIT

# Run main function
main

#!/bin/bash

# SSL Verification Script for LLM Chess Bot
# This script verifies SSL certificate configuration and connectivity

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="llm-chess-bot"
APP_NAME="chess-app"

# Logging functions
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

# Check if oc is available
check_oc() {
    if ! command -v oc &> /dev/null; then
        log_error "OpenShift CLI (oc) is not installed or not in PATH"
        exit 1
    fi
    
    if ! oc whoami &> /dev/null; then
        log_error "Not logged into OpenShift. Please run 'oc login' first"
        exit 1
    fi
}

# Verify application URL and SSL
verify_app_ssl() {
    log_info "Verifying application SSL configuration..."
    
    # Get the route URL
    local app_url=$(oc get route $APP_NAME -n $NAMESPACE -o jsonpath='{.spec.host}' 2>/dev/null || echo "")
    
    if [ -z "$app_url" ]; then
        log_error "Application route not found"
        return 1
    fi
    
    log_info "Application URL: https://$app_url"
    
    # Check SSL certificate
    log_info "Checking SSL certificate..."
    
    # Get certificate details
    local cert_info=$(openssl s_client -connect "$app_url:443" -servername "$app_url" < /dev/null 2>/dev/null | openssl x509 -noout -text 2>/dev/null || echo "")
    
    if [ -n "$cert_info" ]; then
        log_success "SSL certificate is accessible"
        
        # Check certificate validity
        if echo "$cert_info" | openssl x509 -checkend 0 -noout 2>/dev/null; then
            log_success "Certificate is valid"
        else
            log_warning "Certificate is expired or invalid"
        fi
        
        # Check if certificate matches domain
        local cert_subject=$(echo "$cert_info" | grep "Subject:" | sed 's/.*CN=\([^,]*\).*/\1/')
        if [[ "$cert_subject" == *"$app_url"* ]] || [[ "$cert_subject" == *"*.apps"* ]]; then
            log_success "Certificate matches application domain"
        else
            log_warning "Certificate domain mismatch: $cert_subject"
        fi
        
        # Show certificate expiry
        local cert_expiry=$(echo "$cert_info" | grep "Not After" | cut -d: -f2- | xargs)
        log_info "Certificate expires: $cert_expiry"
        
    else
        log_error "Could not retrieve SSL certificate"
        return 1
    fi
    
    echo ""
    
    # Test HTTP connectivity
    log_info "Testing HTTP connectivity..."
    
    # Test HTTPS connection
    if curl -s -o /dev/null -w "%{http_code}" "https://$app_url" | grep -q "200\|301\|302"; then
        log_success "HTTPS connection successful"
    else
        log_warning "HTTPS connection failed"
    fi
    
    # Test API endpoint
    log_info "Testing API endpoint..."
    local api_response=$(curl -s -k -w "%{http_code}" "https://$app_url/board" 2>/dev/null || echo "000")
    
    if [[ "$api_response" == *"200"* ]]; then
        log_success "API endpoint is responding"
        
        # Test if API returns valid JSON
        local json_check=$(curl -s -k "https://$app_url/board" 2>/dev/null | python3 -c "import sys, json; json.load(sys.stdin)" 2>/dev/null && echo "valid" || echo "invalid")
        if [ "$json_check" = "valid" ]; then
            log_success "API returns valid JSON"
        else
            log_warning "API response is not valid JSON"
        fi
    else
        log_warning "API endpoint not responding (HTTP $api_response)"
    fi
    
    return 0
}

# Check application pods
check_app_pods() {
    log_info "Checking application pods..."
    
    local chess_pods=$(oc get pods -n $NAMESPACE -l app=chess-app --no-headers 2>/dev/null | wc -l)
    local ollama_pods=$(oc get pods -n $NAMESPACE -l app=ollama --no-headers 2>/dev/null | wc -l)
    
    log_info "Chess app pods: $chess_pods"
    log_info "Ollama pods: $ollama_pods"
    
    if [ "$chess_pods" -gt 0 ]; then
        local chess_running=$(oc get pods -n $NAMESPACE -l app=chess-app -o jsonpath='{.items[*].status.phase}' 2>/dev/null | grep -c "Running" || echo "0")
        log_info "Chess app running: $chess_running/$chess_pods"
        
        if [ "$chess_running" -eq "$chess_pods" ]; then
            log_success "All chess app pods are running"
        else
            log_warning "Some chess app pods are not running"
        fi
    fi
    
    if [ "$ollama_pods" -gt 0 ]; then
        local ollama_running=$(oc get pods -n $NAMESPACE -l app=ollama -o jsonpath='{.items[*].status.phase}' 2>/dev/null | grep -c "Running" || echo "0")
        log_info "Ollama running: $ollama_running/$ollama_pods"
        
        if [ "$ollama_running" -eq "$ollama_pods" ]; then
            log_success "All ollama pods are running"
        else
            log_warning "Some ollama pods are not running"
        fi
    fi
}

# Show troubleshooting tips
show_troubleshooting() {
    echo ""
    log_info "Troubleshooting Tips:"
    echo "========================"
    echo ""
    echo "If you see SSL warnings in browser:"
    echo "  1. Run: ./setup-ssl.sh to extract and import the certificate"
    echo "  2. Or accept the risk in browser (Advanced → Proceed to unsafe)"
    echo ""
    echo "If chess pieces don't appear:"
    echo "  1. Clear browser cache and reload"
    echo "  2. Check browser console for JavaScript errors"
    echo "  3. Verify API is returning data: https://your-url/board"
    echo ""
    echo "If 'Error connecting to server':"
    echo "  1. Check if certificate is properly imported"
    echo "  2. Try HTTP URL: http://your-url"
    echo "  3. Check application logs: oc logs -f deployment/chess-app -n $NAMESPACE"
    echo ""
}

# Main function
main() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  SSL Verification - LLM Chess Bot${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    # Pre-flight checks
    check_oc
    
    # Verify SSL
    verify_app_ssl
    echo ""
    
    # Check pods
    check_app_pods
    echo ""
    
    # Show troubleshooting
    show_troubleshooting
    
    echo ""
    log_success "SSL verification complete!"
}

# Run main function
main "$@"

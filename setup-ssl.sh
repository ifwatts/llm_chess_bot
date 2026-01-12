#!/bin/bash

# SSL Certificate Setup Script for LLM Chess Bot
# This script extracts and configures SSL certificates for the OpenShift deployment

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
CERT_FILE="llm-chess-bot-router-cert.crt"

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

# Extract router certificate
extract_router_cert() {
    log_info "Extracting router certificate for browser import..."
    
    local cert_extracted=false
    
    # Try different certificate secrets in openshift-ingress
    for secret_name in "router-certs-default" "router-ca" "router-metrics-certs-default"; do
        if oc get secret $secret_name -n openshift-ingress &> /dev/null; then
            log_info "Found certificate secret: $secret_name"
            
            # Extract certificate to a file
            oc get secret $secret_name -n openshift-ingress -o jsonpath='{.data.tls\.crt}' | \
                base64 -d > "$CERT_FILE" 2>/dev/null
            
            if [ -f "$CERT_FILE" ] && [ -s "$CERT_FILE" ]; then
                log_success "Certificate saved to: $CERT_FILE"
                cert_extracted=true
                
                # Verify certificate
                if openssl x509 -in "$CERT_FILE" -checkend 0 -noout 2>/dev/null; then
                    log_info "Certificate is valid"
                    break
                else
                    log_warning "Certificate is invalid or expired"
                    rm -f "$CERT_FILE"
                fi
            fi
        fi
    done
    
    # Try alternative certificate locations
    if [ "$cert_extracted" = false ]; then
        for ns in "openshift-config openshift-master default"; do
            for secret_name in "router-certs-default" "router-ca" "router-metrics-certs-default"; do
                if oc get secret $secret_name -n $ns &> /dev/null; then
                    log_info "Found certificate in namespace: $ns"
                    oc get secret $secret_name -n $ns -o jsonpath='{.data.tls\.crt}' | \
                        base64 -d > "$CERT_FILE" 2>/dev/null
                    
                    if [ -f "$CERT_FILE" ] && [ -s "$CERT_FILE" ]; then
                        log_success "Certificate saved to: $CERT_FILE"
                        cert_extracted=true
                        break 2
                    fi
                fi
            done
        done
    fi
    
    if [ "$cert_extracted" = false ]; then
        log_error "No router certificate found"
        return 1
    fi
    
    return 0
}

# Show certificate details
show_cert_details() {
    if [ ! -f "$CERT_FILE" ]; then
        log_error "Certificate file not found: $CERT_FILE"
        return 1
    fi
    
    log_info "Certificate Details:"
    echo "================================"
    openssl x509 -in "$CERT_FILE" -noout -text | grep -E "(Subject:|Issuer:|Not Before:|Not After:|DNS:)" | sed 's/^/  /'
    echo "================================"
    echo ""
}

# Show import instructions
show_import_instructions() {
    local app_url=$(oc get route $APP_NAME -n $NAMESPACE -o jsonpath='{.spec.host}' 2>/dev/null || echo "")
    
    if [ -n "$app_url" ]; then
        echo "Browser Certificate Import Instructions:"
        echo "========================================"
        echo ""
        echo "Application URL: https://$app_url"
        echo "Certificate File: $CERT_FILE"
        echo ""
        echo "Chrome/Edge:"
        echo "  1. Settings → Privacy and security → Manage certificates"
        echo "  2. Click 'Import' → Browse files"
        echo "  3. Select: $CERT_FILE"
        echo "  4. Trust level: 'Trusted Root Certification Authorities'"
        echo "  5. Restart browser"
        echo ""
        echo "Firefox:"
        echo "  1. Settings → Privacy & Security → Certificates"
        echo "  2. Click 'View Certificates' → Import"
        echo "  3. Select: $CERT_FILE"
        echo "  4. Trust: 'Trust this CA to identify websites'"
        echo "  5. Restart browser"
        echo ""
        echo "Safari (macOS):"
        echo "  1. Keychain Access → Certificate Assistant → Import"
        echo "  2. Select: $CERT_FILE"
        echo "  3. Keychain: System"
        echo "  4. Trust: 'Always Trust'"
        echo "  5. Restart browser"
        echo ""
        echo "Alternative (Quick Fix):"
        echo "  1. Open: https://$app_url"
        echo "  2. Click 'Advanced' when SSL warning appears"
        echo "  3. Click 'Proceed to $app_url (unsafe)'"
        echo ""
    fi
}

# Verify certificate is working
verify_cert() {
    local app_url=$(oc get route $APP_NAME -n $NAMESPACE -o jsonpath='{.spec.host}' 2>/dev/null || echo "")
    
    if [ -n "$app_url" ]; then
        log_info "Verifying certificate for: https://$app_url"
        
        # Check if certificate matches the domain
        if openssl s_client -connect "$app_url:443" -servername "$app_url" < /dev/null 2>/dev/null | \
           openssl x509 -noout -checkend 0 2>/dev/null; then
            log_success "Certificate is valid for $app_url"
        else
            log_warning "Certificate validation failed"
        fi
    fi
}

# Create a PKCS12 file for easier import (optional)
create_p12_cert() {
    if [ ! -f "$CERT_FILE" ]; then
        log_error "Certificate file not found: $CERT_FILE"
        return 1
    fi
    
    local p12_file="llm-chess-bot-router-cert.p12"
    
    log_info "Creating PKCS12 certificate file: $p12_file"
    
    # Extract private key if available
    local key_file="temp-key.key"
    oc get secret router-certs-default -n openshift-ingress -o jsonpath='{.data.tls\.key}' | \
        base64 -d > "$key_file" 2>/dev/null || true
    
    if [ -f "$key_file" ]; then
        openssl pkcs12 -export -out "$p12_file" -inkey "$key_file" -in "$CERT_FILE" \
            -name "LLM Chess Bot Router" -passout pass: 2>/dev/null || true
        rm -f "$key_file"
        
        if [ -f "$p12_file" ]; then
            log_success "PKCS12 file created: $p12_file"
            echo "This file can be imported directly into some browsers"
        fi
    else
        log_warning "Private key not available, cannot create PKCS12 file"
    fi
}

# Main function
main() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  SSL Certificate Setup - LLM Chess Bot${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    # Pre-flight checks
    check_oc
    
    # Extract certificate
    if extract_router_cert; then
        echo ""
        show_cert_details
        echo ""
        show_import_instructions
        echo ""
        
        # Optional: Create PKCS12 file
        read -p "Create PKCS12 certificate file for easier import? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            create_p12_cert
        fi
        
        echo ""
        verify_cert
        echo ""
        
        log_success "SSL certificate setup complete!"
        log_info "Next steps:"
        echo "  1. Import the certificate into your browser"
        echo "  2. Restart your browser"
        echo "  3. Visit the application URL"
    else
        log_error "Failed to extract SSL certificate"
        exit 1
    fi
}

# Run main function
main "$@"

# SSL Certificate Setup for LLM Chess Bot

This guide explains how to configure SSL certificates for the LLM Chess Bot deployment on OpenShift to resolve browser security warnings.

## Overview

The LLM Chess Bot uses OpenShift's default router certificates, which are self-signed. This causes browsers to show security warnings when accessing the application. The solution is to extract the router certificate and import it into your browser's trust store.

## Quick Setup

### Method 1: Automated Setup (Recommended)

Run the SSL setup script:

```bash
./setup-ssl.sh
```

This script will:
- Extract the router certificate from OpenShift
- Verify the certificate is valid
- Display detailed import instructions for your browser
- Optionally create a PKCS12 file for easier import

### Method 2: Manual Setup

1. **Extract the certificate manually:**
   ```bash
   oc get secret router-certs-default -n openshift-ingress -o jsonpath='{.data.tls\.crt}' | base64 -d > llm-chess-bot-router-cert.crt
   ```

2. **Import the certificate into your browser** (see browser-specific instructions below)

## Browser Import Instructions

### Chrome / Edge

1. Go to Settings → Privacy and security → Manage certificates
2. Click "Import" → Browse files
3. Select: `llm-chess-bot-router-cert.crt`
4. Trust level: "Trusted Root Certification Authorities"
5. Restart browser

### Firefox

1. Go to Settings → Privacy & Security → Certificates
2. Click "View Certificates" → Import
3. Select: `llm-chess-bot-router-cert.crt`
4. Trust: "Trust this CA to identify websites"
5. Restart browser

### Safari (macOS)

1. Open Keychain Access
2. Go to Certificate Assistant → Import
3. Select: `llm-chess-bot-router-cert.crt`
4. Keychain: System
5. Trust: "Always Trust"
6. Restart browser

## Alternative Solutions

### Accept Risk (Quick Fix)

If you don't want to import certificates:

1. Open the application URL
2. When SSL warning appears, click "Advanced"
3. Click "Proceed to [URL] (unsafe)"

### Use HTTP (Temporary)

Use HTTP instead of HTTPS:
```
http://chess-app-llm-chess-bot.apps.aiops-dev-prod.cp.fyre.ibm.com
```

## Verification

After setting up SSL, verify the configuration:

```bash
./verify-ssl.sh
```

This script will:
- Check SSL certificate validity
- Test API connectivity
- Verify application pods are running
- Show troubleshooting tips

## Troubleshooting

### "Error connecting to server" in the app

1. **Check certificate import**: Ensure the certificate is properly imported
2. **Clear browser cache**: Clear cache and reload the page
3. **Try HTTP**: Use the HTTP URL as a workaround
4. **Check logs**: `oc logs -f deployment/chess-app -n llm-chess-bot`

### Chess pieces not showing

1. **Browser refresh**: Hard refresh (Ctrl+F5 or Cmd+Shift+R)
2. **Check console**: Look for JavaScript errors in browser console
3. **Verify API**: Check if `/board` endpoint returns data
4. **Clear cache**: Clear browser cache and cookies

### Certificate issues

1. **Expired certificate**: The router certificate expires on Jan 5, 2028
2. **Wrong certificate**: Ensure you're importing the router certificate, not a service certificate
3. **Trust level**: Make sure to set the correct trust level in your browser

## File Locations

- **Certificate file**: `llm-chess-bot-router-cert.crt`
- **Setup script**: `./setup-ssl.sh`
- **Verification script**: `./verify-ssl.sh`
- **Main deployment**: `./deploy-ocp.sh`

## Security Notes

- The router certificate is self-signed and specific to your OpenShift cluster
- Importing the certificate only trusts your cluster's router, not all certificates
- This is safe for development and testing environments
- For production, consider using proper certificates from a trusted CA

## Support

If you encounter issues:

1. Run the verification script: `./verify-ssl.sh`
2. Check application logs: `oc logs -f deployment/chess-app -n llm-chess-bot`
3. Verify pod status: `oc get pods -n llm-chess-bot`
4. Check route status: `oc get routes -n llm-chess-bot`

The SSL setup scripts provide detailed error messages and troubleshooting guidance for common issues.

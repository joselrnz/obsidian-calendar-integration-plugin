# Deploy script for Calendar Integration plugin
# Copies built files to Obsidian vault

$VAULT_PATH = "C:\Users\josel\OneDrive\Documents\joselrnz\.obsidian\plugins\google-calendar-plugin"

Write-Host "Deploying Calendar Integration plugin..." -ForegroundColor Cyan

# Check if vault path exists
if (-not (Test-Path $VAULT_PATH)) {
    Write-Host "ERROR: Vault path not found: $VAULT_PATH" -ForegroundColor Red
    exit 1
}

# Copy main.js
Write-Host "Copying main.js..." -ForegroundColor Yellow
Copy-Item -Path "main.js" -Destination "$VAULT_PATH\main.js" -Force

# Copy styles.css
Write-Host "Copying styles.css..." -ForegroundColor Yellow
Copy-Item -Path "styles.css" -Destination "$VAULT_PATH\styles.css" -Force

# Copy manifest.json
Write-Host "Copying manifest.json..." -ForegroundColor Yellow
Copy-Item -Path "manifest.json" -Destination "$VAULT_PATH\manifest.json" -Force

Write-Host "SUCCESS: Deployment complete!" -ForegroundColor Green
Write-Host "Now reload Obsidian (Ctrl+R) to see the changes" -ForegroundColor Cyan


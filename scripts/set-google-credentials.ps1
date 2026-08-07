<#
Set-GoogleCredentials.ps1

Usage:
  - Interactive: run the script and it will prompt for the path to the service account JSON.
  - Non-interactive: pass the path as the first parameter: `.	ools\set-google-credentials.ps1 'C:\path\to\service-account.json'`

This script calls `setx` to persist the `GOOGLE_APPLICATION_CREDENTIALS` environment variable
for your Windows user and sets it in the current PowerShell session. You still need to restart
any running Node/Next process (or open a new terminal) for the change to take effect.

Important: Do NOT commit your service account JSON to source control. Keep it outside the repo.
#>

param(
    [string]$ServiceAccountPath
)

if (-not $ServiceAccountPath) {
    $ServiceAccountPath = Read-Host -Prompt "Enter the full path to your service-account.json"
}

if (-not (Test-Path -Path $ServiceAccountPath)) {
    Write-Error "File not found: $ServiceAccountPath"
    exit 2
}

Write-Host "Setting GOOGLE_APPLICATION_CREDENTIALS to: $ServiceAccountPath"

# Persist for the current user
setx GOOGLE_APPLICATION_CREDENTIALS "$ServiceAccountPath" | Out-Null

# Also set for current session
$env:GOOGLE_APPLICATION_CREDENTIALS = $ServiceAccountPath

Write-Host "Environment variable set for current session and persisted to user environment." -ForegroundColor Green
Write-Host "Restart your terminal or any running Node/Next process to pick up the new environment variable." -ForegroundColor Yellow

Write-Host "You can verify with:" -ForegroundColor Cyan
Write-Host "  echo $env:GOOGLE_APPLICATION_CREDENTIALS" -ForegroundColor Cyan
Write-Host "Or run the provided npm script:" -ForegroundColor Cyan
Write-Host "  npm run check:fadmin" -ForegroundColor Cyan

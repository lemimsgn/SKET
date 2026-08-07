# Firebase Admin setup (Option A)

This project requires the Firebase Admin SDK to be initialized on the server for admin endpoints to work.

Recommended: use Option A (service account file) for local development.

1) Obtain a Firebase service account JSON from the Firebase Console → Project Settings → Service accounts.

2) Place the file somewhere outside your repository, e.g. `C:\secrets\sket-service-account.json`.

3) Set the environment variable for your user (PowerShell):

```powershell
# Persist for current user (will apply to new shells)
setx GOOGLE_APPLICATION_CREDENTIALS "C:\secrets\sket-service-account.json"

# For the current PowerShell session (immediate)
$env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\secrets\sket-service-account.json'

# Verify
echo $env:GOOGLE_APPLICATION_CREDENTIALS

# Run the credential checker
npm run check:fadmin
```

Or run the helper script included in `scripts/set-google-credentials.ps1` which will prompt for the path and call `setx`.

4) Restart your terminal and restart Next.js (development or production) so the process picks up the new env var.

5) Confirm the admin SDK is initialized by checking server logs or by running:

```powershell
npm run check:fadmin
```

If you want, provide the full path here and I can run the helper script to set it for you in the current session.

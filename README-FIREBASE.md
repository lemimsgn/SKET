Firebase: Seeding and Admin Approval Scripts
===========================================

This project includes helper scripts you can run locally using a Firebase service account to:

- Seed sample `users`, `withdrawRequests`, and `walletTransactions` documents.
- Approve or reject withdraw requests transactionally (deduct balance and write transaction).

Prerequisites
-------------

- A Firebase project (you already signed in to the console).
- A service account JSON key for your Firebase project. Save it locally and do NOT commit it to source control.
- Node.js installed.

Install
-------

From the project root:

```bash
npm install firebase-admin
```

Seeding sample data
-------------------

```bash
# Option A: point GOOGLE_APPLICATION_CREDENTIALS env var to your key
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
node scripts/seedFirestore.js

# Option B: pass the key path as first arg (Windows PowerShell example)
node scripts/seedFirestore.js C:\path\to\key.json
```

Approving or rejecting a withdraw request
----------------------------------------

```bash
# Approve (transactionally updates balance and creates a walletTransactions record)
node scripts/approveWithdraw.js [serviceKey.json] <withdrawRequestId> approve

# Reject
node scripts/approveWithdraw.js [serviceKey.json] <withdrawRequestId> reject
```

Notes
-----
- These scripts use the Admin SDK and must run from a trusted environment — typically your machine or a trusted backend/Cloud Function.
- For production, convert `approveWithdraw` into a Cloud Function (HTTPS callable or an authenticated admin console) so admins can approve from the web without sharing service keys.

Firebase web client env vars
---------------------------
For local development, create a `.env.local` file with your Firebase web app settings. At minimum, the admin login page requires:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

Optional but recommended:

```bash
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
```

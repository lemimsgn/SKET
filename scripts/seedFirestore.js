/**
 * Seed sample Firestore documents for users, withdrawRequests and walletTransactions.
 *
 * Usage:
 *   Set `GOOGLE_APPLICATION_CREDENTIALS` to your service account JSON path, or
 *   pass the path as the first argument.
 *
 *   node scripts/seedFirestore.js [serviceAccountPath]
 */

const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

async function main() {
  const argPath = process.argv[2];
  if (argPath) process.env.GOOGLE_APPLICATION_CREDENTIALS = argPath;

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Please set GOOGLE_APPLICATION_CREDENTIALS or pass the key path as first arg.');
    process.exit(1);
  }

  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  admin.initializeApp({ credential: admin.cert(require(credentialPath)) });
  const db = getFirestore();

  // Sample users
  const users = [
    {
      uid: 'user_pending_1',
      firstName: 'Pending',
      lastName: 'User',
      phone: '0000000001',
      status: 'pending',
      role: 'user',
      walletBalance: 0,
      registrationFee: 3000,
    },
    {
      uid: 'user_approved_1',
      firstName: 'Alice',
      lastName: 'Approved',
      phone: '0000000002',
      status: 'approved',
      role: 'user',
      walletBalance: 5000,
      registrationFee: 3000,
      approvedAt: FieldValue.serverTimestamp(),
    },
  ];

  for (const u of users) {
    const ref = db.collection('users').doc(u.uid);
    await ref.set(u, { merge: true });
    console.log('Wrote user', u.uid);
  }

  // Create a withdraw request for the approved user
  const withdrawRef = db.collection('withdrawRequests').doc();
  const withdraw = {
    userId: 'user_approved_1',
    fullName: 'Alice Approved',
    phone: '0000000002',
    amount: 2000,
    bankName: 'Example Bank',
    accountNumber: '12345678',
    walletBalance: 5000,
    status: 'pending',
    requestedAt: FieldValue.serverTimestamp(),
  };
  await withdrawRef.set(withdraw);
  console.log('Created withdraw request', withdrawRef.id);

  // Create an initial wallet transaction for the approved user (deposit)
  const txRef = db.collection('walletTransactions').doc();
  await txRef.set({
    userId: 'user_approved_1',
    type: 'deposit',
    amount: 5000,
    balanceAfter: 5000,
    referenceId: null,
    createdAt: FieldValue.serverTimestamp(),
    note: 'seed deposit',
  });
  console.log('Created wallet transaction', txRef.id);

  console.log('Seeding complete');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

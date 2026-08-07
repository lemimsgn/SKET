/**
 * Approve or reject a withdraw request transactionally.
 *
 * Usage:
 *   node scripts/approveWithdraw.js <withdrawRequestId> approve
 *   node scripts/approveWithdraw.js <withdrawRequestId> reject
 *
 * Requires `GOOGLE_APPLICATION_CREDENTIALS` or pass the key path as first arg.
 */

const admin = require('firebase-admin');

async function main() {
  const [maybeKey, reqId, action] = process.argv.slice(2);
  // allow passing key path optionally
  if (!reqId) {
    if (maybeKey && maybeKey.endsWith('.json') && process.argv[3]) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = maybeKey;
    }
  }

  const args = process.argv.slice(2);
  let withdrawId;
  let act;
  if (args.length === 2) {
    withdrawId = args[0];
    act = args[1];
  } else if (args.length === 3) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = args[0];
    withdrawId = args[1];
    act = args[2];
  } else {
    console.error('Usage: node scripts/approveWithdraw.js [serviceKey.json] <withdrawId> <approve|reject>');
    process.exit(1);
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Please set GOOGLE_APPLICATION_CREDENTIALS or pass service key path as first arg.');
    process.exit(1);
  }

  admin.initializeApp({ credential: admin.credential.applicationDefault() });
  const db = admin.firestore();

  const wrRef = db.collection('withdrawRequests').doc(withdrawId);

  await db.runTransaction(async (tx) => {
    const wrSnap = await tx.get(wrRef);
    if (!wrSnap.exists) throw new Error('Withdraw request not found');
    const wr = wrSnap.data();
    if (wr.status !== 'pending') throw new Error('Withdraw request not pending');

    const userRef = db.collection('users').doc(wr.userId);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new Error('User not found');
    const user = userSnap.data();

    if (act === 'approve') {
      if ((user.walletBalance || 0) < wr.amount) throw new Error('Insufficient balance');
      const newBalance = (user.walletBalance || 0) - wr.amount;

      tx.update(userRef, { walletBalance: newBalance });

      const txRef = db.collection('walletTransactions').doc();
      tx.set(txRef, {
        userId: wr.userId,
        type: 'withdrawal',
        amount: wr.amount,
        balanceAfter: newBalance,
        referenceId: withdrawId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        note: 'withdraw approved',
      });

      tx.update(wrRef, { status: 'approved', approvedAt: admin.firestore.FieldValue.serverTimestamp() });
      console.log('Withdraw approved; balance updated.');
    } else if (act === 'reject' || act === 'rejected') {
      tx.update(wrRef, { status: 'rejected', approvedAt: null });
      console.log('Withdraw rejected.');
    } else {
      throw new Error('Unknown action: ' + act);
    }
  });

  console.log('Transaction complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

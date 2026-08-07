const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { uid: null, email: null };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--uid' || arg === '-u') {
      result.uid = args[i + 1];
      i += 1;
    } else if (arg === '--email' || arg === '-e') {
      result.email = args[i + 1];
      i += 1;
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(1);
    }
  }

  if (!result.uid && !result.email) {
    console.error('Usage: node scripts/promoteFirstAdmin.js --uid <UID> [--email <email>]');
    console.error('       node scripts/promoteFirstAdmin.js --email <email>');
    process.exit(1);
  }

  return result;
}

function parseEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    throw new Error(`.env.local not found at ${envPath}`);
  }

  const envText = fs.readFileSync(envPath, 'utf8');
  return envText.split(/\r?\n/).reduce((acc, line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      acc[match[1]] = match[2];
    }
    return acc;
  }, {});
}

async function main() {
  const { uid: inputUid, email: inputEmail } = parseArgs();
  const env = parseEnvFile(path.resolve(__dirname, '..', '.env.local'));
  const base64 = env.FIREBASE_ADMIN_SDK_BASE64;

  if (!base64) {
    throw new Error('FIREBASE_ADMIN_SDK_BASE64 is missing from .env.local');
  }

  const serviceAccount = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
  initializeApp({ credential: cert(serviceAccount) });
  const auth = getAuth();
  const db = getFirestore();

  let adminUid = inputUid;
  let adminEmail = inputEmail;

  if (!adminUid) {
    if (!adminEmail) {
      throw new Error('Either --uid or --email must be provided.');
    }
    const userRecord = await auth.getUserByEmail(adminEmail);
    adminUid = userRecord.uid;
  }

  if (!adminUid) {
    throw new Error('Unable to determine admin UID.');
  }

  if (!adminEmail) {
    try {
      const userRecord = await auth.getUser(adminUid);
      adminEmail = userRecord.email || 'unknown@example.com';
    } catch (error) {
      adminEmail = 'unknown@example.com';
    }
  }

  console.log(`Promoting admin UID: ${adminUid} (${adminEmail})`);

  await auth.setCustomUserClaims(adminUid, { admin: true, role: 'admin' });
  await db.collection('users').doc(adminUid).set(
    {
      uid: adminUid,
      email: adminEmail,
      role: 'admin',
      updatedAt: new Date(),
    },
    { merge: true }
  );

  console.log(`Promoted ${adminEmail} (uid: ${adminUid}) to admin.`);
  console.log('Sign out and sign back in so the updated custom claim appears in the ID token.');
}

main().catch((error) => {
  console.error('Failed to promote admin:', error);
  process.exit(1);
});

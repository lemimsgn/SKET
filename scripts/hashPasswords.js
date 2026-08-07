/**
 * Migrate existing Firestore passwords to bcrypt hashes.
 *
 * Usage:
 *   Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path,
 *   or pass the key path as the first argument.
 *
 *   node scripts/hashPasswords.js [serviceAccountPath]
 */

const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const bcrypt = require("bcryptjs");
const fs = require("fs");

async function initAdmin() {
  const argPath = process.argv[2];
  if (argPath) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = argPath;
  }

  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialPath) {
    console.error("Please set GOOGLE_APPLICATION_CREDENTIALS or pass the key path as the first arg.");
    process.exit(1);
  }

  if (!fs.existsSync(credentialPath)) {
    console.error(`Service account file not found: ${credentialPath}`);
    process.exit(1);
  }

  admin.initializeApp({ credential: admin.cert(require(credentialPath)) });
  return getFirestore();
}

const BCRYPT_PATTERN = /^\$2[aby]\$/;

async function migrateCollection(db, collectionName) {
  console.log(`Scanning collection: ${collectionName}`);
  const snapshot = await db.collection(collectionName).get();
  let updatedCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const password = String(data.password || "").trim();
    if (!password) continue;
    if (BCRYPT_PATTERN.test(password)) continue;

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.collection(collectionName).doc(doc.id).update({ password: hashedPassword });
    updatedCount += 1;
    console.log(`Hashed password for ${collectionName}/${doc.id}`);
  }

  console.log(`Updated ${updatedCount} document(s) in ${collectionName}.`);
  return updatedCount;
}

async function main() {
  const db = await initAdmin();
  const collections = ["users", "admins"];
  let total = 0;

  for (const collectionName of collections) {
    try {
      total += await migrateCollection(db, collectionName);
    } catch (error) {
      console.error(`Failed to migrate ${collectionName}:`, error);
    }
  }

  console.log(`Password migration complete. Total updated: ${total}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

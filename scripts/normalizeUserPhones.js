const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

async function main() {
  const argPath = process.argv[2];
  if (argPath) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = argPath;
  }

  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialPath) {
    console.error("Please set GOOGLE_APPLICATION_CREDENTIALS or pass the service account path as the first argument.");
    process.exit(1);
  }

  if (!fs.existsSync(credentialPath)) {
    console.error(`Service account path does not exist: ${credentialPath}`);
    process.exit(1);
  }

  admin.initializeApp({ credential: admin.cert(require(path.resolve(credentialPath))) });
  const { getFirestore } = require('firebase-admin/firestore');
  const db = getFirestore();

  console.log("Starting user phone normalization...");
  const usersSnapshot = await db.collection("users").get();
  console.log(`Found ${usersSnapshot.size} user documents.`);

  let updatedCount = 0;
  for (const userDoc of usersSnapshot.docs) {
    const data = userDoc.data();
    const phoneField = String(data.phone || "").trim();
    const docId = userDoc.id;

    if (!phoneField) {
      if (/^(09|07)\d{8}$/.test(docId)) {
        await userDoc.ref.update({ phone: docId });
        updatedCount += 1;
        console.log(`Updated missing phone field for doc ${docId}`);
      } else {
        console.warn(`Skipping doc ${docId}: no phone field and id is not valid phone format.`);
      }
      continue;
    }

    if (phoneField !== docId) {
      console.log(`Doc ${docId}: phone field differs (${phoneField}). Keeping both values.`);
      updatedCount += 1;
      await userDoc.ref.update({ phone: phoneField });
    }
  }

  console.log(`Normalization complete. Updated ${updatedCount} documents.`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Normalization failed:", error);
  process.exit(1);
});
/**
 * Set Firebase custom claims for an admin user.
 *
 * Usage:
 *   node scripts/setAdminClaim.js <uid>
 *   node scripts/setAdminClaim.js <serviceAccountPath> <uid>
 *
 * Requirements:
 *   - A Firebase service account JSON key
 *   - Either set GOOGLE_APPLICATION_CREDENTIALS or pass the JSON file path
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const fs = require("fs");
const path = require("path");

function printUsage() {
  console.error("Usage: node scripts/setAdminClaim.js <uid>");
  console.error("       node scripts/setAdminClaim.js <serviceAccountPath> <uid>");
  process.exit(1);
}

function getCredentials() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.length > 2) {
    printUsage();
  }

  let uid;
  let keyPath;

  if (args.length === 1) {
    uid = args[0];
  } else {
    if (args[0].endsWith(".json") && !args[1].endsWith(".json")) {
      keyPath = args[0];
      uid = args[1];
    } else if (args[1].endsWith(".json") && !args[0].endsWith(".json")) {
      uid = args[0];
      keyPath = args[1];
    } else {
      printUsage();
    }
  }

  if (keyPath) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;
  }

  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialPath) {
    console.error("Please set GOOGLE_APPLICATION_CREDENTIALS or pass the key path as the first argument.");
    process.exit(1);
  }

  const resolvedPath = path.resolve(credentialPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Service account file not found: ${resolvedPath}`);
    process.exit(1);
  }

  return { uid, resolvedPath };
}

async function main() {
  const { uid, resolvedPath } = getCredentials();
  const app = initializeApp({ credential: cert(require(resolvedPath)) });
  const auth = getAuth(app);

  try {
    await auth.setCustomUserClaims(uid, { admin: true, role: "admin" });
    console.log(`Custom claims set for UID ${uid}.`);
    console.log("Sign out and sign back in with that user so the token refreshes.");
  } catch (error) {
    console.error("Failed to set custom claims:", error);
    process.exit(1);
  }
}

main();

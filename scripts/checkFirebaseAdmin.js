const { existsSync } = require('fs');

function hasBase64Key() {
  return !!process.env.FIREBASE_ADMIN_SDK_BASE64 && process.env.FIREBASE_ADMIN_SDK_BASE64.length > 20;
}

function hasServiceAccountPath() {
  const p = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  return !!p && existsSync(p);
}

function printStatus() {
  console.log('Firebase Admin check (safe, no secrets will be printed)');
  if (hasBase64Key()) {
    console.log('- FIREBASE_ADMIN_SDK_BASE64: present (base64 value detected)');
  } else if (process.env.FIREBASE_ADMIN_SDK_BASE64) {
    console.log('- FIREBASE_ADMIN_SDK_BASE64: present but appears too short');
  } else {
    console.log('- FIREBASE_ADMIN_SDK_BASE64: not present');
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(`- GOOGLE_APPLICATION_CREDENTIALS set to: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
    console.log(`  - file exists: ${hasServiceAccountPath() ? 'yes' : 'no'}`);
  } else {
    console.log('- GOOGLE_APPLICATION_CREDENTIALS: not set');
  }

  // Application Default Credentials can't be reliably tested here without contacting GCP,
  // so only give guidance when neither credential source is configured.
  if (!hasBase64Key() && !hasServiceAccountPath()) {
    console.warn('\nNo Firebase Admin credentials were found. The server will fail to initialize the Admin SDK.');
    console.warn('Options:');
    console.warn('  1) Set GOOGLE_APPLICATION_CREDENTIALS to a local service account JSON file path.');
    console.warn('  2) Set FIREBASE_ADMIN_SDK_BASE64 to the base64-encoded JSON service account.');
    console.warn('  3) On GCP, ensure Application Default Credentials (ADC) are available.');
    process.exitCode = 2;
  } else {
    console.log('\nLooks like at least one credential source is configured.');
    console.log('Next step: start the server and check logs for any initialization errors.');
  }
}

printStatus();

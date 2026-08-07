const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  raw.split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Za-z0-9_]+)=(.*)$/);
    if (!m) return;
    const key = m[1];
    let val = m[2] || '';
    // remove surrounding quotes
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[key] = val;
  });
}

function httpJson(options, body) {
  return new Promise((resolve, reject) => {
    const opts = Object.assign({}, options);
    const req = (opts.protocol === 'https:' ? https : http).request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: data });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  loadEnv();
  const projectRoot = path.join(__dirname, '..');
  const svcPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? path.resolve(projectRoot, process.env.GOOGLE_APPLICATION_CREDENTIALS)
    : null;

  if (!svcPath || !fs.existsSync(svcPath)) {
    console.error('Service account not found:', svcPath);
    process.exit(1);
  }

  admin.initializeApp({ credential: admin.cert(require(svcPath)) });
  const { getFirestore } = require('firebase-admin/firestore');
  const db = getFirestore();

  // Setup test users
  const senderPhone = '0999000001';
  const recipientPhone = '0999000002';
  const password = 'password123';

  const senderRef = db.collection('users').doc(senderPhone);
  const recipientRef = db.collection('users').doc(recipientPhone);

  await senderRef.set({
    uid: senderPhone,
    firstName: 'E2ESender',
    lastName: 'Test',
    phone: senderPhone,
    password: password,
    walletBalance: 1000,
    notifications: [],
    role: 'user',
    status: 'approved',
    createdAt: new Date()
  }, { merge: true });

  await recipientRef.set({
    uid: recipientPhone,
    firstName: 'E2ERecipient',
    lastName: 'Test',
    phone: recipientPhone,
    password: password,
    walletBalance: 0,
    notifications: [],
    role: 'user',
    status: 'approved',
    createdAt: new Date()
  }, { merge: true });

  console.log('Prepared users. Logging in as sender...');

  const host = 'localhost';
  const port = 3005;

  // Login
  const loginRes = await httpJson({ hostname: host, port, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { phone: senderPhone, password });
  console.log('Login status', loginRes.status);
  console.log('Login body', loginRes.body);
  const setCookie = (loginRes.headers['set-cookie'] || loginRes.headers['set-cookie'.toLowerCase()]);
  if (!setCookie) {
    console.error('No Set-Cookie received from login; cannot proceed.');
    process.exit(2);
  }
  // find sket-session cookie
  const cookieHeader = Array.isArray(setCookie) ? setCookie.map(c => c.split(';')[0]).join('; ') : setCookie.split(';')[0];
  console.log('Got cookie header:', cookieHeader);

  // Transfer endpoint removed.
  console.log('Skipping transfer test because /api/transfer has been removed.');

  process.exit(0);
}

main().catch(e => { console.error('E2E script error:', e); process.exit(1); });

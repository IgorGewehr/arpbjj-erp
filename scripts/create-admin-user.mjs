#!/usr/bin/env node
/**
 * Creates a Firebase Auth user and wires up full admin access to an academy.
 * Usage: node scripts/create-admin-user.mjs <email> <password> <academyId>
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serviceAccount = JSON.parse(
  readFileSync(resolve(__dirname, 'serviceAccountKey.json'), 'utf8')
);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const [, , email, password, academyId] = process.argv;
if (!email || !password || !academyId) {
  console.error('Usage: node create-admin-user.mjs <email> <password> <academyId>');
  process.exit(1);
}

const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();

// 1. Create or fetch Auth user
let uid;
try {
  const existing = await admin.auth().getUserByEmail(email);
  uid = existing.uid;
  await admin.auth().updateUser(uid, { password });
  console.log(`Auth: user already exists, updated password. uid=${uid}`);
} catch (err) {
  if (err.code === 'auth/user-not-found') {
    const created = await admin.auth().createUser({ email, password });
    uid = created.uid;
    console.log(`Auth: created new user. uid=${uid}`);
  } else {
    throw err;
  }
}

// 2. /users/{uid} — global profile
await db.doc(`users/${uid}`).set(
  { email, createdAt: now, updatedAt: now },
  { merge: true }
);
console.log(`Firestore: /users/${uid} ✓`);

// 3. /userAcademyMapping/{uid} — fonte primária de permissões
await db.doc(`userAcademyMapping/${uid}`).set(
  {
    academyIds: admin.firestore.FieldValue.arrayUnion(academyId),
    primaryAcademyId: academyId,
    academyDetails: {
      [academyId]: {
        role: 'admin',
        joinedAt: now,
        status: 'active',
      },
    },
    updatedAt: now,
  },
  { merge: true }
);
console.log(`Firestore: /userAcademyMapping/${uid} ✓`);

// 4. /academies/{academyId}/users/{uid} — fallback
await db.doc(`academies/${academyId}/users/${uid}`).set(
  { role: 'admin', email, createdAt: now, updatedAt: now },
  { merge: true }
);
console.log(`Firestore: /academies/${academyId}/users/${uid} ✓`);

console.log(`\nDone! User ${email} is now admin of academy ${academyId}`);
console.log(`UID: ${uid}`);

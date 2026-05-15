#!/usr/bin/env node
/**
 * Seed (or refresh) the /academies/{academyId}/public/info doc with
 * institutional fields safe for anonymous reads (used by the public site).
 *
 * Reads the canonical /academies/{academyId} doc and copies a curated
 * subset of fields into the public subcollection. Idempotent: writes
 * with { merge: true } so manually-edited public fields aren't wiped.
 *
 * Usage:
 *   node scripts/seed-academy-public-info.mjs <academyId>
 *
 * Example:
 *   node scripts/seed-academy-public-info.mjs academia-principal
 *
 * Credentials (same pattern as discover-academy.mjs):
 *   1. Env vars: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL,
 *      FIREBASE_ADMIN_PRIVATE_KEY (loaded from .env.local or .env if present)
 *   2. Fallback: scripts/serviceAccountKey.json
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

// Minimal .env loader (avoids adding dotenv as dep just for this script)
function loadEnvFile(p) {
  if (!existsSync(p)) return;
  const text = readFileSync(p, 'utf8');
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(resolve(ROOT, '.env.local'));
loadEnvFile(resolve(ROOT, '.env'));

const academyId = process.argv[2];
if (!academyId) {
  console.error('Usage: node scripts/seed-academy-public-info.mjs <academyId>');
  process.exit(1);
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

const serviceAccountPath = resolve(__dirname, 'serviceAccountKey.json');

if (projectId && clientEmail && privateKey) {
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
} else if (existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.error(
    `(using ${serviceAccountPath} — env vars FIREBASE_ADMIN_* not set)`
  );
} else {
  console.error(
    'Missing Firebase Admin credentials. Provide either:\n' +
      '  - env vars FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY\n' +
      '  - or scripts/serviceAccountKey.json\n' +
      'Aborting.'
  );
  process.exit(1);
}

const db = admin.firestore();

function pickFirst(...values) {
  for (const v of values) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    return v;
  }
  return undefined;
}

async function main() {
  const academyRef = db.doc(`academies/${academyId}`);
  const snap = await academyRef.get();

  if (!snap.exists) {
    console.error(`Academy not found: academies/${academyId}`);
    process.exit(2);
  }

  const doc = snap.data() || {};

  const publicInfo = {
    name: pickFirst(doc.name) ?? '',
    slogan: pickFirst(doc.portalSlogan, doc.slogan) ?? '',
    description: pickFirst(doc.description) ?? '',
    logoUrl: pickFirst(doc.logoUrl, doc.sidebarLogoUrl) ?? '',
    address: pickFirst(doc.address) ?? '',
    city: pickFirst(doc.city) ?? '',
    state: pickFirst(doc.state) ?? '',
    zipCode: pickFirst(doc.zipCode) ?? '',
    phone: pickFirst(doc.phone) ?? '',
    email: pickFirst(doc.email) ?? '',
    whatsapp: pickFirst(doc.whatsapp, doc.phone) ?? '',
    instagram: pickFirst(doc.instagram) ?? '',
    facebook: pickFirst(doc.facebook) ?? '',
    youtube: pickFirst(doc.youtube) ?? '',
    mapsUrl: pickFirst(doc.mapsUrl) ?? '',
    businessHours: Array.isArray(doc.businessHours) ? doc.businessHours : [],
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const publicRef = db.doc(`academies/${academyId}/public/info`);
  await publicRef.set(publicInfo, { merge: true });

  const populated = [];
  const empty = [];
  for (const [k, v] of Object.entries(publicInfo)) {
    if (k === 'updatedAt') continue;
    const isEmpty =
      v === '' ||
      v === null ||
      v === undefined ||
      (Array.isArray(v) && v.length === 0);
    (isEmpty ? empty : populated).push(k);
  }

  console.log(`Wrote /academies/${academyId}/public/info`);
  console.log('');
  console.log(`Populated (${populated.length}):`);
  for (const k of populated) console.log(`  - ${k}`);
  console.log('');
  console.log(`Empty (${empty.length}):`);
  for (const k of empty) console.log(`  - ${k}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });

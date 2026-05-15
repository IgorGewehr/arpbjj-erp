#!/usr/bin/env node
/**
 * Discover the academyId for the current admin user.
 *
 * Reads userAcademyMapping/<UID> and resolves each academy referenced.
 * Prints rows where the user's role for that academy is 'admin'.
 *
 * Usage:
 *   node scripts/discover-academy.mjs
 *
 * Requires env vars (loaded from .env.local or .env):
 *   FIREBASE_ADMIN_PROJECT_ID
 *   FIREBASE_ADMIN_CLIENT_EMAIL
 *   FIREBASE_ADMIN_PRIVATE_KEY
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

const ADMIN_UID = 'aMPGf6Tr4VO0tCIpDRjOyGMDNFm1';

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

const serviceAccountPath = resolve(__dirname, 'serviceAccountKey.json');

if (projectId && clientEmail && privateKey) {
  // Env-var path (production / CI style)
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
} else if (existsSync(serviceAccountPath)) {
  // Local fallback used by sibling scripts in this folder
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

async function main() {
  const mappingSnap = await db.doc(`userAcademyMapping/${ADMIN_UID}`).get();
  if (!mappingSnap.exists) {
    console.error(`No userAcademyMapping doc for UID ${ADMIN_UID}.`);
    process.exit(2);
  }

  const mapping = mappingSnap.data() || {};
  const academyIds = Array.isArray(mapping.academyIds) ? mapping.academyIds : [];
  const primaryAcademyId = mapping.primaryAcademyId;
  const academyDetails = mapping.academyDetails || {};

  if (academyIds.length === 0) {
    console.log('User has no academies in academyIds[]');
    return;
  }

  const rows = [];
  for (const id of academyIds) {
    // Source 1 (primary): academyDetails on the mapping doc
    let role = academyDetails?.[id]?.role;
    let roleSource = 'mapping.academyDetails';

    // Source 2 (fallback): academy-scoped user doc
    // CLAUDE.md says some legacy users only have role in this fallback path
    if (!role) {
      try {
        const acUserSnap = await db.doc(`academies/${id}/users/${ADMIN_UID}`).get();
        if (acUserSnap.exists) {
          role = acUserSnap.data()?.role;
          roleSource = 'academies/{id}/users/{uid}';
        }
      } catch {
        // ignore — leave role undefined
      }
    }

    if (role !== 'admin') continue;

    let name = '(no name)';
    try {
      const academySnap = await db.doc(`academies/${id}`).get();
      if (academySnap.exists) {
        name = academySnap.data()?.name || '(unnamed)';
      } else {
        name = '(missing academy doc)';
      }
    } catch (err) {
      name = `(error: ${err.message})`;
    }

    rows.push({
      academyId: id,
      name,
      role,
      roleSource,
      isPrimary: id === primaryAcademyId,
    });
  }

  if (rows.length === 0) {
    console.log(`No academies with role=admin for UID ${ADMIN_UID}.`);
    return;
  }

  console.log('academyId | name | role | primary? | roleSource');
  console.log('-'.repeat(80));
  for (const r of rows) {
    console.log(
      `${r.academyId} | ${r.name} | ${r.role} | ${r.isPrimary ? 'yes' : 'no'} | ${r.roleSource}`
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Discovery failed:', err);
    process.exit(1);
  });

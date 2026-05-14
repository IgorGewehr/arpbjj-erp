#!/usr/bin/env node
/**
 * Admin-only: set a Firebase Auth user's password by email.
 *
 * Usage:
 *   node scripts/set-user-password.mjs <email> <newPassword>
 *
 * The script resolves the email to a UID via admin.auth().getUserByEmail
 * and then calls updateUser({ password }). The previous password is
 * overwritten — there is no "additional" password on Firebase Auth.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serviceAccountPath = resolve(__dirname, 'serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const [, , email, newPassword] = process.argv;
if (!email || !newPassword) {
  console.error('Usage: node set-user-password.mjs <email> <newPassword>');
  process.exit(1);
}

try {
  const user = await admin.auth().getUserByEmail(email);
  console.log(`Found user: ${user.uid} (${user.email})`);
  await admin.auth().updateUser(user.uid, { password: newPassword });
  console.log(`Password updated for ${email}.`);
} catch (err) {
  console.error('Failed:', err?.message ?? err);
  process.exit(1);
}

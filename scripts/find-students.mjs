#!/usr/bin/env node
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

const academyId = 'eV7eNQkay1ct7CGBT4MJ';
const db = admin.firestore();

const snapshot = await db.collection(`academies/${academyId}/students`).get();
for (const doc of snapshot.docs) {
  const d = doc.data();
  const name = d.name || d.nome || d.fullName || '';
  if (name.toLowerCase().includes('teste')) {
    console.log(`ID: ${doc.id} | Nome: ${name}`);
  }
}

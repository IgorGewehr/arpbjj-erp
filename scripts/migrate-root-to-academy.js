/**
 * Migration Script: Move root collections to academies/academia-principal/
 *
 * Step 1: Clear existing data from subcollections inside academies/academia-principal/
 *         (preserves the root academy document and the users subcollection)
 * Step 2: Copy root collections to academies/academia-principal/
 *
 * Usage:
 *   node scripts/migrate-root-to-academy.js          # dry run (preview)
 *   node scripts/migrate-root-to-academy.js --run     # execute migration
 */

const admin = require('firebase-admin');
const path = require('path');

// ==========================================
// CONFIGURATION
// ==========================================

const ACADEMY_ID = 'academia-principal';

// Collections that belong inside the academy (currently at root)
const COLLECTIONS_TO_MIGRATE = [
  'achievements',
  'assessments',
  'attendance',
  'classes',
  'financials',
  'linkCodes',
  'plans',
  'settings',
  'students',
];

// Subcollections to clear inside academia-principal BEFORE copying
// (same list - we clear these then re-populate from root)
// users is explicitly excluded
const SUBCOLLECTIONS_TO_CLEAR = [
  'achievements',
  'assessments',
  'attendance',
  'classes',
  'financials',
  'linkCodes',
  'plans',
  'settings',
  'students',
];

// ==========================================
// INITIALIZATION
// ==========================================

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (error) {
  console.error('Error loading service account key.');
  console.error('Expected at: scripts/serviceAccountKey.json');
  process.exit(1);
}

const db = admin.firestore();

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Delete all documents in a collection (in batches of 500)
 */
async function deleteCollection(collectionPath) {
  const collectionRef = db.collection(collectionPath);
  let totalDeleted = 0;

  while (true) {
    const snapshot = await collectionRef.limit(500).get();
    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    totalDeleted += snapshot.size;

    if (snapshot.size < 500) break;
  }

  return totalDeleted;
}

/**
 * Copy all documents from source collection to target collection (in batches of 500)
 */
async function copyCollection(sourcePath, targetPath) {
  const sourceRef = db.collection(sourcePath);
  const snapshot = await sourceRef.get();

  if (snapshot.empty) {
    return 0;
  }

  const BATCH_SIZE = 500;
  let batch = db.batch();
  let batchCount = 0;
  let totalCopied = 0;

  for (const doc of snapshot.docs) {
    const targetDoc = db.collection(targetPath).doc(doc.id);
    batch.set(targetDoc, doc.data());
    batchCount++;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      totalCopied += batchCount;
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    totalCopied += batchCount;
  }

  return totalCopied;
}

// ==========================================
// STEP 1: CLEAR
// ==========================================

async function clearAcademySubcollections(dryRun) {
  console.log('\n--- STEP 1: Clear subcollections in academies/' + ACADEMY_ID + '/ ---');
  console.log('(users subcollection and root academy document are preserved)\n');

  for (const name of SUBCOLLECTIONS_TO_CLEAR) {
    const collPath = `academies/${ACADEMY_ID}/${name}`;
    const snapshot = await db.collection(collPath).get();
    const count = snapshot.size;

    if (count === 0) {
      console.log(`  ${name}: empty`);
      continue;
    }

    if (dryRun) {
      console.log(`  ${name}: ${count} docs (will be deleted)`);
    } else {
      const deleted = await deleteCollection(collPath);
      console.log(`  ${name}: deleted ${deleted} docs`);
    }
  }
}

// ==========================================
// STEP 2: COPY
// ==========================================

async function copyRootToAcademy(dryRun) {
  console.log('\n--- STEP 2: Copy root collections to academies/' + ACADEMY_ID + '/ ---\n');

  for (const name of COLLECTIONS_TO_MIGRATE) {
    const sourcePath = name;
    const targetPath = `academies/${ACADEMY_ID}/${name}`;
    const snapshot = await db.collection(sourcePath).get();
    const count = snapshot.size;

    if (count === 0) {
      console.log(`  ${name}: empty (nothing to copy)`);
      continue;
    }

    if (dryRun) {
      console.log(`  ${name}: ${count} docs (will be copied)`);
    } else {
      const copied = await copyCollection(sourcePath, targetPath);
      console.log(`  ${name}: copied ${copied} docs`);
    }
  }
}

// ==========================================
// MAIN
// ==========================================

async function main() {
  const dryRun = !process.argv.includes('--run');

  if (dryRun) {
    console.log('='.repeat(60));
    console.log('  DRY RUN - No changes will be made');
    console.log('  Run with --run to execute');
    console.log('='.repeat(60));
  } else {
    console.log('='.repeat(60));
    console.log('  EXECUTING MIGRATION');
    console.log('='.repeat(60));
  }

  try {
    await clearAcademySubcollections(dryRun);
    await copyRootToAcademy(dryRun);

    console.log('\n' + '='.repeat(60));
    if (dryRun) {
      console.log('  DRY RUN COMPLETE');
      console.log('  Run: node scripts/migrate-root-to-academy.js --run');
    } else {
      console.log('  MIGRATION COMPLETE');
      console.log('  Root collections copied to academies/' + ACADEMY_ID + '/');
      console.log('  Original root data was NOT deleted.');
    }
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('\nMIGRATION FAILED:', error);
    process.exit(1);
  }
}

main();

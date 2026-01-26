/**
 * Migration Script: Single-Tenant to Multi-Tenant Architecture
 *
 * This script COPIES all data from root collections to the new multi-tenant structure.
 * IMPORTANT: NO DATA IS DELETED. Original collections remain intact.
 *
 * Before running:
 * 1. Install firebase-admin: npm install firebase-admin
 * 2. Download service account key from Firebase Console:
 *    Project Settings > Service Accounts > Generate New Private Key
 * 3. Save the key as: scripts/serviceAccountKey.json
 *
 * Run with: node scripts/migrate-to-multi-tenant.js
 */

const admin = require('firebase-admin');
const path = require('path');

// ==========================================
// CONFIGURATION
// ==========================================

// The ID for the first/existing academy
// You can change this to any unique identifier you want
const ACADEMY_ID = 'academia-principal';

// Academy document data
const ACADEMY_DATA = {
  name: 'Academia Principal',
  slug: 'academia-principal',
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  settings: {
    allowStudentRegistration: true,
    requireApproval: false,
  },
  subscription: {
    plan: 'premium',
    status: 'active',
  },
};

// Collections to migrate from root to academies/{academyId}/{collection}
const COLLECTIONS_TO_MIGRATE = [
  'achievements',
  'assessments',
  'attendance',
  'classes',
  'financials',
  'linkCodes',
  'plans',
  'students',
  'users',
];

// ==========================================
// INITIALIZATION
// ==========================================

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (error) {
  console.error('❌ Error loading service account key:');
  console.error('   Please download the service account key from Firebase Console:');
  console.error('   Project Settings > Service Accounts > Generate New Private Key');
  console.error('   Save it as: scripts/serviceAccountKey.json');
  process.exit(1);
}

const db = admin.firestore();

// ==========================================
// MIGRATION FUNCTIONS
// ==========================================

/**
 * Copy all documents from a root collection to the academy subcollection
 */
async function migrateCollection(collectionName, academyId) {
  console.log(`\n📦 Migrating collection: ${collectionName}`);

  const sourceRef = db.collection(collectionName);
  const targetRef = db.collection(`academies/${academyId}/${collectionName}`);

  const snapshot = await sourceRef.get();

  if (snapshot.empty) {
    console.log(`   ⚠️  Collection "${collectionName}" is empty, skipping...`);
    return { collection: collectionName, count: 0, status: 'empty' };
  }

  console.log(`   📄 Found ${snapshot.size} documents`);

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  // Use batched writes for better performance (max 500 operations per batch)
  const BATCH_SIZE = 500;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const docData = doc.data();
    const targetDocRef = targetRef.doc(doc.id);

    try {
      batch.set(targetDocRef, {
        ...docData,
        _migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        _migratedFrom: collectionName,
      });

      batchCount++;

      // Commit batch when it reaches the limit
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`   ✅ Committed batch of ${batchCount} documents`);
        successCount += batchCount;
        batch = db.batch();
        batchCount = 0;
      }
    } catch (error) {
      errorCount++;
      errors.push({ docId: doc.id, error: error.message });
    }
  }

  // Commit remaining documents
  if (batchCount > 0) {
    await batch.commit();
    console.log(`   ✅ Committed final batch of ${batchCount} documents`);
    successCount += batchCount;
  }

  console.log(`   ✅ Migrated ${successCount}/${snapshot.size} documents from "${collectionName}"`);

  if (errorCount > 0) {
    console.log(`   ❌ Failed to migrate ${errorCount} documents`);
    errors.forEach(e => console.log(`      - ${e.docId}: ${e.error}`));
  }

  return {
    collection: collectionName,
    total: snapshot.size,
    success: successCount,
    errors: errorCount,
    status: errorCount === 0 ? 'success' : 'partial',
  };
}

/**
 * Create the academy document
 */
async function createAcademyDocument(academyId, academyData) {
  console.log(`\n🏛️  Creating academy document: academies/${academyId}`);

  const academyRef = db.collection('academies').doc(academyId);
  const existingDoc = await academyRef.get();

  if (existingDoc.exists) {
    console.log('   ⚠️  Academy document already exists, skipping creation...');
    return { status: 'exists', data: existingDoc.data() };
  }

  await academyRef.set(academyData);
  console.log('   ✅ Academy document created');

  return { status: 'created', data: academyData };
}

/**
 * Create userAcademyMapping entries for all users
 * Structure matches webapp expectations:
 * { academyIds: string[], primaryAcademyId: string }
 */
async function createUserAcademyMappings(academyId) {
  console.log('\n👥 Creating userAcademyMapping entries...');

  // Get all users from root collection
  const usersSnapshot = await db.collection('users').get();

  if (usersSnapshot.empty) {
    console.log('   ⚠️  No users found to map');
    return { status: 'empty', count: 0 };
  }

  console.log(`   📄 Found ${usersSnapshot.size} users to map`);

  const batch = db.batch();
  let count = 0;

  for (const userDoc of usersSnapshot.docs) {
    const mappingRef = db.collection('userAcademyMapping').doc(userDoc.id);

    // Structure expected by webapp (see src/types/index.ts - UserAcademyMapping)
    batch.set(mappingRef, {
      academyIds: [academyId],
      primaryAcademyId: academyId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      _migratedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true }); // Use merge to not overwrite if exists

    count++;
  }

  await batch.commit();
  console.log(`   ✅ Created ${count} userAcademyMapping entries`);

  return { status: 'success', count };
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  MULTI-TENANT MIGRATION SCRIPT');
  console.log('  Target Academy ID:', ACADEMY_ID);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\n⚠️  IMPORTANT: This script COPIES data. Original data will NOT be deleted.\n');

  const startTime = Date.now();
  const results = {
    academy: null,
    collections: [],
    userMappings: null,
  };

  try {
    // Step 1: Create academy document
    results.academy = await createAcademyDocument(ACADEMY_ID, ACADEMY_DATA);

    // Step 2: Migrate all collections
    for (const collectionName of COLLECTIONS_TO_MIGRATE) {
      const result = await migrateCollection(collectionName, ACADEMY_ID);
      results.collections.push(result);
    }

    // Step 3: Create userAcademyMapping entries
    results.userMappings = await createUserAcademyMappings(ACADEMY_ID);

    // Summary
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  MIGRATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\n⏱️  Time elapsed: ${elapsed}s`);
    console.log(`\n🏛️  Academy: academies/${ACADEMY_ID} (${results.academy.status})`);

    console.log('\n📦 Collections migrated:');
    let totalDocs = 0;
    let totalSuccess = 0;
    let totalErrors = 0;

    results.collections.forEach(r => {
      const icon = r.status === 'success' ? '✅' : r.status === 'empty' ? '⚪' : '⚠️';
      console.log(`   ${icon} ${r.collection}: ${r.success || 0}/${r.total || 0} documents`);
      totalDocs += r.total || 0;
      totalSuccess += r.success || 0;
      totalErrors += r.errors || 0;
    });

    console.log(`\n   Total: ${totalSuccess}/${totalDocs} documents migrated`);
    if (totalErrors > 0) {
      console.log(`   ❌ ${totalErrors} documents failed`);
    }

    console.log(`\n👥 User mappings: ${results.userMappings.count} created`);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  ✅ MIGRATION COMPLETED SUCCESSFULLY');
    console.log('  📋 Original data preserved in root collections');
    console.log('  📋 New data available at: academies/' + ACADEMY_ID + '/');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error);
    console.error('\nPartial results:', JSON.stringify(results, null, 2));
    process.exit(1);
  }
}

// ==========================================
// DRY RUN FUNCTION (Preview without changes)
// ==========================================

async function dryRun() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  DRY RUN - PREVIEW MIGRATION');
  console.log('  No changes will be made');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`Target Academy ID: ${ACADEMY_ID}\n`);
  console.log('Collections to migrate:');

  for (const collectionName of COLLECTIONS_TO_MIGRATE) {
    const snapshot = await db.collection(collectionName).get();
    console.log(`  - ${collectionName}: ${snapshot.size} documents`);
  }

  const usersSnapshot = await db.collection('users').get();
  console.log(`\nUsers to map: ${usersSnapshot.size}`);

  console.log('\nNew structure will be:');
  console.log(`  academies/${ACADEMY_ID}/`);
  COLLECTIONS_TO_MIGRATE.forEach(c => {
    console.log(`    └── ${c}/`);
  });
  console.log(`  userAcademyMapping/`);
  console.log(`    └── {userId} -> { academyId: "${ACADEMY_ID}" }`);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  To run the actual migration, use: node scripts/migrate-to-multi-tenant.js --run');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// ==========================================
// ENTRY POINT
// ==========================================

const args = process.argv.slice(2);

if (args.includes('--run')) {
  runMigration();
} else {
  dryRun();
}

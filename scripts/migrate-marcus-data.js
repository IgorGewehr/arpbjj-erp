/**
 * Migration Script: Marcus Production Data to Multi-Tenant
 *
 * This script:
 * 1. CLEARS all test data from academies/academia-principal/ subcollections
 * 2. COPIES all production data from root collections to academies/academia-principal/
 * 3. PRESERVES original data in root collections (no deletion)
 * 4. Updates userAcademyMapping for Marcus
 *
 * IMPORTANT: Run this script ONCE before deploying multi-tenant version
 *
 * Before running:
 * 1. Ensure serviceAccountKey.json exists in scripts/
 * 2. Run: node scripts/migrate-marcus-data.js          (dry run - preview)
 * 3. Run: node scripts/migrate-marcus-data.js --run    (execute migration)
 */

const admin = require('firebase-admin');
const path = require('path');

// ==========================================
// CONFIGURATION
// ==========================================

const ACADEMY_ID = 'academia-principal';

// Marcus user ID from Firebase Auth
const MARCUS_USER_ID = 'aMPGf6Tr4VO0tCIpDRjOyGMDNFm1';

// Collections to migrate from root to academies/{academyId}/
const COLLECTIONS_TO_MIGRATE = [
  'achievements',
  'assessments',
  'attendance',
  'classes',
  'competitions',
  'enrollments',
  'financials',
  'linkCodes',
  'notifications',
  'plans',
  'products',
  'orders',
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
  console.error('❌ Error loading service account key:');
  console.error('   Download from Firebase Console:');
  console.error('   Project Settings > Service Accounts > Generate New Private Key');
  console.error('   Save as: scripts/serviceAccountKey.json');
  process.exit(1);
}

const db = admin.firestore();

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Delete all documents in a collection (in batches)
 */
async function deleteCollection(collectionPath) {
  const collectionRef = db.collection(collectionPath);
  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    return 0;
  }

  const BATCH_SIZE = 500;
  let deleted = 0;

  // Delete in batches
  while (true) {
    const batch = db.batch();
    const docs = await collectionRef.limit(BATCH_SIZE).get();

    if (docs.empty) break;

    docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    deleted += docs.size;

    if (docs.size < BATCH_SIZE) break;
  }

  return deleted;
}

/**
 * Copy all documents from source to target collection
 */
async function copyCollection(sourcePath, targetPath) {
  const sourceRef = db.collection(sourcePath);
  const targetRef = db.collection(targetPath);

  const snapshot = await sourceRef.get();

  if (snapshot.empty) {
    return { copied: 0, total: 0 };
  }

  const BATCH_SIZE = 500;
  let batch = db.batch();
  let batchCount = 0;
  let totalCopied = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const targetDoc = targetRef.doc(doc.id);

    batch.set(targetDoc, {
      ...data,
      _migratedAt: admin.firestore.FieldValue.serverTimestamp(),
      _migratedFrom: 'root/' + sourcePath,
    });

    batchCount++;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      totalCopied += batchCount;
      batch = db.batch();
      batchCount = 0;
    }
  }

  // Commit remaining
  if (batchCount > 0) {
    await batch.commit();
    totalCopied += batchCount;
  }

  return { copied: totalCopied, total: snapshot.size };
}

// ==========================================
// MIGRATION STEPS
// ==========================================

/**
 * Step 1: Clear test data from academies/academia-principal/
 */
async function clearTestData(dryRun = true) {
  console.log('\n🧹 STEP 1: Clear test data from academies/academia-principal/');
  console.log('═'.repeat(60));

  const results = [];

  for (const collection of COLLECTIONS_TO_MIGRATE) {
    const collectionPath = `academies/${ACADEMY_ID}/${collection}`;
    const snapshot = await db.collection(collectionPath).get();
    const count = snapshot.size;

    if (count > 0) {
      console.log(`   📁 ${collection}: ${count} documents to delete`);

      if (!dryRun) {
        const deleted = await deleteCollection(collectionPath);
        console.log(`      ✅ Deleted ${deleted} documents`);
        results.push({ collection, deleted });
      } else {
        results.push({ collection, toDelete: count });
      }
    } else {
      console.log(`   📁 ${collection}: empty (nothing to delete)`);
    }
  }

  return results;
}

/**
 * Step 2: Copy production data from root to academies/academia-principal/
 */
async function copyProductionData(dryRun = true) {
  console.log('\n📦 STEP 2: Copy production data from root to academies/academia-principal/');
  console.log('═'.repeat(60));

  const results = [];

  for (const collection of COLLECTIONS_TO_MIGRATE) {
    const sourcePath = collection;
    const targetPath = `academies/${ACADEMY_ID}/${collection}`;

    const sourceSnapshot = await db.collection(sourcePath).get();
    const count = sourceSnapshot.size;

    if (count > 0) {
      console.log(`   📁 ${collection}: ${count} documents to copy`);

      if (!dryRun) {
        const result = await copyCollection(sourcePath, targetPath);
        console.log(`      ✅ Copied ${result.copied}/${result.total} documents`);
        results.push({ collection, ...result });
      } else {
        results.push({ collection, toCopy: count });
      }
    } else {
      console.log(`   📁 ${collection}: empty (nothing to copy)`);
    }
  }

  return results;
}

/**
 * Step 3: Ensure Marcus has correct userAcademyMapping
 */
async function updateMarcusMapping(dryRun = true) {
  console.log('\n👤 STEP 3: Update userAcademyMapping for Marcus');
  console.log('═'.repeat(60));

  const mappingRef = db.collection('userAcademyMapping').doc(MARCUS_USER_ID);
  const mappingDoc = await mappingRef.get();

  const expectedMapping = {
    academyIds: [ACADEMY_ID],
    primaryAcademyId: ACADEMY_ID,
    role: 'admin',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (mappingDoc.exists) {
    const current = mappingDoc.data();
    console.log(`   Current mapping:`, JSON.stringify(current, null, 2));

    // Check if mapping needs update
    const needsUpdate = !current.academyIds ||
                        !current.academyIds.includes(ACADEMY_ID) ||
                        current.primaryAcademyId !== ACADEMY_ID;

    if (needsUpdate) {
      console.log(`   ⚠️  Mapping needs update`);
      if (!dryRun) {
        await mappingRef.set(expectedMapping, { merge: true });
        console.log(`   ✅ Updated mapping`);
      }
      return { status: 'updated', previous: current };
    } else {
      console.log(`   ✅ Mapping is already correct`);
      return { status: 'unchanged' };
    }
  } else {
    console.log(`   ⚠️  Mapping doesn't exist, will create`);
    if (!dryRun) {
      await mappingRef.set(expectedMapping);
      console.log(`   ✅ Created mapping`);
    }
    return { status: 'created' };
  }
}

/**
 * Step 4: Ensure academy document exists
 */
async function ensureAcademyDocument(dryRun = true) {
  console.log('\n🏛️  STEP 4: Ensure academy document exists');
  console.log('═'.repeat(60));

  const academyRef = db.collection('academies').doc(ACADEMY_ID);
  const academyDoc = await academyRef.get();

  if (academyDoc.exists) {
    console.log(`   ✅ Academy document exists`);
    console.log(`   Data:`, JSON.stringify(academyDoc.data(), null, 2));
    return { status: 'exists' };
  } else {
    console.log(`   ⚠️  Academy document doesn't exist, will create`);

    const academyData = {
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

    if (!dryRun) {
      await academyRef.set(academyData);
      console.log(`   ✅ Created academy document`);
    }
    return { status: 'created' };
  }
}

/**
 * Step 5: Copy users collection to academy scope
 */
async function copyUsersToAcademy(dryRun = true) {
  console.log('\n👥 STEP 5: Copy root users to academies/academia-principal/users');
  console.log('═'.repeat(60));

  const sourceSnapshot = await db.collection('users').get();
  const targetPath = `academies/${ACADEMY_ID}/users`;

  console.log(`   Found ${sourceSnapshot.size} users in root collection`);

  if (sourceSnapshot.empty) {
    return { copied: 0 };
  }

  if (dryRun) {
    sourceSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`   - ${doc.id}: ${data.displayName || data.email} (${data.role})`);
    });
    return { toCopy: sourceSnapshot.size };
  }

  const batch = db.batch();

  for (const doc of sourceSnapshot.docs) {
    const data = doc.data();
    const targetDoc = db.collection(targetPath).doc(doc.id);

    batch.set(targetDoc, {
      ...data,
      _migratedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  console.log(`   ✅ Copied ${sourceSnapshot.size} users`);

  return { copied: sourceSnapshot.size };
}

/**
 * Step 6: Create userAcademyMapping for all users
 */
async function createAllUserMappings(dryRun = true) {
  console.log('\n🗺️  STEP 6: Create userAcademyMapping for all users');
  console.log('═'.repeat(60));

  const usersSnapshot = await db.collection('users').get();
  const existingMappings = await db.collection('userAcademyMapping').get();

  const existingIds = new Set(existingMappings.docs.map(d => d.id));
  const usersToMap = usersSnapshot.docs.filter(d => !existingIds.has(d.id));

  console.log(`   Total users: ${usersSnapshot.size}`);
  console.log(`   Existing mappings: ${existingMappings.size}`);
  console.log(`   Users needing mapping: ${usersToMap.length}`);

  if (usersToMap.length === 0) {
    console.log(`   ✅ All users already have mappings`);
    return { created: 0 };
  }

  if (dryRun) {
    usersToMap.forEach(doc => {
      const data = doc.data();
      console.log(`   - ${doc.id}: ${data.displayName || data.email} (${data.role})`);
    });
    return { toCreate: usersToMap.length };
  }

  const batch = db.batch();

  for (const userDoc of usersToMap) {
    const userData = userDoc.data();
    const mappingRef = db.collection('userAcademyMapping').doc(userDoc.id);

    batch.set(mappingRef, {
      academyIds: [ACADEMY_ID],
      primaryAcademyId: ACADEMY_ID,
      role: userData.role || 'student',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  console.log(`   ✅ Created ${usersToMap.length} mappings`);

  return { created: usersToMap.length };
}

// ==========================================
// MAIN FUNCTIONS
// ==========================================

async function runDryRun() {
  console.log('═'.repeat(70));
  console.log('  MARCUS DATA MIGRATION - DRY RUN (PREVIEW)');
  console.log('  No changes will be made');
  console.log('═'.repeat(70));

  const startTime = Date.now();

  // Step 1: Preview deletion
  await clearTestData(true);

  // Step 2: Preview copy
  await copyProductionData(true);

  // Step 3: Check Marcus mapping
  await updateMarcusMapping(true);

  // Step 4: Check academy document
  await ensureAcademyDocument(true);

  // Step 5: Preview users copy
  await copyUsersToAcademy(true);

  // Step 6: Preview user mappings
  await createAllUserMappings(true);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n' + '═'.repeat(70));
  console.log('  DRY RUN COMPLETE');
  console.log(`  Time: ${elapsed}s`);
  console.log('');
  console.log('  To execute migration, run:');
  console.log('  node scripts/migrate-marcus-data.js --run');
  console.log('═'.repeat(70) + '\n');
}

async function runMigration() {
  console.log('═'.repeat(70));
  console.log('  MARCUS DATA MIGRATION - EXECUTING');
  console.log('  ⚠️  This will modify your Firestore database!');
  console.log('═'.repeat(70));

  const startTime = Date.now();

  try {
    // Step 1: Clear test data
    console.log('\n⏳ Starting migration...\n');
    await clearTestData(false);

    // Step 2: Copy production data
    await copyProductionData(false);

    // Step 3: Update Marcus mapping
    await updateMarcusMapping(false);

    // Step 4: Ensure academy document
    await ensureAcademyDocument(false);

    // Step 5: Copy users
    await copyUsersToAcademy(false);

    // Step 6: Create user mappings
    await createAllUserMappings(false);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '═'.repeat(70));
    console.log('  ✅ MIGRATION COMPLETED SUCCESSFULLY');
    console.log(`  Time: ${elapsed}s`);
    console.log('');
    console.log('  Summary:');
    console.log('  - Test data cleared from academies/academia-principal/');
    console.log('  - Production data copied to academies/academia-principal/');
    console.log('  - Original root data preserved (not deleted)');
    console.log('  - User mappings created/updated');
    console.log('');
    console.log('  You can now deploy the multi-tenant version!');
    console.log('═'.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error);
    console.error('\nYou may need to manually check the database state.');
    process.exit(1);
  }
}

// ==========================================
// ENTRY POINT
// ==========================================

const args = process.argv.slice(2);

if (args.includes('--run')) {
  runMigration();
} else {
  runDryRun();
}

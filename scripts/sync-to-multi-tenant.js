/**
 * Sync Script: Incremental Sync from Single-Tenant to Multi-Tenant
 *
 * This script syncs NEW and UPDATED documents from root collections
 * to the multi-tenant structure. Safe to run multiple times.
 *
 * Run with:
 *   npm run migrate:sync          # Preview changes
 *   npm run migrate:sync -- --run # Execute sync
 */

const admin = require('firebase-admin');
const path = require('path');

// ==========================================
// CONFIGURATION
// ==========================================

const ACADEMY_ID = 'academia-principal';

const COLLECTIONS_TO_SYNC = [
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

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (error) {
  console.error('❌ Error loading service account key');
  console.error('   Save it as: scripts/serviceAccountKey.json');
  process.exit(1);
}

const db = admin.firestore();

// ==========================================
// SYNC FUNCTIONS
// ==========================================

/**
 * Compare two documents and check if source is newer/different
 */
function needsUpdate(sourceData, targetData) {
  if (!targetData) return true; // Document doesn't exist in target

  // Compare updatedAt timestamps if they exist
  const sourceUpdated = sourceData.updatedAt?.toMillis?.() || sourceData.updatedAt || 0;
  const targetMigrated = targetData._lastSyncedAt?.toMillis?.() || targetData._migratedAt?.toMillis?.() || 0;

  if (sourceUpdated > targetMigrated) return true;

  // Compare createdAt as fallback
  const sourceCreated = sourceData.createdAt?.toMillis?.() || sourceData.createdAt || 0;
  if (sourceCreated > targetMigrated) return true;

  // Deep compare key fields (excluding metadata)
  const sourceKeys = Object.keys(sourceData).filter(k => !k.startsWith('_'));
  const targetKeys = Object.keys(targetData).filter(k => !k.startsWith('_'));

  if (sourceKeys.length !== targetKeys.length) return true;

  // Simple JSON comparison for changes
  const sourceJson = JSON.stringify(sourceData, Object.keys(sourceData).filter(k => !k.startsWith('_')).sort());
  const targetJson = JSON.stringify(targetData, Object.keys(targetData).filter(k => !k.startsWith('_')).sort());

  return sourceJson !== targetJson;
}

/**
 * Sync a single collection
 */
async function syncCollection(collectionName, academyId, dryRun = true) {
  console.log(`\n📦 Syncing collection: ${collectionName}`);

  const sourceRef = db.collection(collectionName);
  const targetRef = db.collection(`academies/${academyId}/${collectionName}`);

  const [sourceSnapshot, targetSnapshot] = await Promise.all([
    sourceRef.get(),
    targetRef.get(),
  ]);

  if (sourceSnapshot.empty) {
    console.log(`   ⚪ Source collection is empty`);
    return { collection: collectionName, new: 0, updated: 0, unchanged: 0 };
  }

  // Build target map for quick lookup
  const targetMap = new Map();
  targetSnapshot.docs.forEach(doc => {
    targetMap.set(doc.id, doc.data());
  });

  const toCreate = [];
  const toUpdate = [];
  let unchanged = 0;

  for (const sourceDoc of sourceSnapshot.docs) {
    const sourceData = sourceDoc.data();
    const targetData = targetMap.get(sourceDoc.id);

    if (!targetData) {
      toCreate.push({ id: sourceDoc.id, data: sourceData });
    } else if (needsUpdate(sourceData, targetData)) {
      toUpdate.push({ id: sourceDoc.id, data: sourceData });
    } else {
      unchanged++;
    }
  }

  console.log(`   📊 Source: ${sourceSnapshot.size} | Target: ${targetSnapshot.size}`);
  console.log(`   ➕ New: ${toCreate.length} | 🔄 Updated: ${toUpdate.length} | ✓ Unchanged: ${unchanged}`);

  if (dryRun) {
    if (toCreate.length > 0) {
      console.log(`   New documents: ${toCreate.slice(0, 5).map(d => d.id).join(', ')}${toCreate.length > 5 ? '...' : ''}`);
    }
    if (toUpdate.length > 0) {
      console.log(`   Updated documents: ${toUpdate.slice(0, 5).map(d => d.id).join(', ')}${toUpdate.length > 5 ? '...' : ''}`);
    }
    return { collection: collectionName, new: toCreate.length, updated: toUpdate.length, unchanged };
  }

  // Execute sync
  const BATCH_SIZE = 500;
  let batch = db.batch();
  let batchCount = 0;
  let totalWritten = 0;

  const allDocs = [
    ...toCreate.map(d => ({ ...d, isNew: true })),
    ...toUpdate.map(d => ({ ...d, isNew: false })),
  ];

  for (const doc of allDocs) {
    const targetDocRef = targetRef.doc(doc.id);

    batch.set(targetDocRef, {
      ...doc.data,
      _lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
      _migratedFrom: collectionName,
    }, { merge: true });

    batchCount++;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      totalWritten += batchCount;
      console.log(`   ✅ Committed batch of ${batchCount} documents`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    totalWritten += batchCount;
    console.log(`   ✅ Committed final batch of ${batchCount} documents`);
  }

  return { collection: collectionName, new: toCreate.length, updated: toUpdate.length, unchanged };
}

/**
 * Sync userAcademyMapping for new users
 */
async function syncUserMappings(academyId, dryRun = true) {
  console.log('\n👥 Syncing userAcademyMapping...');

  const usersSnapshot = await db.collection('users').get();
  const mappingsSnapshot = await db.collection('userAcademyMapping').get();

  const existingMappings = new Set(mappingsSnapshot.docs.map(d => d.id));
  const newUsers = usersSnapshot.docs.filter(d => !existingMappings.has(d.id));

  console.log(`   📊 Users: ${usersSnapshot.size} | Existing mappings: ${mappingsSnapshot.size}`);
  console.log(`   ➕ New mappings needed: ${newUsers.length}`);

  if (dryRun || newUsers.length === 0) {
    return { new: newUsers.length };
  }

  const batch = db.batch();

  for (const userDoc of newUsers) {
    const userData = userDoc.data();
    const mappingRef = db.collection('userAcademyMapping').doc(userDoc.id);

    batch.set(mappingRef, {
      academyId: academyId,
      role: userData.role || 'student',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      _lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  console.log(`   ✅ Created ${newUsers.length} new mappings`);

  return { new: newUsers.length };
}

/**
 * Main sync function
 */
async function runSync(dryRun = true) {
  const mode = dryRun ? 'PREVIEW' : 'EXECUTE';

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  INCREMENTAL SYNC - ${mode}`);
  console.log('  Academy ID:', ACADEMY_ID);
  console.log('═══════════════════════════════════════════════════════════════');

  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No changes will be made\n');
  }

  const startTime = Date.now();
  const results = [];

  // Sync collections
  for (const collectionName of COLLECTIONS_TO_SYNC) {
    const result = await syncCollection(collectionName, ACADEMY_ID, dryRun);
    results.push(result);
  }

  // Sync user mappings
  const mappingResult = await syncUserMappings(ACADEMY_ID, dryRun);

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  SYNC SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');

  let totalNew = 0;
  let totalUpdated = 0;
  let totalUnchanged = 0;

  results.forEach(r => {
    const hasChanges = r.new > 0 || r.updated > 0;
    const icon = hasChanges ? '🔄' : '✓';
    console.log(`  ${icon} ${r.collection}: +${r.new} new, ~${r.updated} updated, ${r.unchanged} unchanged`);
    totalNew += r.new;
    totalUpdated += r.updated;
    totalUnchanged += r.unchanged;
  });

  console.log(`\n  📊 Total: +${totalNew} new, ~${totalUpdated} updated, ${totalUnchanged} unchanged`);
  console.log(`  👥 User mappings: +${mappingResult.new} new`);
  console.log(`  ⏱️  Time: ${elapsed}s`);

  if (dryRun && (totalNew > 0 || totalUpdated > 0 || mappingResult.new > 0)) {
    console.log('\n  To execute sync: npm run migrate:sync -- --run');
  }

  console.log('═══════════════════════════════════════════════════════════════\n');
}

// ==========================================
// ENTRY POINT
// ==========================================

const args = process.argv.slice(2);
const dryRun = !args.includes('--run');

runSync(dryRun).catch(error => {
  console.error('❌ Sync failed:', error);
  process.exit(1);
});

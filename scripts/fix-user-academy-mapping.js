/**
 * Fix userAcademyMapping structure
 *
 * Converts old format:
 *   { academyId: "academia-principal", role: "student" }
 *
 * To new format (matching webapp expectations):
 *   { academyIds: ["academia-principal"], primaryAcademyId: "academia-principal" }
 *
 * Run with:
 *   node scripts/fix-user-academy-mapping.js          # Preview
 *   node scripts/fix-user-academy-mapping.js --run    # Execute
 */

const admin = require('firebase-admin');
const path = require('path');

const ACADEMY_ID = 'academia-principal';

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (error) {
  console.error('❌ Error loading service account key');
  process.exit(1);
}

const db = admin.firestore();

async function fixMappings(dryRun = true) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  FIX userAcademyMapping - ${dryRun ? 'PREVIEW' : 'EXECUTE'}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const mappingsSnapshot = await db.collection('userAcademyMapping').get();

  if (mappingsSnapshot.empty) {
    console.log('No userAcademyMapping documents found');
    return;
  }

  console.log(`Found ${mappingsSnapshot.size} mapping documents\n`);

  const toFix = [];
  const alreadyCorrect = [];

  for (const doc of mappingsSnapshot.docs) {
    const data = doc.data();

    // Check if already in correct format
    if (Array.isArray(data.academyIds) && data.primaryAcademyId) {
      alreadyCorrect.push(doc.id);
      continue;
    }

    // Needs to be fixed
    const academyId = data.academyId || data.primaryAcademyId || ACADEMY_ID;
    toFix.push({
      id: doc.id,
      oldData: data,
      newData: {
        academyIds: [academyId],
        primaryAcademyId: academyId,
        createdAt: data.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    });
  }

  console.log(`✓ Already correct: ${alreadyCorrect.length}`);
  console.log(`⚠ Need fix: ${toFix.length}\n`);

  if (toFix.length === 0) {
    console.log('Nothing to fix!');
    return;
  }

  // Show what will be changed
  console.log('Documents to fix:');
  toFix.forEach(item => {
    console.log(`  - ${item.id}`);
    console.log(`    Old: academyId = "${item.oldData.academyId}"`);
    console.log(`    New: academyIds = ["${item.newData.primaryAcademyId}"], primaryAcademyId = "${item.newData.primaryAcademyId}"`);
  });

  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No changes made');
    console.log('Run with --run to execute changes');
    return;
  }

  // Execute fixes
  console.log('\nExecuting fixes...');
  const batch = db.batch();

  for (const item of toFix) {
    const ref = db.collection('userAcademyMapping').doc(item.id);
    batch.set(ref, item.newData);
  }

  await batch.commit();
  console.log(`\n✅ Fixed ${toFix.length} documents`);
}

const args = process.argv.slice(2);
const dryRun = !args.includes('--run');

fixMappings(dryRun).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

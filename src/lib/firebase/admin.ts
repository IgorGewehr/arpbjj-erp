import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// Supports:
//   1. Individual FIREBASE_SA_* env vars (easiest for Netlify)
//   2. FIREBASE_SERVICE_ACCOUNT_KEY - Raw JSON string
//   3. GOOGLE_APPLICATION_CREDENTIALS - File path (local dev)

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // Option 1: Individual environment variables (recommended for Netlify)
  const projectId = process.env.FIREBASE_SA_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_SA_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_SA_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        // Netlify stores \n as literal characters, so we need to replace them
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  }

  // Option 2: Raw JSON string
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (error) {
      console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', error);
    }
  }

  // Option 3: File path via GOOGLE_APPLICATION_CREDENTIALS (local dev)
  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const adminApp = initializeFirebaseAdmin();
export const adminDb = admin.firestore(adminApp);
export const adminMessaging = admin.messaging(adminApp);

export default adminApp;

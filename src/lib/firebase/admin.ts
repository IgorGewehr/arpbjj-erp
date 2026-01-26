import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// Uses GOOGLE_APPLICATION_CREDENTIALS environment variable for service account
// Or you can use FIREBASE_SERVICE_ACCOUNT_KEY environment variable with JSON string

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // Option 1: Using service account JSON from environment variable
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

  // Option 2: Using GOOGLE_APPLICATION_CREDENTIALS file path (default)
  // This is automatically used by firebase-admin if the env var is set
  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const adminApp = initializeFirebaseAdmin();
export const adminDb = admin.firestore(adminApp);
export const adminMessaging = admin.messaging(adminApp);

export default adminApp;

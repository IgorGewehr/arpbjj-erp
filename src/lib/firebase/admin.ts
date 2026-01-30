import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK (lazy - only on first use, not during build)
// Supports:
//   1. Individual FIREBASE_SA_* env vars (easiest for Netlify)
//   2. FIREBASE_SERVICE_ACCOUNT_KEY - Raw JSON string
//   3. GOOGLE_APPLICATION_CREDENTIALS - File path (local dev)

function getOrInitializeApp(): admin.app.App {
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

  // Option 3: Default credentials (local dev with GOOGLE_APPLICATION_CREDENTIALS)
  return admin.initializeApp();
}

// Lazy getters - only initialize when actually called at runtime, not at build time
let _db: admin.firestore.Firestore | null = null;
let _messaging: admin.messaging.Messaging | null = null;

function getDb(): admin.firestore.Firestore {
  if (!_db) {
    _db = admin.firestore(getOrInitializeApp());
  }
  return _db;
}

function getMessaging(): admin.messaging.Messaging {
  if (!_messaging) {
    _messaging = admin.messaging(getOrInitializeApp());
  }
  return _messaging;
}

// Proxy to defer initialization to runtime
export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(_, prop: string | symbol) {
    const db = getDb();
    const value = db[prop as keyof admin.firestore.Firestore];
    if (typeof value === 'function') {
      return (value as Function).bind(db);
    }
    return value;
  },
});

export const adminMessaging = new Proxy({} as admin.messaging.Messaging, {
  get(_, prop: string | symbol) {
    const msg = getMessaging();
    const value = msg[prop as keyof admin.messaging.Messaging];
    if (typeof value === 'function') {
      return (value as Function).bind(msg);
    }
    return value;
  },
});

export default { getApp: getOrInitializeApp };

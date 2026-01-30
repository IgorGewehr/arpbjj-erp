import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK (lazy - only on first use, not during build)

function getOrInitializeApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // Option 1: Individual environment variables (recommended for Netlify)
  const projectId = process.env.FIREBASE_SA_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_SA_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_SA_PRIVATE_KEY;

  if (projectId && clientEmail && rawPrivateKey) {
    // Handle both cases: Netlify may store \n as literal chars or real newlines
    let privateKey = rawPrivateKey;
    if (!privateKey.includes('\n') || privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    console.log('[FIREBASE ADMIN] Initializing with individual env vars');
    console.log('[FIREBASE ADMIN] projectId:', projectId);
    console.log('[FIREBASE ADMIN] clientEmail:', clientEmail);
    console.log('[FIREBASE ADMIN] privateKey starts with:', privateKey.substring(0, 40));
    console.log('[FIREBASE ADMIN] privateKey length:', privateKey.length);
    console.log('[FIREBASE ADMIN] privateKey has real newlines:', privateKey.includes('\n'));
    console.log('[FIREBASE ADMIN] privateKey has BEGIN:', privateKey.includes('-----BEGIN'));

    try {
      const app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('[FIREBASE ADMIN] Successfully initialized with cert');
      return app;
    } catch (error) {
      console.error('[FIREBASE ADMIN] Failed to init with individual vars:', error);
    }
  } else {
    console.warn('[FIREBASE ADMIN] Missing individual env vars:',
      { hasProjectId: !!projectId, hasClientEmail: !!clientEmail, hasPrivateKey: !!rawPrivateKey });
  }

  // Option 2: Raw JSON string
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    console.log('[FIREBASE ADMIN] Trying FIREBASE_SERVICE_ACCOUNT_KEY...');
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      const app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('[FIREBASE ADMIN] Successfully initialized with JSON key');
      return app;
    } catch (error) {
      console.error('[FIREBASE ADMIN] Failed to parse JSON key:', error);
    }
  }

  // Option 3: No credentials (will NOT have admin privileges)
  console.error('[FIREBASE ADMIN] NO CREDENTIALS FOUND - using default (no admin access!)');
  return admin.initializeApp();
}

// Lazy singleton
let _db: admin.firestore.Firestore | null = null;

function getDb(): admin.firestore.Firestore {
  if (!_db) {
    _db = admin.firestore(getOrInitializeApp());
  }
  return _db;
}

// Proxy to defer initialization to runtime (not build time)
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

let _messaging: admin.messaging.Messaging | null = null;

export const adminMessaging = new Proxy({} as admin.messaging.Messaging, {
  get(_, prop: string | symbol) {
    if (!_messaging) {
      _messaging = admin.messaging(getOrInitializeApp());
    }
    const value = _messaging[prop as keyof admin.messaging.Messaging];
    if (typeof value === 'function') {
      return (value as Function).bind(_messaging);
    }
    return value;
  },
});

export default { getApp: getOrInitializeApp };

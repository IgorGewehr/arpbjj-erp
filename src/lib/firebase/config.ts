import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { Messaging } from 'firebase/messaging';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (singleton pattern)
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firebase services
export const auth: Auth = getAuth(app);

// Initialize Firestore with persistent local cache (IndexedDB) when running
// in the browser. `initializeFirestore` MUST be called only once per app, so
// we guard via `getApps().length` above and use a try/catch fallback in case
// it has already been initialized in a previous module evaluation (HMR).
let dbInstance: Firestore | null = null;
function buildDb(): Firestore {
  if (dbInstance) return dbInstance;
  // SSR: no IndexedDB — just use default getFirestore.
  if (typeof window === 'undefined') {
    dbInstance = getFirestore(app);
    return dbInstance;
  }
  try {
    dbInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    // Already initialized (HMR / duplicated evaluation) — fall back.
    dbInstance = getFirestore(app);
  }
  return dbInstance;
}

export const db: Firestore = buildDb();
export const storage: FirebaseStorage = getStorage(app);

// Firebase Cloud Messaging (lazy, browser-only)
let messagingInstance: Messaging | null = null;

export async function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  if (messagingInstance) return messagingInstance;

  const { isSupported, getMessaging } = await import('firebase/messaging');
  const supported = await isSupported();
  if (!supported) return null;

  messagingInstance = getMessaging(app);
  return messagingInstance;
}

export default app;

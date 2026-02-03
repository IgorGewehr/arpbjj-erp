'use client';

import { useEffect, useRef } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, firebaseConfig, getMessagingInstance } from '@/lib/firebase';
import { useAuth } from '@/components/providers/AuthProvider';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export function useFCM() {
  const { firebaseUser, isAuthenticated } = useAuth();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!firebaseUser || !isAuthenticated || registeredRef.current) return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (!VAPID_KEY) {
      console.warn('NEXT_PUBLIC_FIREBASE_VAPID_KEY not set, skipping FCM registration');
      return;
    }

    let cancelled = false;

    async function sendConfigToSW(sw: ServiceWorker) {
      sw.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig });
    }

    async function registerFCM() {
      try {
        const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

        // Send config to whichever SW state is available
        if (swRegistration.active) {
          sendConfigToSW(swRegistration.active);
        } else if (swRegistration.installing || swRegistration.waiting) {
          const sw = swRegistration.installing || swRegistration.waiting;
          sw!.addEventListener('statechange', () => {
            if (sw!.state === 'activated') {
              sendConfigToSW(sw!);
            }
          });
        }

        await navigator.serviceWorker.ready;

        const messaging = await getMessagingInstance();
        if (!messaging || cancelled) return;

        const { getToken } = await import('firebase/messaging');
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: swRegistration,
        });

        if (!token || cancelled) return;

        // Save token to Firestore
        const tokenRef = doc(db, `users/${firebaseUser!.uid}/fcmTokens/${token}`);
        await setDoc(tokenRef, {
          token,
          platform: 'web',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });

        registeredRef.current = true;

        // Listen for foreground messages
        const { onMessage } = await import('firebase/messaging');
        onMessage(messaging, (payload) => {
          const { title, body } = payload.notification || {};
          if (!title) return;

          if (Notification.permission === 'granted') {
            new Notification(title, {
              body: body || '',
              icon: '/icons/icon-192x192.png',
            });
          }
        });
      } catch (error) {
        console.error('FCM registration failed:', error);
      }
    }

    registerFCM();

    return () => {
      cancelled = true;
    };
  }, [firebaseUser, isAuthenticated]);
}

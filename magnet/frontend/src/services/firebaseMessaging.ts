/**
 * Firebase Cloud Messaging service
 * Handles FCM token registration and foreground message handling.
 */
import { notificationService } from '../services';

const VITE_FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let messaging: any = null;
let fcmToken: string | null = null;

export async function initializeFCM(): Promise<string | null> {
  try {
    if (!VITE_FIREBASE_CONFIG.apiKey || !VITE_FIREBASE_CONFIG.projectId) {
      console.debug('Firebase config not found, FCM disabled');
      return null;
    }

    const { initializeApp, getApps } = await import('firebase/app');
    const { getMessaging, getToken, onMessage } = await import('firebase/messaging');

    const app = getApps().length > 0 ? getApps()[0] : initializeApp(VITE_FIREBASE_CONFIG);
    messaging = getMessaging(app);

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.debug('Notification permission denied');
      return null;
    }

    fcmToken = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });

    if (fcmToken) {
      await notificationService.registerFcm(fcmToken);
    }

    onMessage(messaging, (payload: any) => {
      if (payload.notification) {
        const event = new CustomEvent('fcm-message', { detail: payload });
        window.dispatchEvent(event);
      }
    });

    return fcmToken;
  } catch (err) {
    console.debug('FCM initialization failed:', err);
    return null;
  }
}

export function getFCMToken(): string | null {
  return fcmToken;
}

export function onFCMMessage(handler: (payload: any) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent).detail);
  window.addEventListener('fcm-message', listener);
  return () => window.removeEventListener('fcm-message', listener);
}

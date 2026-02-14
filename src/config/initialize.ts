import {
  initializeStorageService,
  initializeNetworkService,
  initializeFirebaseService,
} from '@sudobility/di';
import { initializeInfoService } from '@sudobility/di_web';

export function initializeApp(): void {
  initializeStorageService();

  initializeFirebaseService({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  });

  initializeNetworkService();
  initializeInfoService();
}

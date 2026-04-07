/**
 * Application initialization module.
 *
 * Bootstraps core services (storage, Firebase, network, device info) at
 * startup. This must be called once from `main.tsx` before the React tree
 * is mounted.
 */

import {
  initializeStorageService,
  initializeNetworkService,
  initializeFirebaseService,
} from '@sudobility/di';
import { initializeInfoService } from '@sudobility/di_web';

/**
 * Required environment variables for Firebase initialization.
 * If any are missing the app will still start but Firebase features
 * (auth, analytics) will not work correctly.
 */
const REQUIRED_ENV_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
] as const;

/**
 * Validates that required environment variables are present and logs
 * warnings for any that are missing. This runs only in development
 * to surface configuration issues early.
 */
function validateEnvironment(): void {
  if (import.meta.env.PROD) return;

  const missing = REQUIRED_ENV_VARS.filter(key => !import.meta.env[key]);

  if (missing.length > 0) {
    console.warn(
      `[initializeApp] Missing required environment variables: ${missing.join(', ')}. ` +
        'Firebase features may not work correctly. ' +
        'Check your .env file or deployment configuration.'
    );
  }
}

/**
 * Initializes all application services. Must be called once before the
 * React tree is mounted.
 *
 * Initialization order:
 * 1. Environment validation (dev only)
 * 2. Storage service (localStorage abstraction)
 * 3. Firebase service (auth, analytics)
 * 4. Network service (authenticated HTTP client)
 * 5. Info service (device/platform metadata)
 */
export function initializeApp(): void {
  validateEnvironment();

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

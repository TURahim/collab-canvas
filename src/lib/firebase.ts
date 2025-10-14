/**
 * CollabCanvas - Firebase Client Configuration
 * Initializes Firebase services: Auth, Firestore, and Realtime Database
 * 
 * Uses singleton pattern to prevent multiple Firebase app initializations.
 * All environment variables must be prefixed with NEXT_PUBLIC_ to be accessible client-side.
 */

import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import type { Database } from "firebase/database";
import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";

/**
 * Firebase configuration from environment variables
 * Non-null assertions are safe here as these are required for app to function
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL!,
};

/**
 * Firebase app instance (singleton)
 * Returns existing app if already initialized, otherwise creates new one
 */
export const app: FirebaseApp = getApps().length > 0 
  ? getApps()[0] 
  : initializeApp(firebaseConfig);

/**
 * Firebase Authentication instance
 */
export const auth: Auth = getAuth(app);

/**
 * Cloud Firestore instance - used for persistent shape storage
 */
export const db: Firestore = getFirestore(app);

/**
 * Realtime Database instance - used for ephemeral cursor positions and presence
 */
export const realtimeDb: Database = getDatabase(app);


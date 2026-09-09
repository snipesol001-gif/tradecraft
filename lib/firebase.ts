// Client-side Firebase initialization.
//
// These values are public identifiers, not secrets. Real security lives in
// Firestore security rules and server-side code, never in hiding these values.

import { initializeApp, getApps, getApp } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize only once. During development Next.js can reload modules more
// than once, and calling initializeApp twice throws an error. getApps()
// returns any existing instance, so we reuse it when present.
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
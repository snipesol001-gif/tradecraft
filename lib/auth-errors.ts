// Maps Firebase authentication error codes to user-facing messages.
// Security note: on login, unknown email and wrong password produce the
// same message on purpose, so the form cannot be used to discover
// which email addresses have accounts.

import { FirebaseError } from "firebase/app";

const messages: Record<string, string> = {
  "auth/email-already-in-use": "This email is already registered.",
  "auth/invalid-email": "That email address does not look valid.",
  "auth/weak-password": "That password is too weak. Use at least 8 characters.",
  "auth/invalid-credential": "Invalid email or password.",
  "auth/user-not-found": "Invalid email or password.",
  "auth/wrong-password": "Invalid email or password.",
  "auth/too-many-requests":
    "Too many attempts. Please wait a moment and try again.",
  "auth/unauthorized-domain":
    "Sign-in is not enabled for this website address yet. If you are the site owner, add this domain in the Firebase console.",
  "auth/popup-closed-by-user": "The Google sign-in window was closed before finishing.",
  "auth/cancelled-popup-request": "The Google sign-in window was closed before finishing.",
  "auth/account-exists-with-different-credential":
    "This email is registered with a password. Sign in with email and password instead.",
  "auth/network-request-failed": "Network problem. Check your connection and try again.",
  "auth/operation-not-allowed": "This sign-in method is not enabled yet.",
};
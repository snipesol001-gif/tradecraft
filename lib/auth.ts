// Shared Firebase Authentication helpers.
// Pages import these functions instead of talking to Firebase directly,
// so account logic lives in exactly one place.

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import { firebaseApp } from "./firebase";

export const auth: Auth = getAuth(firebaseApp);

const googleProvider = new GoogleAuthProvider();

export async function signUpWithEmail(email: string, password: string): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signInWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}
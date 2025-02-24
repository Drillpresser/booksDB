import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword,signInWithEmailAndPassword, signOut } from "@firebase/auth";
import { doc, setDoc } from "@firebase/firestore";
import { profile } from "console";

// Sign up
export async function signUp(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    return user;
  } catch (error) {
    console.error(error);
    return null;
  }
}

await setDoc(doc(db, "users", user.uid), {
  email: user.email,
  ...profile
}); 

// Login
export async function login(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    return user;
  } catch (error) {
    console.error(error);
    return null;
  }
}

// Logout
export async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error(error);
  }
}
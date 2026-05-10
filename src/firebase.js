import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAUKEC49_R4NAYMcn0VmDA4tnMqQvuxHeQ",
  authDomain: "banca-logica.firebaseapp.com",
  projectId: "banca-logica",
  storageBucket: "banca-logica.firebasestorage.app",
  messagingSenderId: "257701858814",
  appId: "1:257701858814:web:0aa9047e0ea07f01f244af",
  measurementId: "G-MV3B92JY1Z"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

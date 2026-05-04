import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
const firebaseConfig = {
  apiKey: "AIzaSyBgqWwVRoCMf8v3tkT-XZ4nthCVksAmeRI",
  authDomain: "meuappdeaposts.firebaseapp.com",
  projectId: "meuappdeaposts",
  storageBucket: "meuappdeaposts.firebasestorage.app",
  messagingSenderId: "301300885334",
  appId: "1:301300885334:web:e45311910fb244d16018f7",
  measurementId: "G-YEY9XXF08R"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;

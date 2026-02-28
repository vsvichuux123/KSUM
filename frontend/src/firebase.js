// TODO: Replace with your Firebase project config
// Get this from: Firebase Console > Project Settings > Your Apps > SDK Setup
// Sign up free at https://firebase.google.com

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
    apiKey: "AIzaSyC6GazMDe_Ej_1WisrDg_gHws5f8pbSVH4",
    authDomain: "trustora-cf39d.firebaseapp.com",
    projectId: "trustora-cf39d",
    storageBucket: "trustora-cf39d.firebasestorage.app",
    messagingSenderId: "100931727525",
    appId: "1:100931727525:web:601bfbf253f9cc06695d4c",
    measurementId: "G-YE7Y1ZNJMV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

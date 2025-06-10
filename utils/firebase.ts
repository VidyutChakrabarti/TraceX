import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyAtUJM1pxIKsttzeoNyB68gfJqW6iMWLFA",
    authDomain: "tracex-dcc61.firebaseapp.com",
    projectId: "tracex-dcc61",
    storageBucket: "tracex-dcc61.firebasestorage.app",
    messagingSenderId: "811267102246",
    appId: "1:811267102246:web:4f589f86f8a02e0e00f8e7",
    measurementId: "G-QTM4MPXE59"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

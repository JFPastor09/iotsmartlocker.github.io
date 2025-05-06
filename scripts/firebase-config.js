import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyDOuSdQbMI1RDZ3KtK0Y6ipK2K33p6GJ04",
    authDomain: "smartlockersiot.firebaseapp.com",
    databaseURL: "https://smartlockersiot-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "smartlockersiot",
    storageBucket: "smartlockersiot.firebasestorage.app",
    messagingSenderId: "573943772484",
    appId: "1:573943772484:web:e4917b253112b357de9311",
    measurementId: "G-M612SXHH3H"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);

export { app, auth, database, analytics };

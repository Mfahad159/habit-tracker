// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBIQXITiENqxA739p-49NESiustFwtUyZE",
  authDomain: "smart-habit-tracker-4bd68.firebaseapp.com",
  databaseURL: "https://smart-habit-tracker-4bd68-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-habit-tracker-4bd68",
  storageBucket: "smart-habit-tracker-4bd68.firebasestorage.app",
  messagingSenderId: "857008019565",
  appId: "1:857008019565:web:3e695e915d0d7ed1868764",
  measurementId: "G-2100MRDYLN"
};

// Initialize Firebase
let app;
let db;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

// Initialize Analytics
const analytics = getAnalytics(app);

export { db };
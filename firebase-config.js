// Firebase Configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAG-mRq6_PHTmdQZwgljlF53hfEpr38zSw",
  authDomain: "move-to-android-and-ios.firebaseapp.com",
  projectId: "move-to-android-and-ios",
  storageBucket: "move-to-android-and-ios.firebasestorage.app",
  messagingSenderId: "472907906950",
  appId: "1:472907906950:web:0321bdbd0c684af3b1b607",
  measurementId: "G-LX67E75GD0"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const analytics = firebase.analytics();
const db = firebase.firestore();
const storage = firebase.storage();

console.log('🔥 Firebase initialized successfully');

// Export for use in other scripts
window.firebaseApp = firebase.app();
window.analytics = analytics;
window.db = db;
window.storage = storage;

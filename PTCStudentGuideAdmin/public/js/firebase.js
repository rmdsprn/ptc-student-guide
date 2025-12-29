import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBGwvrIbpqtRU20Yb1tTXIW-1A9spV89j8",
  authDomain: "ptc-student-guide.firebaseapp.com",
  projectId: "ptc-student-guide",
  storageBucket: "ptc-student-guide.firebasestorage.app",
  messagingSenderId: "806927741946",
  appId: "1:806927741946:web:a5aff95463fa058934ea43"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

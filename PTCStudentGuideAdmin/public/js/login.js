import { auth, db } from "./firebase.js";

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

/* =======================
   DOM ELEMENTS
======================= */
const loginBtn = document.getElementById("googleLoginBtn");
const errorMsg = document.getElementById("errorMsg");

const ORIGINAL_BTN_TEXT = loginBtn.innerHTML;

/* =======================
   EVENT LISTENER
======================= */
loginBtn.addEventListener("click", handleGoogleLogin);

/* =======================
   LOGIN HANDLER
======================= */
async function handleGoogleLogin() {
  hideError();

  // UX: disable button + show loading
  loginBtn.disabled = true;
  loginBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Signing in...`;

  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);

    const user = result.user;
    const email = user.email;

    // 🔐 Check if user is an authorized admin
    const adminRef = doc(db, "admins", email);
    const adminSnap = await getDoc(adminRef);

    if (!adminSnap.exists() || adminSnap.data().active !== true) {
      await signOut(auth);
      showError("Access denied. You are not an authorized admin.");
      resetButton();
      return;
    }

    // ✅ Admin verified → redirect
    window.location.href = "index.html";

  } catch (err) {
    console.error("Login error:", err);
    showError("Login failed. Please try again.");
    resetButton();
  }
}

/* =======================
   UI HELPERS
======================= */
function showError(message) {
  errorMsg.innerText = message;
  errorMsg.style.display = "block";
}

function hideError() {
  errorMsg.style.display = "none";
}

function resetButton() {
  loginBtn.disabled = false;
  loginBtn.innerHTML = ORIGINAL_BTN_TEXT;
}

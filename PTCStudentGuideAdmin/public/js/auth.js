// auth.js
import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { doc, getDoc } from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

let currentAdmin = null;

export function protectAdminPage(onReady) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    const ref = doc(db, "admins", user.email);
    const snap = await getDoc(ref);

    if (!snap.exists() || snap.data().active !== true) {
      await signOut(auth);
      window.location.href = "login.html";
      return;
    }

    currentAdmin = {
      email: user.email,
      role: snap.data().role || "admin"
    };

    onReady(user, snap.data());
  });
}

export function getCurrentAdmin() {
  return currentAdmin;
}

export async function logout() {
  await signOut(auth);
  window.location.href = "login.html";
}

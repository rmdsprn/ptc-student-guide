import { db } from "./firebase.js";
import {
  collection,
  getCountFromServer,
  getDocs,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

/* =========================
   DASHBOARD MODULE
========================= */

export async function loadDashboardStats() {
  try {
    /* -------------------------
       BASIC COUNTS (EXISTING)
    -------------------------- */
    const chatsSnap = await getCountFromServer(
      collection(db, "chats")
    );

    const knowledgeSnap = await getCountFromServer(
      collection(db, "ptc_knowledge")
    );

    const adminsSnap = await getCountFromServer(
      collection(db, "admins")
    );

    setText("totalChats", chatsSnap.data().count);
    setText("totalKnowledge", knowledgeSnap.data().count);
    setText("totalAdmins", adminsSnap.data().count);

    /* -------------------------
       AI DECISION SUMMARY (NEW)
    -------------------------- */
    await loadAIDecisionSummary();

    /* -------------------------
       MOST ASKED TOPICS (NEW)
    -------------------------- */
    await loadTopIntents();

    /* -------------------------
       RECENT ACTIVITY (NEW)
    -------------------------- */
    await loadRecentActivity();

  } catch (err) {
    console.error("Failed to load dashboard stats:", err);
  }
}

/* =========================
   HELPERS
========================= */

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value ?? "—";
}

/* =========================
   AI HEALTH SUMMARY
========================= */

async function loadAIDecisionSummary() {
  try {
    const q = query(
      collection(db, "chats"),
      orderBy("updatedAt", "desc"),
      limit(50)
    );

    const snap = await getDocs(q);

    let autoMatched = 0;
    let needsApproval = 0;

    snap.forEach(doc => {
      const data = doc.data();
      if (data.aiDecision === "auto") autoMatched++;
      if (data.aiDecision === "approval") needsApproval++;
    });

    setText("aiAutoMatched", autoMatched);
    setText("aiNeedsApproval", needsApproval);

  } catch (err) {
    console.warn("AI summary unavailable:", err);
  }
}

/* =========================
   TOP INTENTS
========================= */

async function loadTopIntents() {
  try {
    const q = query(
      collection(db, "chats"),
      orderBy("updatedAt", "desc"),
      limit(100)
    );

    const snap = await getDocs(q);

    const counts = {};

    snap.forEach(doc => {
      const intent = doc.data().lastIntent;
      if (!intent) return;
      counts[intent] = (counts[intent] || 0) + 1;
    });

    const top = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const ul = document.getElementById("topIntents");
    if (!ul) return;

    ul.innerHTML = "";

    if (top.length === 0) {
      ul.innerHTML = "<li>No data yet</li>";
      return;
    }

    top.forEach(([intent, count]) => {
      const li = document.createElement("li");
      li.innerText = `${intent} (${count})`;
      ul.appendChild(li);
    });

  } catch (err) {
    console.warn("Top intents unavailable:", err);
  }
}

/* =========================
   RECENT ACTIVITY
========================= */

async function loadRecentActivity() {
  try {
    const q = query(
      collection(db, "ptc_knowledge"),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    const snap = await getDocs(q);
    const ul = document.getElementById("recentActivity");
    if (!ul) return;

    ul.innerHTML = "";

    if (snap.empty) {
      ul.innerHTML = "<li>No recent activity</li>";
      return;
    }

    snap.forEach(doc => {
      const data = doc.data();
      const li = document.createElement("li");
      li.innerText = `New knowledge added: ${data.category || "Uncategorized"}`;
      ul.appendChild(li);
    });

  } catch (err) {
    console.warn("Recent activity unavailable:", err);
  }
}

import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { db } from "./firebase.js";

/* =========================
   STATE
========================= */

let knowledgeTable = null;
let lastAISuggestion = null;
let matchedExistingIntentId = null;

/* =========================
   ENTRY / CLEANUP
========================= */

export async function initKnowledgeModule() {
  await setupKnowledgeUI();
  await initKnowledgeTable();
  bindKnowledgeEvents();
}

export function destroyKnowledgeTable() {
  if (knowledgeTable) {
    knowledgeTable.destroy();
    knowledgeTable = null;
  }
}

/* =========================
   UI SETUP
========================= */

async function setupKnowledgeUI() {
  await populateCategoryDropdown();
  resetKnowledgeModal();
  hideAISuggestionBox();
}

/* =========================
   CATEGORY DROPDOWN
========================= */

async function populateCategoryDropdown(selectedIntentId = null) {
  const select = document.getElementById("categoryInput");
  if (!select) return;

  select.innerHTML = `<option value="">Select category</option>`;

  const snap = await getDocs(collection(db, "ptc_intents"));

  snap.forEach(docSnap => {
    const data = docSnap.data();
    const opt = document.createElement("option");

    opt.value = docSnap.id;
    opt.textContent = data.label;
    opt.dataset.keywords = (data.keywords || []).join("|");

    select.appendChild(opt);
  });

  if (selectedIntentId) {
    select.value = selectedIntentId;
  }
}

/* =========================
   TABLE
========================= */

async function initKnowledgeTable() {
  destroyKnowledgeTable();

  knowledgeTable = new DataTable("#knowledgeTable", {
    pageLength: 10,
    order: [[2, "desc"]],
    columnDefs: [{ orderable: false, targets: 3 }]
  });

  await loadKnowledgeRows();
}

async function loadKnowledgeRows() {
  if (!knowledgeTable) return;

  knowledgeTable.clear();

  const intentsSnap = await getDocs(collection(db, "ptc_intents"));

  const intentLabelMap = {};
  intentsSnap.forEach(doc => {
    const data = doc.data();
    intentLabelMap[doc.id] = data.label;
  });

  const snap = await getDocs(collection(db, "ptc_knowledge"));

  snap.forEach(docSnap => {
    const d = docSnap.data();

    const displayCategory =
      intentLabelMap[d.category] || formatIntentId(d.category) || "-";

    knowledgeTable.row.add([
      displayCategory,
      d.content || "-",
      d.createdAt?.toDate().toLocaleString() || "-",
      `
        <button class="btn btn-sm btn-warning me-1 edit-btn" data-id="${docSnap.id}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger delete-btn" data-id="${docSnap.id}">
          <i class="fas fa-trash"></i>
        </button>
      `
    ]);
  });

  knowledgeTable.draw(false);
}


/* =========================
   EVENTS
========================= */

function bindKnowledgeEvents() {
  bindAddKnowledgeButton();
  bindSaveKnowledge();
  bindRowActions();
  bindAISuggestButton();
  bindApprovalButtons();
}

/* =========================
   ADD / SAVE
========================= */

function bindAddKnowledgeButton() {
  document.querySelector('[data-bs-target="#knowledgeModal"]')
    ?.addEventListener("click", () => {
      resetKnowledgeModal();
      hideAISuggestionBox();
    });
}

function bindSaveKnowledge() {
  document.getElementById("saveKnowledgeBtn")
    ?.addEventListener("click", async () => {
      const id = document.getElementById("knowledgeId").value;
      const category = document.getElementById("categoryInput").value;
      const content = document.getElementById("contentInput").value.trim();

      if (!category || !content) {
        alert("Please complete all fields.");
        return;
      }

      if (id) {
        await updateDoc(doc(db, "ptc_knowledge", id), {
          category,
          content,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, "ptc_knowledge"), {
          category,
          content,
          createdAt: serverTimestamp()
        });
      }

      bootstrap.Modal
        .getInstance(document.getElementById("knowledgeModal"))
        .hide();

      resetKnowledgeModal();
      hideAISuggestionBox();
      await loadKnowledgeRows();
    });
}

/* =========================
   ROW ACTIONS
========================= */

function bindRowActions() {
  document.querySelector("#knowledgeTable tbody")
    ?.addEventListener("click", async e => {
      const editBtn = e.target.closest(".edit-btn");
      const deleteBtn = e.target.closest(".delete-btn");

      if (editBtn) await handleEditKnowledge(editBtn.dataset.id);
      if (deleteBtn) await handleDeleteKnowledge(deleteBtn.dataset.id);
    });
}

async function handleEditKnowledge(id) {
  const snap = await getDoc(doc(db, "ptc_knowledge", id));
  if (!snap.exists()) return;

  const d = snap.data();
  document.getElementById("modalTitle").innerText = "Edit Knowledge";
  document.getElementById("knowledgeId").value = id;
  document.getElementById("categoryInput").value = d.category || "";
  document.getElementById("contentInput").value = d.content || "";

  hideAISuggestionBox();

  bootstrap.Modal
    .getOrCreateInstance(document.getElementById("knowledgeModal"))
    .show();
}

async function handleDeleteKnowledge(id) {
  if (!confirm("Delete this knowledge entry?")) return;
  await deleteDoc(doc(db, "ptc_knowledge", id));
  await loadKnowledgeRows();
}

/* =========================
   AI SUGGESTION
========================= */

function bindAISuggestButton() {
  document.getElementById("aiSuggestBtn")
    ?.addEventListener("click", async () => {
      const content = document.getElementById("contentInput").value.trim();
      if (!content) {
        alert("Please enter content first.");
        return;
      }

      setAISuggestLoading(true);

      try {
        const res = await fetch(
          "https://suggestintentfromknowledge-di4s3ywa5q-as.a.run.app",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ knowledge: content })
          }
        );

        const data = await res.json();
        lastAISuggestion = data.suggestion;
        handleAISuggestion(data.suggestion);

      } catch (err) {
        console.error("AI suggestion failed:", err);
        alert("AI suggestion failed.");
      } finally {
        setAISuggestLoading(false);
      }
    });
}

/* =========================
   ADMIN APPROVAL
========================= */

function bindApprovalButtons() {
  document.getElementById("applyKeywordsBtn")
    ?.addEventListener("click", async () => {
      if (!matchedExistingIntentId || !lastAISuggestion) return;

      if (!confirm("Apply AI-suggested keywords to this intent?")) return;

      await updateDoc(
        doc(db, "ptc_intents", matchedExistingIntentId),
        {
          keywords: arrayUnion(
            ...lastAISuggestion.keywords.map(normalizeKeyword)
          ),
          updatedAt: serverTimestamp()
        }
      );

      alert("Keywords applied.");
      await populateCategoryDropdown(matchedExistingIntentId);
      document.getElementById("applyKeywordsBtn").disabled = true;
      document.getElementById("applyKeywordsBtn").textContent = "Applied";
    });

  document.getElementById("createIntentBtn")
    ?.addEventListener("click", async () => {
      if (!lastAISuggestion) return;

      if (!confirm("Create new intent from AI suggestion?")) return;

      await setDoc(
        doc(db, "ptc_intents", lastAISuggestion.intentId),
        {
          label: lastAISuggestion.label,
          keywords: lastAISuggestion.keywords.map(normalizeKeyword),
          enabled: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      );

      alert("New Category created.");
      await populateCategoryDropdown(lastAISuggestion.intentId);
      createIntentBtn.disabled = true;
      createIntentBtn.textContent = "Created";
    });
}

/* =========================
   MATCHING + UX
========================= */

function normalizeKeyword(word) {
  return word.toLowerCase().trim().replace(/s$/, "");
}

function getMissingKeywords(existing, incoming) {
  return incoming.filter(k => !existing.includes(k));
}

function calculateConfidence(existing, incoming) {
  const overlap = existing.filter(k => incoming.includes(k)).length;
  return Math.min(100, Math.round((overlap / existing.length) * 100));
}

function highlightAutoSelectedCategory(select) {
  select.classList.add("ai-selected");
  setTimeout(() => select.classList.remove("ai-selected"), 2000);
}

function initTooltips() {
  document.querySelectorAll('[data-bs-toggle="tooltip"]')
    .forEach(el => new bootstrap.Tooltip(el));
}

function handleAISuggestion(suggestion) {
  if (!suggestion || !Array.isArray(suggestion.keywords)) {
    alert("Invalid AI suggestion received.");
    return;
  }

  const select = document.getElementById("categoryInput");
  const box = document.getElementById("aiSuggestionBox");
  const content = document.getElementById("aiSuggestionContent");
  const actions = document.getElementById("aiApprovalActions");
  const approvalBadge = document.getElementById("adminApprovalBadge");

  matchedExistingIntentId = null;

  // Reset UI state
  actions.classList.add("d-none");
  approvalBadge?.classList.add("d-none");

  const applyBtn = document.getElementById("applyKeywordsBtn");
  const createBtn = document.getElementById("createIntentBtn");

  applyBtn.classList.add("d-none");
  applyBtn.removeAttribute("disabled");
  applyBtn.textContent = "Apply Suggested Keywords";

  createBtn.classList.add("d-none");
  createBtn.removeAttribute("disabled");
  createBtn.textContent = "Create New Category";

  // Normalize incoming keywords
  const incomingKeywords = suggestion.keywords.map(k =>
    k.toLowerCase().trim()
  );

  // 🔒 CASE 1 — BACKEND CONFIRMS EXISTING INTENT
  if (suggestion.useExistingIntent === true) {
    matchedExistingIntentId = suggestion.intentId;

    // Auto-select category
    select.value = suggestion.intentId;
    highlightAutoSelectedCategory(select);

    // Get existing keywords from dropdown
    const selectedOption = select.selectedOptions[0];
    const existingKeywords = (selectedOption.dataset.keywords || "")
      .split("|")
      .map(k => k.toLowerCase().trim())
      .filter(Boolean);

    const missingKeywords = incomingKeywords.filter(
      k => !existingKeywords.includes(k)
    );

    content.innerHTML = `
      <strong>AI Result:</strong><br>
      AI suggests using the existing category:
      <b>${selectedOption.textContent}</b>

      <div class="mt-2 text-success">
        <i class="fas fa-check-circle"></i>
        Category has been automatically selected
      </div>
    `;

    // 🔔 Only require approval if something will change
    if (missingKeywords.length > 0) {
      approvalBadge?.classList.remove("d-none");
      actions.classList.remove("d-none");
      applyBtn.classList.remove("d-none");

      content.innerHTML += `
        <div class="mt-2">
          <strong>Suggested New Keywords:</strong><br>
          ${missingKeywords.join(", ")}
        </div>
      `;
    }

    box.classList.remove("d-none");
    initTooltips();
    return;
  }

  // 🔒 CASE 2 — NEW INTENT REQUIRED
  approvalBadge?.classList.remove("d-none");
  actions.classList.remove("d-none");
  createBtn.classList.remove("d-none");

  content.innerHTML = `
    <strong>AI Recommendation:</strong><br>
    Suggested new category (approval required):<br>
    <b>${suggestion.label}</b>

    <div class="mt-2">
      <strong>Suggested Keywords:</strong><br>
      ${suggestion.keywords.join(", ")}
    </div>
  `;

  box.classList.remove("d-none");
  initTooltips();
}


/* =========================
   HELPERS
========================= */

function resetKnowledgeModal() {
  document.getElementById("modalTitle").innerText = "Add Knowledge";
  document.getElementById("knowledgeId").value = "";
  document.getElementById("categoryInput").value = "";
  document.getElementById("contentInput").value = "";
  lastAISuggestion = null;
  matchedExistingIntentId = null;
}

function hideAISuggestionBox() {
  document.getElementById("aiSuggestionBox")?.classList.add("d-none");
}

function setAISuggestLoading(isLoading) {
  const btn = document.getElementById("aiSuggestBtn");
  if (!btn) return;

  if (isLoading) {
    btn.disabled = true;
    btn.innerHTML = `
      <span class="spinner-border spinner-border-sm me-2"></span>
      Analyzing...
    `;
  } else {
    btn.disabled = false;
    btn.innerHTML = `
      <i class="fas fa-magic"></i> AI Suggest Category
    `;
  }
}

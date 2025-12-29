import { db } from "./firebase.js";
import {
    collection,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";


/* =========================
   INTENTS MODULE
========================= */

let intentDataTable = null;

/* ---------- ENTRY POINT ---------- */
export async function initIntentModule() {
    initIntentTable();
    bindIntentEvents();
}

/* ---------- TABLE ---------- */
function initIntentTable() {
    destroyIntentTable();

    intentDataTable = new DataTable("#intentTable", {
        pageLength: 10,
        order: [[0, "asc"]],
        columnDefs: [{ orderable: false, targets: 4 }]
    });

    loadIntentRows();
}

export function destroyIntentTable() {
    if (intentDataTable) {
        intentDataTable.destroy();
        intentDataTable = null;
    }
}

/* ---------- DATA ---------- */
async function loadIntentRows() {
    if (!intentDataTable) return;

    intentDataTable.clear();

    const snap = await getDocs(collection(db, "ptc_intents"));

    snap.forEach(docSnap => {
        const d = docSnap.data();

        const keywords = (d.keywords || []).join(", ");
        const statusBadge = d.enabled
            ? `<span class="badge bg-success">Enabled</span>`
            : `<span class="badge bg-secondary">Disabled</span>`;

        intentDataTable.row.add([
            d.label || "-",
            keywords,
            statusBadge,
            d.updatedAt?.toDate().toLocaleString() || "-",
            `
        <button class="btn btn-sm btn-warning me-1 edit-intent"
          data-id="${docSnap.id}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger delete-intent"
          data-id="${docSnap.id}">
          <i class="fas fa-trash"></i>
        </button>
      `
        ]);
    });

    intentDataTable.draw(false);
}

/* ---------- EVENTS ---------- */
function bindIntentEvents() {
    bindAddIntentButton();
    bindSaveIntent();
    bindIntentActions();
}

function bindAddIntentButton() {
    const btn = document.getElementById("addIntentBtn");
    if (!btn) return;

    btn.onclick = () => openAddIntent();
}

function bindIntentActions() {
    const tbody = document.querySelector("#intentTable tbody");
    if (!tbody) return;

    tbody.onclick = async (e) => {
        const editBtn = e.target.closest(".edit-intent");
        const deleteBtn = e.target.closest(".delete-intent");

        if (editBtn) await openEditIntent(editBtn.dataset.id);
        if (deleteBtn) await deleteIntent(deleteBtn.dataset.id);
    };
}

/* ---------- ACTIONS ---------- */
function openAddIntent() {
    resetIntentModal();
    document.getElementById("intentModalTitle").innerText = "Add Intent";

    bootstrap.Modal
        .getOrCreateInstance(document.getElementById("intentModal"))
        .show();
}

async function openEditIntent(id) {
    const snap = await getDoc(doc(db, "ptc_intents", id));
    if (!snap.exists()) return;

    const d = snap.data();

    document.getElementById("intentId").value = id;
    document.getElementById("intentLabel").value = d.label || "";
    document.getElementById("intentKeywords").value =
        (d.keywords || []).join(", ");
    document.getElementById("intentEnabled").checked = d.enabled === true;

    document.getElementById("intentModalTitle").innerText = "Edit Intent";

    bootstrap.Modal
        .getOrCreateInstance(document.getElementById("intentModal"))
        .show();
}

async function deleteIntent(intentId) {
    const confirmed = confirm(
        "Are you sure you want to delete this intent category?\n\n" +
        "This may affect chatbot classification."
    );
    if (!confirmed) return;

    await deleteDoc(doc(db, "ptc_intents", intentId));
    await loadIntentRows();
}

/* ---------- SAVE ---------- */
function bindSaveIntent() {
    const btn = document.getElementById("saveIntentBtn");
    if (!btn) return;

    btn.onclick = async () => {
        const id = document.getElementById("intentId").value.trim();
        const label = document.getElementById("intentLabel").value.trim();
        const enabled = document.getElementById("intentEnabled").checked;

        const keywords = document
            .getElementById("intentKeywords")
            .value
            .split(",")
            .map(k => k.trim())
            .filter(Boolean);

        if (!label || keywords.length === 0) {
            alert("Label and keywords are required.");
            return;
        }

        const payload = {
            label,
            keywords,
            enabled,
            updatedAt: serverTimestamp()
        };

        if (id) {
            await updateDoc(doc(db, "ptc_intents", id), payload);
        } else {
            const newId = label.toLowerCase().replace(/\s+/g, "_");
            await setDoc(doc(db, "ptc_intents", newId), payload);
        }

        bootstrap.Modal
            .getInstance(document.getElementById("intentModal"))
            .hide();

        resetIntentModal();
        await loadIntentRows();
    };
}

/* ---------- MODAL ---------- */
function resetIntentModal() {
    document.getElementById("intentId").value = "";
    document.getElementById("intentLabel").value = "";
    document.getElementById("intentKeywords").value = "";
    document.getElementById("intentEnabled").checked = true;
    document.getElementById("intentModalTitle").innerText = "Add Intent";
}

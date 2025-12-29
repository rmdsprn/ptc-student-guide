import { auth, db } from "./firebase.js";
import {
    collection,
    getDocs,
    getDoc,
    setDoc,
    deleteDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { getCurrentAdmin } from "./auth.js";


/* =========================
   ADMINS MODULE
========================= */

let adminDataTable = null;

/* ---------- ENTRY POINT ---------- */
export async function initAdminModule() {
    const admin = getCurrentAdmin();

    if (!admin || admin.role !== "super_admin") {
        document.getElementById("main-container").innerHTML = `
      <div class="alert alert-danger">
        You do not have permission to manage admin accounts.
      </div>
    `;
        return;
    }

    await initAdminTable();
    bindAdminEvents();
}


/* ---------- TABLE ---------- */
async function initAdminTable() {
    destroyAdminTable();

    adminDataTable = new DataTable("#adminTable", {
        pageLength: 10,
        columns: [
            { title: "Email" },
            { title: "Role" },
            { title: "Status" },
            { title: "Created At" },
            { title: "Actions", orderable: false }
        ]
    });

    await loadAdminRows();
}

export function destroyAdminTable() {
    if (adminDataTable) {
        adminDataTable.destroy();
        adminDataTable = null;
    }
}

/* ---------- DATA ---------- */
async function loadAdminRows() {
    if (!adminDataTable) return;

    adminDataTable.clear();

    const snap = await getDocs(collection(db, "admins"));

    snap.forEach(docSnap => {
        const d = docSnap.data();

        adminDataTable.row.add([
            d.email,
            d.role || "admin",
            d.active
                ? `<span class="badge bg-success">Active</span>`
                : `<span class="badge bg-secondary">Disabled</span>`,
            d.createdAt?.toDate().toLocaleString() || "-",
            `
        <button class="btn btn-sm btn-warning edit-admin" data-id="${docSnap.id}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger delete-admin" data-id="${docSnap.id}">
          <i class="fas fa-trash"></i>
        </button>
      `
        ]);
    });

    adminDataTable.draw(false);
}

/* ---------- EVENTS ---------- */
function bindAdminEvents() {
    bindAdminTableActions();
    bindAdminSave();
    bindAddAdminButton();
}

function bindAdminTableActions() {
    const tbody = document.querySelector("#adminTable tbody");
    if (!tbody) return;

    tbody.onclick = async (e) => {
        const editBtn = e.target.closest(".edit-admin");
        const deleteBtn = e.target.closest(".delete-admin");

        /* ===== EDIT ===== */
        if (editBtn) {
            const id = editBtn.dataset.id;
            const snap = await getDoc(doc(db, "admins", id));
            if (!snap.exists()) return;

            const d = snap.data();

            document.getElementById("adminId").value = id;
            document.getElementById("adminEmailInput").value = d.email;
            document.getElementById("adminEmailInput").disabled = true;
            document.getElementById("adminRoleInput").value = d.role || "admin";
            document.getElementById("adminActiveInput").checked = d.active;

            document.getElementById("adminModalTitle").innerText = "Edit Admin";

            bootstrap.Modal
                .getOrCreateInstance(document.getElementById("adminModal"))
                .show();
        }

        /* ===== DELETE ===== */
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (!confirm("Remove this admin account?")) return;

            await deleteDoc(doc(db, "admins", id));
            await loadAdminRows();
        }
    };
}

function bindAdminSave() {
    const current = getCurrentAdmin();
    if (current.role !== "super_admin") {
        alert("Only super admins can manage admin accounts.");
        return;
    }

    const btn = document.getElementById("saveAdminBtn");
    if (!btn) return;

    btn.onclick = async () => {
        const id = document.getElementById("adminId").value.trim();
        const email = document.getElementById("adminEmailInput").value.trim();
        const role = document.getElementById("adminRoleInput").value;
        const active = document.getElementById("adminActiveInput").checked;

        if (!email) {
            alert("Email is required");
            return;
        }

        const payload = {
            email,
            role,
            active,
            updatedAt: serverTimestamp()
        };

        if (id) {
            await setDoc(doc(db, "admins", id), payload, { merge: true });
        } else {
            await setDoc(doc(db, "admins", email), {
                ...payload,
                createdAt: serverTimestamp(),
                createdBy: auth.currentUser.email
            });
        }

        resetAdminModal();

        bootstrap.Modal
            .getInstance(document.getElementById("adminModal"))
            .hide();

        await loadAdminRows();
    };
}

function bindAddAdminButton() {
    const btn = document.getElementById("addAdminBtn");
    if (!btn) return;

    btn.onclick = () => openAddAdmin();
}

/* ---------- MODAL ---------- */
function openAddAdmin() {
    resetAdminModal();
    document.getElementById("adminModalTitle").innerText = "Add Admin";

    bootstrap.Modal
        .getOrCreateInstance(document.getElementById("adminModal"))
        .show();
}

function resetAdminModal() {
    document.getElementById("adminId").value = "";
    document.getElementById("adminEmailInput").value = "";
    document.getElementById("adminEmailInput").disabled = false;
    document.getElementById("adminRoleInput").value = "admin";
    document.getElementById("adminActiveInput").checked = true;
    document.getElementById("adminModalTitle").innerText = "Add Admin";
}


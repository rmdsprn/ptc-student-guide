const admin = require("firebase-admin");
const path = require("path");

// 🔐 Load service account key (adjust path if needed)
const serviceAccount = require(path.join(
  __dirname,
  "../functions/ptc-student-guide-firebase-adminsdk-fbsvc-56ed5d1ed5.json"
));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seedAdmins() {
  try {
    const adminEmail = "rsparan@paterostechnologicalcollege.edu.ph";

    // ✅ EMAIL AS DOCUMENT ID
    await db.collection("admins").doc(adminEmail).set({
      email: adminEmail,
      role: "admin",
      active: true,
      createdBy: "seed-script",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log("✅ Admin seeded successfully:", adminEmail);
    process.exit(0);

  } catch (err) {
    console.error("❌ Failed to seed admin:", err);
    process.exit(1);
  }
}

seedAdmins();

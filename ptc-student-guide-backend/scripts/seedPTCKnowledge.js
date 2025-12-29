const admin = require("firebase-admin");
const serviceAccount = require("../functions/ptc-student-guide-firebase-adminsdk-fbsvc-56ed5d1ed5.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seed() {
  const data = [
  {
    category: "college_info",
    content:
      "Pateros Technological College (PTC) is an institution of higher learning committed to the holistic development of students through quality education in scientific, technological, industrial, and vocational fields."
  },
  {
    category: "college_info",
    content:
      "PTC is located at 205 College Street, Sto. Rosario-Kanluran, Pateros, Metro Manila."
  },
  {
    category: "college_info",
    content:
      "Pateros Technological College was established on January 29, 1993 and began operations on August 16, 1993."
  },
  {
    category: "mis_staff",
    content:
      "The MIS Department is headed by Julius Codilan. Staff members include Cristy Oropesa, Geraldine Mae Tamboong, Rey Abarracozo, and Joshua Mendoza."
  },
  {
    category: "enrollment",
    content:
      "First semester enrollment usually takes place during the first two weeks of June. Late enrollment is held on the third week with penalty fees."
  },
  {
    category: "admission_requirements",
    content:
      "New students must submit Form 138 or Form 137, PSA Birth Certificate, Certificate of Good Moral Character, a recent 2x2 photo, and a long white folder with plastic cover."
  },
  {
    category: "scholarship",
    content:
      "PTC offers scholarships such as the Barangay Scholar program, Tulong Dunong Program (TDP), and Tertiary Education Subsidy (TES) under RA 10931."
  },
  {
    category: "grading",
    content:
      "PTC uses a numerical grading system where 97–100 is equivalent to 1.00 (highest) and 74 and below is considered failing."
  },
  {
    category: "executive_class",
    content:
      "The Executive Class is a flexible program for working professionals offering BSIT and BSOA, with classes held on weekday evenings and Saturdays."
  },
  {
    category: "student_rights",
    content:
      "Students have the right to quality education, access guidance services, obtain official records, publish student materials, and participate in recognized organizations."
  },
  {
    category: "student_duties",
    content:
      "Students are expected to uphold academic integrity, maintain discipline, participate in civic affairs, and act responsibly within the college community."
  }
];

  const batch = db.batch();
  data.forEach(item => {
    const ref = db.collection("ptc_knowledge").doc();
    batch.set(ref, {
      ...item,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  await batch.commit();
  console.log("✅ PTC knowledge seeded successfully");
}

seed().catch(console.error);

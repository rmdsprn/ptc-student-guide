const admin = require("firebase-admin");
const serviceAccount = require("../functions/ptc-student-guide-firebase-adminsdk-fbsvc-56ed5d1ed5.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seedIntents() {
  const intents = [
    {
      id: "college_info",
      label: "College Information",
      keywords: [
        // General
        "what is ptc",
        "about ptc",
        "college info",
        "ptc information",
        "history of ptc",
        "vision",
        "mission",
        "where is ptc",
        "ptc location",

        // 🔥 President / leadership (NEW)
        "president",
        "college president",
        "school president",
        "head of the school",
        "who is the president",
        "ptc president"
      ]
    },
    {
      id: "mis_staff",
      label: "MIS Department",
      keywords: [
        "mis staff",
        "mis department",
        "who handles computers",
        "it office",
        "technical support",
        "system admin",
        "mis office"
      ]
    },
    {
      id: "enrollment",
      label: "Enrollment",
      keywords: [
        "enroll",
        "enrollment",
        "register",
        "registration",
        "how to enroll",
        "sign up",
        "when is enrollment"
      ]
    },
    {
      id: "admission_requirements",
      label: "Admission Requirements",
      keywords: [
        "requirements",
        "admission requirements",
        "what to submit",
        "needed documents",
        "requirements for freshmen",
        "requirements for transferee"
      ]
    },
    {
      id: "scholarship",
      label: "Scholarships",
      keywords: [
        "scholarship",
        "financial aid",
        "barangay scholar",
        "tulong dunong",
        "tes",
        "free tuition"
      ]
    },
    {
      id: "grading",
      label: "Grading System",
      keywords: [
        "grading",
        "grading system",
        "passing grade",
        "grade equivalent",
        "failing grade",
        "how grades work"
      ]
    },
    {
      id: "executive_class",
      label: "Executive Class",
      keywords: [
        "executive class",
        "working student",
        "working professional",
        "night class",
        "evening class",
        "weekend class",
        "bsit executive",
        "bsoa executive"
      ]
    },
    {
      id: "student_rights",
      label: "Student Rights",
      keywords: [
        "student rights",
        "rights of students",
        "what are my rights",
        "student privileges"
      ]
    },
    {
      id: "student_duties",
      label: "Student Duties",
      keywords: [
        "student duties",
        "student responsibilities",
        "what are my duties",
        "student obligations"
      ]
    }
  ];

  const batch = db.batch();

  intents.forEach(intent => {
    const ref = db.collection("ptc_intents").doc(intent.id);
    batch.set(ref, {
      label: intent.label,
      keywords: intent.keywords,
      enabled: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  await batch.commit();
  console.log("✅ PTC intents seeded successfully");
}

seedIntents().catch(console.error);

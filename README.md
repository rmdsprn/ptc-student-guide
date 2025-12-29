# 📘 PTC Student Guide
### AI-Assisted Student Information System

---

## 📌 Project Overview

**PTC Student Guide** is an AI-assisted chatbot system developed to help students of **Pateros Technological College (PTC)** access academic and institutional information through a conversational mobile application.

The system integrates artificial intelligence with a human-in-the-loop knowledge management process, ensuring that chatbot responses remain accurate, relevant, and up to date.

This project was developed as a **Capstone Project**, focusing on conversational information delivery, AI-assisted knowledge management, and secure cloud-based deployment.

---

## 🎯 Objectives

- Provide students with **quick and accurate access** to school-related information  
- Reduce manual inquiries handled by school staff  
- Assist administrators in managing chatbot knowledge efficiently  
- Prevent duplicate or fragmented chatbot intents  
- Maintain control over AI behavior through **admin approval workflows**

---

## 🧩 System Structure (Monorepo)

```
ptc-student-guide/
├── mobile-app/        # Android application for students
├── admin-web/         # Web-based admin dashboard
├── backend/           # Firebase backend and Cloud Functions
└── README.md
```

---

## 🧠 Key Features

### 📱 Student Mobile Application
- Conversational chatbot interface
- FAQ-style and contextual responses
- Android platform support
- Designed for ease of use and accessibility

### 🖥️ Admin Web Dashboard
- Knowledge base management (Add, Edit, Delete)
- Intent and keyword management
- AI-assisted intent and keyword suggestions
- Admin approval for AI-generated updates
- Role-based access control (Admin / Superadmin)

### ⚙️ Backend & AI
- Intent detection using keywords and context
- AI-assisted analysis of new knowledge
- Intent reuse and keyword expansion logic
- Secure cloud-based deployment
- Fallback handling for unanswered queries

---

## 🧪 Conceptual Framework

The system follows an **Input–Process–Output (IPO)** model:

### Input
- Student inquiries
- Admin-managed knowledge
- Intent categories and keywords

### Process
- Intent detection
- AI-assisted query analysis
- Knowledge retrieval
- Admin approval of AI suggestions
- Response generation

### Output
- Accurate chatbot responses
- Improved access to student information
- Reduced manual inquiries
- Enhanced student experience

---

## 🛠️ Technologies Used

### Frontend
- Android (Java / Kotlin)
- HTML, CSS, JavaScript
- Bootstrap (Admin Dashboard UI)

### Backend
- Firebase Firestore
- Firebase Hosting
- Firebase Authentication
- Firebase Cloud Functions
- Node.js

### Artificial Intelligence
- OpenAI API (intent suggestion and analysis)

### Tools & DevOps
- Git & GitHub (Monorepo)
- Firebase CLI
- Google Cloud Console

---

## 🚀 Deployment

### Backend
- Hosted using **Firebase Cloud Functions**
- Firestore used as the primary database

### Admin Dashboard
- Deployed via **Firebase Hosting**

### Mobile Application
- Distributed as an APK via **GitHub Releases**
- Android-only (iOS support identified as future work)

---

## 📦 Installation (Development Setup)

### Clone the repository
```bash
git clone https://github.com/<organization-or-username>/ptc-student-guide.git
cd ptc-student-guide
```

### Backend setup
```bash
cd backend
npm install
firebase deploy
```

### Admin dashboard (local)
```bash
cd admin-web
firebase serve
```

---

## 🔐 Security & Configuration

- Sensitive credentials are managed through **environment variables**
- Firebase Admin SDK service account keys are **not stored in the repository**
- Role-based access control is implemented for administrators
- AI-generated changes require **explicit admin approval**

---

## 📈 Scope and Limitations

### Included
- Android mobile application
- Admin-controlled knowledge management
- AI-assisted chatbot responses
- Secure cloud deployment

### Not Included (Future Enhancements)
- iOS application support
- Voice-based interaction
- Multilingual chatbot responses
- Advanced analytics and reporting

---

## 👥 Project Team

Developed as a **Capstone Project** by the project proponents of  
**Pateros Technological College**.

---

## 📄 License

This project is developed for **academic purposes**.  
All rights reserved to the project proponents and **Pateros Technological College**.

---

## 📬 Contact

For inquiries regarding the project:

📧 **ptc.studentguide@gmail.com**

# Prescriptime — Intelligent Prescription Organizer & Clinical Medicine Routine Platform

[![Next.js 15](https://img.shields.io/badge/Next.js-15.1-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![Sarvam AI](https://img.shields.io/badge/Sarvam_AI-TTS_bulbul:v3-FF6F00?style=for-the-badge)](https://www.sarvam.ai/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-3.5_Flash-8E75B2?style=for-the-badge&logo=google)](https://ai.google.dev/)

**Prescriptime** is a clinical-grade digital health application built with Next.js 15, React 19, TypeScript, Tailwind CSS, Lenis, and MongoDB Atlas. It empowers patients and caregivers to digitize physical doctor prescriptions, listen to plain-language audio explanations in their native language (powered by Sarvam AI and Google Gemini), manage personalized medicine routines without unwanted defaults, track date-wise adherence trends, monitor emergency medical profiles (EMR), and surface doctor follow-up reminders.

---

## 🌟 Key Capabilities & Features

### 1. Multi-Language Spoken Voice Explainer (Sarvam AI + Google Gemini)
- **Plain-Language Patient Translation**: Converts complex medical jargon and Latin clinical dosage frequencies (`OD`, `BD`, `TDS`, `QID`, `HS`, `PRN`, `PC`, `AC`) into warm, clear, conversational instructions using Google Gemini.
- **Natural Indic Speech Synthesis**: Integrates **Sarvam AI** (`bulbul:v3`) to stream clear, lifelike spoken audio in multiple languages:
  - **English (`en-IN`)**: Powered by Priya
  - **Hindi (`hi-IN`)**: Powered by Priya
  - **Telugu (`te-IN`)**: Powered by Kavitha
  - **Tamil (`ta-IN`)**: Powered by Priya
- **Resilient Audio Playback**: Features intelligent text chunking to respect API limits, synchronous browser audio priming to guarantee playback permissions, and graceful fallback to browser Web Speech API.

### 2. Document Extraction & Clinical AI Ingestion
- **Multi-Format Ingestion**: Supports `.png`, `.jpg`, `.jpeg`, `.webp`, and `.pdf` files up to 20MB, plus mobile camera capture.
- **Client-Side OCR**: Local pre-processing powered by `tesseract.js` and `pdf.js` with progress feedback and laser scan visualizer.
- **Healthcare Detector & Validation Shield**: Filters out non-medical noise, receipts, or corrupt files, and distinguishes between doctor prescriptions and diagnostic lab/radiology reports.
- **Structured Extraction**: Extracts doctor credentials, medical facility, prescription date, follow-up dates, diagnoses, and medication details (brand name, dosage, frequency, food timing, and duration).

### 3. User-Configured Daily Routine & Medicine Reminders
- **Zero Default Assumptions**: Uploaded medications start unselected. Daily routines and alarms are strictly user-configured to prevent unwanted default schedules.
- **Flexible Routine Slots**: Configure routine slots across Morning (08:00 AM), Afternoon (01:00 PM), Evening (06:00 PM), Bedtime (10:00 PM), or custom times.
- **Meal-Relative Timings**: Precise meal scheduling (*Before Food*, *After Food*, *With Meals*, *Empty Stomach*, *As Needed*).
- **Day-of-Week Alarm Repeat**: Set schedules for *Daily (Every day)*, *Weekdays*, *Weekends*, or custom days (`M`, `T`, `W`, `Th`, `Fri`, `Sat`, `Sun`).
- **Web Push Notifications**: Browser notification alerts triggered at exact scheduled dose times in Indian Standard Time (IST), backed by a service worker push dispatcher.

### 4. Auto Doctor-Visit Logging & Follow-Up Surfacing
- **Automatic Consultation History**: Automatically generates an associated Doctor Visit record upon saving an uploaded prescription or hospital record, preserving clinical continuity.
- **Active Follow-Up Banners**: Automatically calculates upcoming and overdue doctor visits from prescriptions and highlights them prominently on the dashboard.
- **Idempotent Storage**: Prevents duplicate visits while maintaining manual "Auto-Extract from Rx" capabilities.

### 5. Prescription Comparison & Clinical Diff Engine
- **Intelligent Regimen Comparison**: Compares consecutive prescriptions using Sørensen–Dice fuzzy string matching (0.82 similarity threshold) with drug name normalization.
- **Categorized Clinical Shifts**:
  - **Added Medications**: Highlights newly started drugs.
  - **Discontinued Medications**: Flags medications removed from the regimen.
  - **Dosage & Frequency Alterations**: Displays field-level changes (e.g. `500mg → 250mg`, `BD → OD`).
  - **Continuing Regimens**: Identifies unchanged medications.

### 6. Emergency Medical Record (EMR) & QR Sharing
- **Comprehensive Patient Profile**: Stores blood group, emergency contacts, primary doctor, chronic conditions, active allergies, and insurance info.
- **AI Clinical Health Summaries**: Gemini-powered clinical summary generation for emergency department handoffs.
- **Emergency Card & QR Code**: Generates an emergency profile card with an scannable QR code for rapid access by first responders.

### 7. Date-Wise Adherence Tracking & Health Trends
- **Daily Adherence History**: Visual trend chart showing doses taken vs. scheduled and daily adherence percentages.
- **Persistent Cloud Storage**: Adherence logs are saved to MongoDB Atlas via `/api/adherence` (`AdherenceRecord` collection) with offline-first local caching.
- **Streaks & Consistency**: Gamified streak badges and AI-assisted narrative progress reports.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router), [React 19](https://react.dev/) |
| **Language** | [TypeScript 5.7](https://www.typescriptlang.org/) (Strict Mode) |
| **Styling & Icons** | [Tailwind CSS 3.4](https://tailwindcss.com/), Lucide Icons, Glassmorphic design tokens |
| **Smooth Motion** | [Lenis](https://lenis.darkroom.engineering/) smooth scroll, [GSAP 3.12](https://gsap.com/) animations |
| **Database & ORM** | [MongoDB Atlas](https://www.mongodb.com/) via [Mongoose 9.9](https://mongoosejs.com/) |
| **Authentication** | [Firebase Auth](https://firebase.google.com/) (Google Sign-In, Email/Password, Guest Mode) |
| **AI Services** | [Google Gemini API](https://ai.google.dev/) (Extraction & Plain-Language Explanation) |
| **Voice / TTS** | [Sarvam AI](https://www.sarvam.ai/) (`bulbul:v3` Indic Text-to-Speech) |
| **OCR Engines** | [Tesseract.js](https://tesseract.projectnaptha.com/), [PDF.js](https://mozilla.github.io/pdf.js/) |
| **Notifications** | Web Push API, Service Workers, `web-push` background dispatcher |

---

## 📁 Project Architecture

```
├── secrets.env                       # Server secrets (API keys, DB URIs — gitignored)
├── package.json                      # Project dependencies & scripts
├── tailwind.config.ts                # Tailwind design system tokens
├── next.config.js                    # Next.js config with Content Security Policy
├── public/
│   ├── icon.svg                      # App icon & PWA favicon
│   ├── manifest.json                 # PWA Web Manifest
│   ├── sw.js                         # Push notification Service Worker
│   └── images/
│       └── prescriptime-login.jpg    # Authentication portal artwork
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Root layout with Lenis smooth scroll provider
│   │   ├── page.tsx                  # Core dashboard (Timeline, Cabinet, Follow-Ups, Adherence)
│   │   ├── globals.css               # Design system & dark mode tokens
│   │   ├── login/page.tsx            # Authentication portal
│   │   └── api/
│   │       ├── extract/route.ts      # Clinical AI extraction endpoint
│   │       ├── explain/route.ts      # Plain-language explanation generator
│   │       ├── explain/speak/route.ts# Sarvam AI TTS proxy route
│   │       ├── prescriptions/route.ts# User-scoped prescription management
│   │       ├── health-records/route.ts# Lab & radiology document records
│   │       ├── doses/route.ts        # Dose scheduling and status updates
│   │       ├── adherence/route.ts    # Date-wise adherence record persistence
│   │       ├── emr/route.ts          # Emergency medical profile API
│   │       └── push/                 # Push subscription & reminder dispatcher
│   ├── components/
│   │   ├── layout/                   # Header, MobileBottomNav, LenisProvider
│   │   ├── schedule/                 # DailyScheduleTimeline, DoseCard, RoutineReminderModal
│   │   ├── organizer/                # PrescriptionCabinet, PrescriptionDetailsModal, PrescriptionDiffView
│   │   ├── profile/                  # EMRProfileModal, EMRShareModal, ClinicalMarkdownRenderer
│   │   ├── upload/                   # DocumentUploadModal, ExtractionReviewModal, OCRScanProgress
│   │   └── auth/                     # LoginPage, GoogleAuthButton
│   ├── models/                       # Mongoose schemas: Prescription, HealthRecord, ScheduledDose, EMRProfile
│   ├── lib/                          # Storage & sync, voice explainer, follow-ups, OCR, MongoDB connection pool
│   └── types/                        # TypeScript domain definitions
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.17+ (v20+ recommended)
- **MongoDB**: MongoDB Atlas connection URI or local MongoDB instance
- **API Keys**: Google Gemini API key and Sarvam AI API key

### 2. Installation
```bash
git clone https://github.com/editor-shannu/hack_dev1.0.git
cd hack_dev1.0
npm install
```

### 3. Environment Configuration
Create a `secrets.env` file in the root directory (this file is gitignored):
```env
# MongoDB Atlas Database Connection
MONGODB_URL=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/?appName=Prescriptime

# Google Gemini API Key (Clinical Document Extraction & Explanations)
GEMINI_API_KEY=your_gemini_api_key_here

# Sarvam AI API Key (Indic Multi-Lingual Voice TTS)
SARVAM_API_KEY=your_sarvam_api_key_here

# Firebase & Google Authentication (Client-Side Safe)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Web Push VAPID Configuration
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:support@prescriptime.app
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build
```bash
npm run build
npm run start
```

---

## 🔒 Security & Data Privacy

1. **Multi-Tenant Scoping**: All database queries and mutations verify user authentication tokens and scope records strictly by `userId` to eliminate IDOR risks.
2. **Server-Side Secret Storage**: All API keys (`SARVAM_API_KEY`, `GEMINI_API_KEY`, `MONGODB_URL`, `VAPID_PRIVATE_KEY`) reside exclusively in server-side environment variables and are never bundled into client scripts.
3. **Zero Default Medication Doses**: The platform strictly respects user autonomy; medications are never automatically scheduled into active reminders without deliberate patient configuration.
4. **Content Security Policy**: Hardened headers ensure authorized resource loading while enabling necessary media streaming and audio playback.

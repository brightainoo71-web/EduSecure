# EduSecure — School Identity, Access & Disaster Recovery Platform

An enterprise cross-platform authentication, role-based access control (RBAC), and automated disaster-recovery system built for educational institutions across Web and Mobile.

## Core Architecture

- **Backend API (`/backend`)**: Node.js, Express, TypeScript, Zod, Nodemailer, Firebase Admin SDK
- **Cloud Database**: Google Cloud Firestore
- **Web Portal (`/frontend`)**: React 19, Vite, TypeScript, Tailwind CSS
- **Mobile Application (`/mobile`)**: React Native, Expo, TypeScript, Hardware-backed `expo-secure-store`

## Security & Cryptographic Features

- **User Identification & Verified Email Onboarding**: Unique UUID + normalized username + 6-digit SMTP email verification.
- **Argon2id + Server-Side Pepper**: Memory-hard Argon2id password hashing with per-user salts and HMAC-SHA256 server-side peppering, hardened with constant-time dummy verification against timing attacks.
- **Multi-Channel 2FA (RFC 6238 TOTP & Gmail Delivery)**: AES-256-GCM encrypted TOTP secrets at rest supporting both Authenticator QR codes and direct inbox code delivery.
- **Role-Based Access Control (RBAC)**: Segregated portals and middleware enforcement for `ADMIN`, `TEACHER`, and `STUDENT` roles, including restricted administrator provisioning (`/admin-register`).
- **Rotating Session Tokens**: Short-lived JWT access tokens paired with SHA-256 hashed rotating refresh tokens and token-reuse detection.
- **Automated Disaster Recovery**: Scheduled background Firestore snapshot exports with SHA-256 integrity checksum verification and point-in-time batch restoration.

\# Secure Role-Based Authentication System



A secure multi-factor authentication platform demonstrating modern cryptographic defenses, role-based access control (RBAC), and automated database backups.



\## System Components

\- \*\*Backend API\*\*: Node.js, Express, TypeScript, Zod, Firebase Admin SDK

\- \*\*Database\*\*: Google Cloud Firestore

\- \*\*Web Client\*\*: React, Vite, TypeScript, Tailwind CSS

\- \*\*Mobile Client\*\*: React Native, Expo, TypeScript

\- \*\*Security Primitives\*\*:

&#x20; - Argon2id password hashing with unique salt and server-side pepper

&#x20; - AES-256-GCM symmetric encryption for TOTP secrets

&#x20; - RFC 6238-compliant Time-based One-Time Passwords (TOTP)

&#x20; - Role-based authorization: GUEST, USER, ADMIN



\## Project Architecture

React Web \& Expo Mobile -> REST API (Node.js/Express) -> Google Cloud Firestore


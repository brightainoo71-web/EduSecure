import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

let dbInstance: Firestore | null = null;

export const initializeFirebase = (): Firestore => {
  if (dbInstance) {
    return dbInstance;
  }

  let serviceAccount: any;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    serviceAccount = JSON.parse(decoded);
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } else {
    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json';
    const resolvedPath = path.resolve(process.cwd(), keyPath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(
        `[FIREBASE ERROR] Service account key file not found at: ${resolvedPath}. ` +
        `Provide FIREBASE_SERVICE_ACCOUNT_BASE64 or ensure serviceAccountKey.json is in the backend root.`
      );
    }

    serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  }

  dbInstance = getFirestore();
  dbInstance.settings({ ignoreUndefinedProperties: true });

  console.log('[FIREBASE] Admin SDK initialized and Firestore connected.');
  return dbInstance;
};

export const getDb = (): Firestore => {
  if (!dbInstance) {
    return initializeFirebase();
  }
  return dbInstance;
}; 
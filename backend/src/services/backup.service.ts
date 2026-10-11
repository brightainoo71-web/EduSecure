import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { getDb } from '../config/firebase.js';

let BACKUP_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'backups')
  : path.resolve(process.cwd(), 'backups');

// Ensure backup directory exists safely across both persistent and serverless hosts
try {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
} catch {
  BACKUP_DIR = path.join(os.tmpdir(), 'backups');
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

interface BackupResult {
  timestamp: string;
  collectionsBackedUp: string[];
  totalRecords: number;
  filePath: string;
  checksum: string;
}

interface RestoreResult {
  filename: string;
  totalRecordsRestored: number;
  collectionsRestored: string[];
  restoredAt: string;
}

/**
 * Performs a complete JSON snapshot export of all critical collections.
 */
export async function performFirestoreBackup(): Promise<BackupResult> {
  const db = getDb();
  const collectionsToBackup = ['users', 'sessions', 'grades', '_health_check'];
  const backupData: Record<string, any[]> = {};
  let totalRecords = 0;

  for (const collName of collectionsToBackup) {
    const snapshot = await db.collection(collName).get();
    backupData[collName] = snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    }));
    totalRecords += snapshot.size;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `firestore-backup-${timestamp}.json`;
  const filePath = path.join(BACKUP_DIR, filename);

  const rawJson = JSON.stringify(
    {
      createdAt: new Date().toISOString(),
      collections: collectionsToBackup,
      data: backupData,
    },
    null,
    2
  );

  // Compute SHA-256 integrity checksum
  const checksum = crypto.createHash('sha256').update(rawJson).digest('hex');

  // Write backup snapshot to disk
  fs.writeFileSync(filePath, rawJson, 'utf-8');

  // Retention policy: Keep only the 10 most recent backups
  pruneOldBackups(10);

  console.log(`[BACKUP] Backup completed successfully: ${filename} (SHA-256: ${checksum})`);

  return {
    timestamp: new Date().toISOString(),
    collectionsBackedUp: collectionsToBackup,
    totalRecords,
    filePath,
    checksum,
  };
}

/**
 * Restores collections and documents from a given backup JSON snapshot.
 */
export async function restoreFirestoreBackup(filename: string): Promise<RestoreResult> {
  // Prevent directory traversal attacks
  const safeFilename = path.basename(filename);
  const filePath = path.join(BACKUP_DIR, safeFilename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Backup file "${safeFilename}" does not exist`);
  }

  const rawJson = fs.readFileSync(filePath, 'utf-8');

  // Verify file integrity
  const parsed = JSON.parse(rawJson);
  if (!parsed.data || typeof parsed.data !== 'object') {
    throw new Error('Invalid backup file format: missing "data" collection payload');
  }

  const db = getDb();
  let totalRecordsRestored = 0;
  const collectionsRestored: string[] = [];

  // Firestore allows up to 500 operations per write batch
  const BATCH_SIZE = 400;
  let currentBatch = db.batch();
  let opCount = 0;

  for (const [collName, docs] of Object.entries(parsed.data as Record<string, any[]>)) {
    collectionsRestored.push(collName);

    for (const docData of docs) {
      // Extract original doc ID
      const { _id, ...cleanData } = docData;
      const docId = _id || cleanData.id || cleanData.username;

      if (!docId) continue;

      const docRef = db.collection(collName).doc(docId);
      currentBatch.set(docRef, cleanData, { merge: true });
      opCount++;
      totalRecordsRestored++;

      if (opCount >= BATCH_SIZE) {
        await currentBatch.commit();
        currentBatch = db.batch();
        opCount = 0;
      }
    }
  }

  if (opCount > 0) {
    await currentBatch.commit();
  }

  console.log(`[RESTORE] Successfully restored ${totalRecordsRestored} records from ${safeFilename}`);

  return {
    filename: safeFilename,
    totalRecordsRestored,
    collectionsRestored,
    restoredAt: new Date().toISOString(),
  };
}

/**
 * Prunes backups older than the max keep count.
 */
function pruneOldBackups(maxKeep: number = 10) {
  try {
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((file) => file.startsWith('firestore-backup-') && file.endsWith('.json'))
      .map((file) => ({
        name: file,
        time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > maxKeep) {
      const filesToDelete = files.slice(maxKeep);
      for (const f of filesToDelete) {
        fs.unlinkSync(path.join(BACKUP_DIR, f.name));
        console.log(`[BACKUP] Pruned expired backup: ${f.name}`);
      }
    }
  } catch (err) {
    console.error('[BACKUP] Failed to prune old backups:', err);
  }
}

/**
 * Lists available backup files and their metadata.
 */
export function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((file) => file.endsWith('.json'));

  return files.map((file) => {
    const stats = fs.statSync(path.join(BACKUP_DIR, file));
    return {
      fileName: file,
      sizeBytes: stats.size,
      createdAt: stats.mtime.toISOString(),
    };
  });
} 
import fs from 'fs';
import path from 'path';
import { getDb } from '../config/firebase.js';

const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

export async function restoreFromBackup(backupFileName?: string) {
  const db = getDb();

  // Pick specified file or the most recent backup
  let targetFile = backupFileName;
  if (!targetFile) {
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((file) => file.startsWith('firestore-backup-') && file.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length === 0) {
      throw new Error('No backup files found in ' + BACKUP_DIR);
    }
    targetFile = files[0];
  }

  const filePath = path.join(BACKUP_DIR, targetFile);
  console.log(`[RESTORE] Reading backup file: ${filePath}`);

  const rawContent = fs.readFileSync(filePath, 'utf-8');
  const backupJson = JSON.parse(rawContent);

  if (!backupJson.data || !backupJson.collections) {
    throw new Error('Malformed backup JSON structure');
  }

  console.log(`[RESTORE] Restoring collections: ${backupJson.collections.join(', ')}`);

  for (const collName of backupJson.collections) {
    const records: any[] = backupJson.data[collName] || [];
    console.log(`[RESTORE] Restoring collection '${collName}' (${records.length} documents)...`);

    for (const record of records) {
      const docId = record._id;
      const dataToSave = { ...record };
      delete dataToSave._id;

      // Upsert document to Firestore
      await db.collection(collName).doc(docId).set(dataToSave, { merge: true });
    }
  }

  console.log(`[RESTORE] Database successfully restored from ${targetFile}`);
}

// Execute directly on invocation
const target = process.argv[2];
restoreFromBackup(target)
  .then(() => {
    console.log('[RESTORE] Operation finished successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[RESTORE] Restore failed:', err);
    process.exit(1);
  }); 
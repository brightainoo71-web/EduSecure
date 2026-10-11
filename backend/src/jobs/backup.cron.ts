import cron from 'node-cron';
import { performFirestoreBackup } from '../services/backup.service.js';

export function initializeBackupCron() {
  // Runs daily at 00:00 (Midnight). For testing, you can change to '*/10 * * * *' (every 10 mins)
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Starting automated daily Firestore database backup...');
    try {
      const result = await performFirestoreBackup();
      console.log(`[CRON] Backup created at: ${result.filePath}`);
    } catch (error) {
      console.error('[CRON] Automated backup failed:', error);
    }
  });

  console.log('[CRON] Scheduled daily Firestore backup service initialized.');
} 
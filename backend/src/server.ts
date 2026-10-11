import 'dotenv/config';
import app from './app.js';
import { initializeBackupCron } from './jobs/backup.cron.js';

const PORT = process.env.PORT || 5001;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[SERVER] API listening on http://localhost:${PORT}`);
    console.log(`[SERVER] Environment: ${process.env.NODE_ENV}`);

    // Initialize automated scheduled Firestore database backups
    initializeBackupCron();
  });
}

export default app;
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import {
  performFirestoreBackup,
  listBackups,
  restoreFirestoreBackup,
} from '../services/backup.service.js';
import {
  getAllUsers,
  toggleUserStatus,
  getSchoolRecords,
  submitStudentGrade,
} from '../controllers/admin.controller.js';

const router = Router();

// Endpoint accessible only to users with the ADMIN role (School Administrator)
router.get('/dashboard', requireAuth, requireRole(['ADMIN']), (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to the School Administrator Portal',
    portal: 'School Administration & Disaster Recovery',
    caller: req.user,
  });
});

// Endpoint accessible to Teachers and School Administrators
router.get('/teacher-portal', requireAuth, requireRole(['TEACHER', 'ADMIN']), (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to the Teacher Portal',
    portal: 'Classroom & Grading Center',
    caller: req.user,
    features: ['Gradebook Management', 'Attendance Records', 'Course Syllabus'],
  });
});

// Endpoint accessible to Students, Teachers, and School Administrators
router.get('/student-portal', requireAuth, requireRole(['STUDENT', 'TEACHER', 'ADMIN', 'USER']), (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to the Student Portal',
    portal: 'Student Academic Desk',
    caller: req.user,
    features: ['Class Schedule', 'Enrolled Courses', 'Academic Transcripts'],
  });
});

// List all generated database backups
router.get('/backups', requireAuth, requireRole(['ADMIN']), (req, res) => {
  try {
    const backups = listBackups();
    res.status(200).json({
      status: 'success',
      count: backups.length,
      backups,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Manually trigger a database backup
router.post('/backups/trigger', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const backupResult = await performFirestoreBackup();
    res.status(200).json({
      status: 'success',
      message: 'Automated snapshot backup created successfully',
      backup: backupResult,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Restore database from a specific snapshot
router.post('/backups/restore', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({
        status: 'error',
        message: 'Filename of the backup snapshot is required',
      });
    }

    const restoreResult = await restoreFirestoreBackup(filename);
    res.status(200).json({
      status: 'success',
      message: 'Database successfully restored from snapshot',
      result: restoreResult,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Admin User Directory: View all teachers, students, admins
router.get('/users', requireAuth, requireRole(['ADMIN']), getAllUsers);

// Admin User Action: Suspend or reactivate user
router.patch('/users/:username/status', requireAuth, requireRole(['ADMIN']), toggleUserStatus);

// School portal academic records (courses, grades)
router.get('/records', requireAuth, getSchoolRecords);

// Teacher/Admin action: Submit grade
router.post('/grades', requireAuth, requireRole(['TEACHER', 'ADMIN']), submitStudentGrade);

export default router; 
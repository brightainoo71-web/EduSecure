import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Request, Response } from 'express';
import { getDb } from '../config/firebase.js';

export const restoreBackup = async (req: Request, res: Response) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ status: 'error', message: 'Backup filename is required' });
    }

    const backupDir = path.resolve(process.cwd(), 'backups');
    const filePath = path.join(backupDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ status: 'error', message: 'Backup file not found' });
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const backupData = JSON.parse(fileContent);

    // Integrity check
    const calculatedHash = crypto.createHash('sha256').update(JSON.stringify(backupData.data)).digest('hex');
    if (backupData.integrityHash && backupData.integrityHash !== calculatedHash) {
      return res.status(400).json({ status: 'error', message: 'Integrity check failed: snapshot tampered or corrupt' });
    }

    const db = getDb();
    const batch = db.batch();

    // Restore collections (users, sessions, etc.)
    for (const [collectionName, docs] of Object.entries(backupData.data as Record<string, any[]>)) {
      for (const doc of docs) {
        const docRef = db.collection(collectionName).doc(doc.id || doc.username);
        batch.set(docRef, doc, { merge: true });
      }
    }

    await batch.commit();

    return res.status(200).json({
      status: 'success',
      message: `Database restored successfully from snapshot: ${filename}`,
      restoredAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[RESTORE ERROR]', error);
    return res.status(500).json({ status: 'error', message: 'Failed to restore database from backup' });
  }
};

/**
 * Lists all registered users (Teachers, Students, Administrators) with their roles and status.
 * Accessible to School Administrators.
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const snapshot = await db.collection('users').get();

    const users = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: data.id || doc.id,
        username: data.username || doc.id,
        displayName: data.displayName || data.username || doc.id,
        email: data.email || 'N/A',
        isEmailVerified: !!data.isEmailVerified,
        role: data.role || 'STUDENT',
        isActive: data.isActive !== false,
        isTwoFactorEnabled: !!data.isTwoFactorEnabled,
        createdAt: data.createdAt || 'N/A',
      };
    });

    const students = users.filter((u) => u.role === 'STUDENT' || u.role === 'USER');
    const teachers = users.filter((u) => u.role === 'TEACHER');
    const admins = users.filter((u) => u.role === 'ADMIN');

    return res.status(200).json({
      status: 'success',
      totalCount: users.length,
      counts: {
        students: students.length,
        teachers: teachers.length,
        admins: admins.length,
      },
      users,
      students,
      teachers,
      admins,
    });
  } catch (error: any) {
    console.error('[GET ALL USERS ERROR]', error);
    return res.status(500).json({ status: 'error', message: 'Failed to load school users' });
  }
};

/**
 * Toggles a user's active status (suspend/activate).
 */
export const toggleUserStatus = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    if (!username) {
      return res.status(400).json({ status: 'error', message: 'Username is required' });
    }

    const db = getDb();
    const userDocRef = db.collection('users').doc(username.toLowerCase());
    const doc = await userDocRef.get();

    if (!doc.exists) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const currentStatus = doc.data()?.isActive !== false;
    const newStatus = !currentStatus;

    await userDocRef.update({
      isActive: newStatus,
      updatedAt: new Date().toISOString(),
    });

    return res.status(200).json({
      status: 'success',
      message: `User status successfully updated to ${newStatus ? 'Active' : 'Suspended'}`,
      isActive: newStatus,
    });
  } catch (error: any) {
    console.error('[TOGGLE USER STATUS ERROR]', error);
    return res.status(500).json({ status: 'error', message: 'Failed to update user status' });
  }
};

/**
 * Get school demo records (grades, courses, attendance).
 */
export const getSchoolRecords = async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const gradesSnap = await db.collection('grades').limit(50).get();
    const grades = gradesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return res.status(200).json({
      status: 'success',
      grades,
      courses: [
        { id: 'CS101', name: 'Introduction to Computer Science', credits: 4, teacher: 'Dr. Johnson' },
        { id: 'SEC202', name: 'Cybersecurity & Cryptography', credits: 3, teacher: 'Prof. Miller' },
        { id: 'MATH301', name: 'Applied Linear Algebra', credits: 3, teacher: 'Dr. Bright' },
        { id: 'DB401', name: 'Database Architecture & Cloud Storage', credits: 4, teacher: 'Prof. Evans' },
      ],
    });
  } catch (error: any) {
    console.error('[GET SCHOOL RECORDS ERROR]', error);
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve school records' });
  }
};

/**
 * Add or update student grade (Teacher or Admin action).
 */
export const submitStudentGrade = async (req: Request, res: Response) => {
  try {
    const { studentUsername, courseCode, grade, feedback } = req.body;
    if (!studentUsername || !courseCode || !grade) {
      return res.status(400).json({ status: 'error', message: 'studentUsername, courseCode, and grade are required' });
    }

    const db = getDb();
    const gradeId = `${studentUsername.toLowerCase()}_${courseCode.toUpperCase()}`;
    const gradeRef = db.collection('grades').doc(gradeId);

    const gradeData = {
      studentUsername: studentUsername.toLowerCase(),
      courseCode: courseCode.toUpperCase(),
      grade: grade.toUpperCase(),
      feedback: feedback || '',
      submittedBy: req.user?.username,
      updatedAt: new Date().toISOString(),
    };

    await gradeRef.set(gradeData, { merge: true });

    return res.status(200).json({
      status: 'success',
      message: `Grade successfully submitted for ${studentUsername}`,
      gradeRecord: gradeData,
    });
  } catch (error: any) {
    console.error('[SUBMIT GRADE ERROR]', error);
    return res.status(500).json({ status: 'error', message: 'Failed to submit grade' });
  }
};
 
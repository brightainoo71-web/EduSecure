import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export const DashboardScreen = () => {
  const { user, logout, updateUser2FAStatus } = useAuth();

  // 2FA in-app enablement state
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Portal records state
  const [courses, setCourses] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);

  // Teacher grade submission state
  const [studentTarget, setStudentTarget] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('CS101');
  const [gradeScore, setGradeScore] = useState('A');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [submittingGrade, setSubmittingGrade] = useState(false);

  // Attendance simulation
  const [attendanceDone, setAttendanceDone] = useState(false);

  // Admin user directory
  const [schoolUsers, setSchoolUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchPortalData = async () => {
    try {
      const res = await api.get('/admin/records');
      setCourses(res.data.courses || []);
      setGrades(res.data.grades || []);
    } catch {
      // Ignore network errors in demo
    }

    if (user?.role === 'ADMIN') {
      setLoadingUsers(true);
      try {
        const uRes = await api.get('/admin/users');
        setSchoolUsers(uRes.data.users || []);
      } catch {
        // Ignore
      } finally {
        setLoadingUsers(false);
      }
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, [user]);

  const handleStart2FA = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    setTwoFaLoading(true);
    try {
      const res = await api.post('/auth/2fa/setup');
      setQrCodeData(res.data.qrCode);
      setStatusMsg(
        res.data.emailSentTo
          ? `2FA code dispatched to ${res.data.emailSentTo}. Enter it below.`
          : '2FA initialized. Enter your 6-digit confirmation code.'
      );
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to start 2FA');
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleVerifyEnable2FA = async () => {
    setErrorMsg(null);
    setTwoFaLoading(true);
    try {
      await api.post('/auth/2fa/verify', {
        code: totpCode,
        token: totpCode,
        totpToken: totpCode,
      });
      updateUser2FAStatus(true);
      setQrCodeData(null);
      setStatusMsg('Two-Factor Authentication is now active on your account!');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Invalid 2FA code');
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleSubmitGrade = async () => {
    if (!studentTarget.trim()) {
      setErrorMsg('Enter student username');
      return;
    }
    setErrorMsg(null);
    setSubmittingGrade(true);
    try {
      const res = await api.post('/admin/grades', {
        studentUsername: studentTarget,
        courseCode: selectedCourse,
        grade: gradeScore,
        feedback: gradeFeedback,
      });
      setStatusMsg(res.data.message || 'Grade recorded successfully');
      setStudentTarget('');
      setGradeFeedback('');
      await fetchPortalData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed submitting grade');
    } finally {
      setSubmittingGrade(false);
    }
  };

  const myGrades = grades.filter(
    (g) => g.studentUsername?.toLowerCase() === user?.username.toLowerCase()
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileHeaderRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.username?.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{user?.username}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'No email registered'}</Text>
          </View>
          <View
            style={[
              styles.roleTag,
              user?.role === 'ADMIN'
                ? styles.roleAdmin
                : user?.role === 'TEACHER'
                ? styles.roleTeacher
                : styles.roleStudent,
            ]}
          >
            <Text style={styles.roleTagText}>
              {user?.role === 'ADMIN' ? 'Admin' : user?.role === 'TEACHER' ? 'Teacher' : 'Student'}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            2FA Security:{' '}
            <Text style={{ color: user?.isTwoFactorEnabled ? '#4ade80' : '#f59e0b', fontWeight: 'bold' }}>
              {user?.isTwoFactorEnabled ? 'Active (Secured)' : 'Disabled'}
            </Text>
          </Text>
        </View>
      </View>

      {/* Status Alerts */}
      {statusMsg ? <Text style={styles.successBanner}>{statusMsg}</Text> : null}
      {errorMsg ? <Text style={styles.errorBanner}>{errorMsg}</Text> : null}

      {/* ========================================== */}
      {/* ROLE 1: SCHOOL ADMINISTRATOR DIRECTORY */}
      {/* ========================================== */}
      {user?.role === 'ADMIN' && (
        <View style={styles.workspaceCard}>
          <Text style={styles.sectionTitle}>🏛️ School Directory & Members</Text>
          <Text style={styles.sectionSubtitle}>
            Viewing all teachers, students, and administrators registered in Firestore.
          </Text>

          {loadingUsers ? (
            <ActivityIndicator color="#a855f7" style={{ marginVertical: 12 }} />
          ) : (
            <View style={styles.userList}>
              {schoolUsers.map((u) => (
                <View key={u.id} style={styles.userRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowUsername}>{u.username}</Text>
                    <Text style={styles.rowEmail}>{u.email || 'N/A'}</Text>
                  </View>
                  <View
                    style={[
                      styles.smallRoleTag,
                      u.role === 'ADMIN'
                        ? styles.roleAdmin
                        : u.role === 'TEACHER'
                        ? styles.roleTeacher
                        : styles.roleStudent,
                    ]}
                  >
                    <Text style={styles.smallRoleTagText}>{u.role}</Text>
                  </View>
                </View>
              ))}
              {schoolUsers.length === 0 && (
                <Text style={styles.emptyText}>No users found.</Text>
              )}
            </View>
          )}
        </View>
      )}

      {/* ========================================== */}
      {/* ROLE 2: TEACHER CLASSROOM WORKSPACE */}
      {/* ========================================== */}
      {user?.role === 'TEACHER' && (
        <View style={styles.workspaceCard}>
          <Text style={styles.sectionTitle}>📚 Teacher Classroom Center</Text>
          <Text style={styles.sectionSubtitle}>
            Submit student course marks and take daily attendance.
          </Text>

          {/* Daily Attendance button */}
          <TouchableOpacity
            style={[styles.actionBtn, attendanceDone && styles.actionBtnDone]}
            onPress={() => setAttendanceDone(true)}
            disabled={attendanceDone}
          >
            <Text style={styles.actionBtnText}>
              {attendanceDone ? '✓ Class Attendance Logged' : 'Log Today’s Classroom Attendance'}
            </Text>
          </TouchableOpacity>

          {/* Grade submission input */}
          <Text style={styles.inputLabel}>Submit Student Grade</Text>
          <TextInput
            style={styles.inputField}
            placeholder="Student Username (e.g. bright)"
            placeholderTextColor="#64748b"
            value={studentTarget}
            onChangeText={setStudentTarget}
          />
          <TextInput
            style={styles.inputField}
            placeholder="Awarded Grade (e.g. A+, A, B)"
            placeholderTextColor="#64748b"
            value={gradeScore}
            onChangeText={setGradeScore}
          />
          <TextInput
            style={styles.inputField}
            placeholder="Teacher Feedback (Optional)"
            placeholderTextColor="#64748b"
            value={gradeFeedback}
            onChangeText={setGradeFeedback}
          />

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmitGrade}
            disabled={submittingGrade}
          >
            {submittingGrade ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Post Student Grade</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ========================================== */}
      {/* ROLE 3: STUDENT ACADEMIC DESK */}
      {/* ========================================== */}
      {(user?.role === 'STUDENT' || user?.role === 'USER') && (
        <View style={styles.workspaceCard}>
          <Text style={styles.sectionTitle}>🎓 Student Academic Desk</Text>
          <Text style={styles.sectionSubtitle}>
            Your registered courses and official grade transcript.
          </Text>

          {/* Courses */}
          <Text style={styles.inputLabel}>Registered Courses</Text>
          <View style={styles.coursesGrid}>
            {courses.map((c) => (
              <View key={c.id} style={styles.courseItem}>
                <Text style={styles.courseCode}>{c.id}</Text>
                <Text style={styles.courseName}>{c.name}</Text>
                <Text style={styles.courseProf}>Prof: {c.teacher}</Text>
              </View>
            ))}
          </View>

          {/* Grades Transcript */}
          <Text style={[styles.inputLabel, { marginTop: 14 }]}>Official Report Card</Text>
          {myGrades.length > 0 ? (
            <View style={styles.gradesList}>
              {myGrades.map((g) => (
                <View key={g.id} style={styles.gradeRow}>
                  <Text style={styles.gradeCourse}>{g.courseCode}</Text>
                  <Text style={styles.gradeValue}>{g.grade}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No term grades posted yet.</Text>
          )}
        </View>
      )}

      {/* ========================================== */}
      {/* TWO FACTOR AUTHENTICATION MANAGEMENT */}
      {/* ========================================== */}
      <View style={styles.workspaceCard}>
        <Text style={styles.sectionTitle}>🔒 Two-Factor Authentication (2FA)</Text>
        <Text style={styles.sectionSubtitle}>
          Receive security codes in your Gmail inbox or Google Authenticator.
        </Text>

        {!user?.isTwoFactorEnabled && !qrCodeData && (
          <TouchableOpacity
            style={styles.enable2faBtn}
            onPress={handleStart2FA}
            disabled={twoFaLoading}
          >
            {twoFaLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.enable2faBtnText}>Enable 2FA (Receive Code in Gmail)</Text>
            )}
          </TouchableOpacity>
        )}

        {qrCodeData && (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmText}>
              A 6-digit confirmation code was sent to your email. Enter it below to activate:
            </Text>
            <TextInput
              style={styles.codeField}
              placeholder="000000"
              placeholderTextColor="#64748b"
              keyboardType="number-pad"
              maxLength={6}
              value={totpCode}
              onChangeText={setTotpCode}
            />
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleVerifyEnable2FA}
              disabled={twoFaLoading || totpCode.length < 6}
            >
              <Text style={styles.confirmBtnText}>Confirm & Activate 2FA</Text>
            </TouchableOpacity>
          </View>
        )}

        {user?.isTwoFactorEnabled && (
          <Text style={styles.securedText}>
            ✓ 2FA is active. Every login requires your password and code.
          </Text>
        )}
      </View>

      {/* Logout button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Sign Out from EduSecure</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617', // Dark sleek slate-950
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  profileEmail: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  roleTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  roleAdmin: {
    backgroundColor: '#3b0764',
    borderColor: '#a855f7',
  },
  roleTeacher: {
    backgroundColor: '#022c22',
    borderColor: '#10b981',
  },
  roleStudent: {
    backgroundColor: '#172554',
    borderColor: '#3b82f6',
  },
  metaRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  metaText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  workspaceCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 14,
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  inputField: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: '#fff',
    marginBottom: 10,
  },
  submitBtn: {
    backgroundColor: '#059669',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  actionBtn: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#10b981',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 14,
  },
  actionBtnDone: {
    backgroundColor: '#064e3b',
  },
  actionBtnText: {
    color: '#34d399',
    fontSize: 13,
    fontWeight: '700',
  },
  coursesGrid: {
    gap: 8,
  },
  courseItem: {
    backgroundColor: '#020617',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  courseCode: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '700',
  },
  courseName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  courseProf: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  gradesList: {
    gap: 8,
  },
  gradeRow: {
    backgroundColor: '#020617',
    padding: 10,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  gradeCourse: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
  },
  gradeValue: {
    color: '#4ade80',
    fontSize: 16,
    fontWeight: '900',
  },
  userList: {
    gap: 8,
  },
  userRow: {
    backgroundColor: '#020617',
    padding: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  rowUsername: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  rowEmail: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 1,
  },
  smallRoleTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  smallRoleTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  enable2faBtn: {
    backgroundColor: '#4338ca',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  enable2faBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  confirmBox: {
    backgroundColor: '#020617',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  confirmText: {
    color: '#cbd5e1',
    fontSize: 12,
    marginBottom: 8,
  },
  codeField: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#4f46e5',
    borderRadius: 8,
    padding: 10,
    textAlign: 'center',
    letterSpacing: 6,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#38bdf8',
    marginBottom: 8,
  },
  confirmBtn: {
    backgroundColor: '#059669',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  securedText: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 8,
  },
  logoutBtn: {
    backgroundColor: '#991b1b',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  successBanner: {
    backgroundColor: '#052e16',
    color: '#4ade80',
    padding: 12,
    borderRadius: 12,
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#450a0a',
    color: '#f87171',
    padding: 12,
    borderRadius: 12,
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
});
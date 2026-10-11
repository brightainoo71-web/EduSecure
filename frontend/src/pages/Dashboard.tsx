import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  ShieldAlert,
  ShieldCheck,
  QrCode,
  GraduationCap,
  BookOpen,
  Award,
  CheckCircle2,
  Calendar,
  AlertCircle,
  PlusCircle,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, updateUser2FAStatus } = useAuth();

  // 2FA state
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // School Portal Live Interactive State
  const [records, setRecords] = useState<{ courses: any[]; grades: any[] }>({
    courses: [],
    grades: [],
  });

  // Teacher grade submission form
  const [gradeStudent, setGradeStudent] = useState('');
  const [gradeCourse, setGradeCourse] = useState('CS101');
  const [gradeScore, setGradeScore] = useState('A');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [submittingGrade, setSubmittingGrade] = useState(false);

  // Attendance simulation
  const [attendanceMarked, setAttendanceMarked] = useState(false);

  const fetchRecords = async () => {
    try {
      const res = await api.get('/admin/records');
      setRecords({
        courses: res.data.courses || [],
        grades: res.data.grades || [],
      });
    } catch (err) {
      console.error('Failed fetching school records', err);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const start2FASetup = async () => {
    setError(null);
    setMessage(null);
    try {
      const res = await api.post('/auth/2fa/setup');
      setQrCodeData(res.data.qrCode);
      setMessage(res.data.message || 'Scan the QR code or check your inbox.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to initialize 2FA');
    }
  };

  const verifyAndEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/auth/2fa/verify', {
        code: totpCode,
        token: totpCode,
        totpToken: totpCode,
      });
      updateUser2FAStatus(true);
      setQrCodeData(null);
      setMessage('Two-factor authentication successfully enabled on your account!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed. Try again.');
    }
  };

  const handleTeacherGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmittingGrade(true);
    try {
      const res = await api.post('/admin/grades', {
        studentUsername: gradeStudent,
        courseCode: gradeCourse,
        grade: gradeScore,
        feedback: gradeFeedback,
      });
      setMessage(res.data.message || 'Grade recorded successfully');
      setGradeStudent('');
      setGradeFeedback('');
      await fetchRecords();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed submitting student grade');
    } finally {
      setSubmittingGrade(false);
    }
  };

  // Student's grades filtered
  const myGrades = records.grades.filter(
    (g) => g.studentUsername?.toLowerCase() === user?.username.toLowerCase()
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Profile Card */}
        <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-extrabold text-2xl text-white shadow-xl shadow-blue-500/20">
                {user?.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                    {user?.username}
                  </h1>
                  {user?.isEmailVerified && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" /> Verified Account
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Email: <span className="text-slate-300 font-medium">{user?.email || 'N/A'}</span> • ID:{' '}
                  <span className="font-mono text-slate-400">{user?.id?.slice(0, 8)}...</span>
                </p>
              </div>
            </div>

            {/* Role Badge */}
            <div className="flex items-center gap-3">
              <div
                className={`px-4 py-2 rounded-2xl border text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${
                  user?.role === 'ADMIN'
                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/40 shadow-lg shadow-purple-900/20'
                    : user?.role === 'TEACHER'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-lg shadow-emerald-900/20'
                    : 'bg-blue-500/15 text-blue-300 border-blue-500/40 shadow-lg shadow-blue-900/20'
                }`}
              >
                {user?.role === 'ADMIN' ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                    <span>School Administrator</span>
                  </>
                ) : user?.role === 'TEACHER' ? (
                  <>
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    <span>Faculty Teacher</span>
                  </>
                ) : (
                  <>
                    <GraduationCap className="w-4 h-4 text-blue-400" />
                    <span>Enrolled Student</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Global Banner Messages */}
        {message && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-2xl text-sm flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl text-sm flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* INTERACTIVE ROLE-SPECIFIC WORKSPACES */}
        {/* ========================================================================= */}

        {/* TEACHER WORKSPACE */}
        {user?.role === 'TEACHER' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Grade Submission Form */}
            <div className="lg:col-span-1 p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl">
              <h2 className="text-base font-bold text-white flex items-center gap-2 mb-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" /> Submit Student Grade
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Record official course marks and feedback directly into the database.
              </p>

              <form onSubmit={handleTeacherGradeSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Student Username
                  </label>
                  <input
                    type="text"
                    required
                    value={gradeStudent}
                    onChange={(e) => setGradeStudent(e.target.value)}
                    placeholder="e.g. bright or student1"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Course Subject
                  </label>
                  <select
                    value={gradeCourse}
                    onChange={(e) => setGradeCourse(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {records.courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Awarded Grade
                  </label>
                  <select
                    value={gradeScore}
                    onChange={(e) => setGradeScore(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'Pass'].map((g) => (
                      <option key={g} value={g}>
                        Grade: {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Instructor Remarks
                  </label>
                  <input
                    type="text"
                    value={gradeFeedback}
                    onChange={(e) => setGradeFeedback(e.target.value)}
                    placeholder="e.g. Outstanding performance on midterm"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingGrade}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                >
                  {submittingGrade ? 'Submitting...' : 'Post Grade Record'}
                </button>
              </form>
            </div>

            {/* Teacher Rosters & Class Roster */}
            <div className="lg:col-span-2 space-y-6">
              {/* Classroom Attendance Card */}
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-400" /> Daily Class Attendance Roster
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Log today's lecture hall attendance status for scheduled courses.
                  </p>
                </div>
                <button
                  onClick={() => setAttendanceMarked(true)}
                  disabled={attendanceMarked}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    attendanceMarked
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                  }`}
                >
                  {attendanceMarked ? '✓ Today Marked Present' : 'Mark Daily Attendance'}
                </button>
              </div>

              {/* Submitted Student Grades List */}
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl">
                <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-400" /> Recorded Student Grades ({records.grades.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Student</th>
                        <th className="py-2.5 px-3">Course Code</th>
                        <th className="py-2.5 px-3">Grade</th>
                        <th className="py-2.5 px-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {records.grades.map((g) => (
                        <tr key={g.id} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-semibold text-slate-200">{g.studentUsername}</td>
                          <td className="py-2.5 px-3 font-mono text-purple-300">{g.courseCode}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">
                              {g.grade}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">{g.feedback || '—'}</td>
                        </tr>
                      ))}
                      {records.grades.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-500">
                            No grades submitted yet. Fill the form on the left.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STUDENT WORKSPACE */}
        {(user?.role === 'STUDENT' || user?.role === 'USER') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Courses Enrolled */}
            <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-400" /> Your Academic Course Load (Spring 2026)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {records.courses.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-blue-500/40 transition group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                        {c.id}
                      </span>
                      <span className="text-xs text-slate-400">{c.credits} Credits</span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-200 group-hover:text-white transition">
                      {c.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Instructor: {c.teacher}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Official Report Card */}
            <div className="lg:col-span-1 p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" /> Official Academic Transcript
              </h2>
              {myGrades.length > 0 ? (
                <div className="space-y-3">
                  {myGrades.map((g) => (
                    <div
                      key={g.id}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-200">{g.courseCode}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                          {g.feedback || 'Completed'}
                        </div>
                      </div>
                      <span className="text-lg font-black text-emerald-400 px-3 py-1 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                        {g.grade}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
                  <p className="text-xs text-slate-400">
                    No term grades posted yet by your course instructors. Check back soon.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2FA Security Management Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {user?.isTwoFactorEnabled ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                )}
                Security Settings: Two-Factor Authentication (TOTP & Gmail)
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                When enabled, sign-in requires both your password and an ephemeral 6-digit security code. Codes can be
                generated in Authenticator apps or sent directly to your Gmail inbox.
              </p>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider self-start sm:self-auto ${
                user?.isTwoFactorEnabled
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              }`}
            >
              {user?.isTwoFactorEnabled ? '2FA Active & Secured' : '2FA Disabled'}
            </span>
          </div>

          {!user?.isTwoFactorEnabled && !qrCodeData && (
            <div className="pt-2">
              <button
                onClick={start2FASetup}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/20 transition hover:scale-[1.01] cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>Enable 2FA (Scan QR & Receive Gmail Code)</span>
              </button>
            </div>
          )}

          {qrCodeData && (
            <div className="mt-4 p-6 border border-slate-800 rounded-2xl bg-slate-950 flex flex-col items-center max-w-lg mx-auto">
              <p className="text-xs sm:text-sm text-slate-300 mb-4 text-center">
                Scan this QR code with <strong>Google Authenticator</strong> / <strong>Authy</strong>, or use the code
                sent to your email, then enter the 6-digit code below:
              </p>
              <div className="p-3 bg-white rounded-2xl shadow-xl mb-5">
                <img src={qrCodeData} alt="2FA QR Code" className="w-44 h-44 rounded-lg" />
              </div>

              <form onSubmit={verifyAndEnable2FA} className="flex gap-2 w-full max-w-xs">
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl font-mono text-center tracking-[0.4em] text-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={totpCode.length < 6}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  Confirm
                </button>
              </form>
            </div>
          )}

          {user?.isTwoFactorEnabled && (
            <p className="text-xs sm:text-sm text-emerald-400 font-medium mt-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Your account is reinforced with hardware and email-backed two-factor authentication.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
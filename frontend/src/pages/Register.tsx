import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import {
  GraduationCap,
  AlertCircle,
  Mail,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  RotateCw,
  Eye,
  EyeOff,
} from 'lucide-react';

export const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<'STUDENT' | 'TEACHER' | 'ADMIN'>('STUDENT');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [registeredUsername, setRegisteredUsername] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        username,
        email,
        password,
        confirmPassword,
        role,
      });

      setRegisteredUsername(username);
      setRegisteredEmail(email);
      setStep('verify');
      setSuccess(res.data.message || 'Verification code sent to your email.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('/auth/verify-email', {
        username: registeredUsername,
        code: verificationCode,
      });

      setSuccess('Email successfully verified! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setResending(true);
    try {
      const res = await api.post('/auth/resend-verification', {
        identifier: registeredUsername || registeredEmail,
      });
      setSuccess(res.data.message || 'A new verification code was sent.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
      <div className="w-full max-w-xl">
        {/* Glow backdrop card */}
        <div className="relative">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-20 blur-xl" />

          <div className="relative bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25 mb-3">
                {step === 'form' ? (
                  <GraduationCap className="w-8 h-8 text-white" />
                ) : (
                  <Mail className="w-7 h-7 text-white" />
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {step === 'form' ? 'Join EduSecure School Portal' : 'Verify Your Email Address'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
                {step === 'form'
                  ? 'Sign up with verified email access and role authorization for Students, Teachers, and School Administrators.'
                  : `We sent a 6-digit confirmation code to ${registeredEmail}. Enter it below to activate your account.`}
              </p>
            </div>

            {/* Error & Success Alerts */}
            {error && (
              <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs sm:text-sm flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs sm:text-sm flex items-start gap-2.5">
                <Sparkles className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {step === 'form' ? (
              <form onSubmit={handleRegister} className="space-y-4">
                {/* Role selection radio pills (Public: Student & Teacher only) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Choose Your School Role
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        value: 'STUDENT',
                        label: 'Student',
                        desc: 'Courses & Schedule',
                        activeClass: 'border-blue-500 bg-blue-500/15 text-blue-300',
                      },
                      {
                        value: 'TEACHER',
                        label: 'Teacher',
                        desc: 'Grading & Roster',
                        activeClass: 'border-emerald-500 bg-emerald-500/15 text-emerald-300',
                      },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.value}
                        onClick={() => setRole(item.value as 'STUDENT' | 'TEACHER')}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                          role === item.value
                            ? `${item.activeClass} shadow-md`
                            : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold text-xs sm:text-sm">{item.label}</div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">{item.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Account Username / Student ID
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. bright_takyi"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                </div>

                {/* Email Address (Verification target) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Verified Email Address (Gmail or School Email)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. yourname@gmail.com"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    A 6-digit confirmation code will be sent to this email upon registration.
                  </p>
                </div>

                {/* Passwords */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 8 chars, 1 uppercase, symbol"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-200 focus:outline-none cursor-pointer"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-type password"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-200 focus:outline-none cursor-pointer"
                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    'Processing Registration...'
                  ) : (
                    <>
                      <span>Register & Send Verification Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Email Verification Step */
              <form onSubmit={handleVerifyEmail} className="space-y-5">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                  <p className="text-xs text-slate-400 mb-3">
                    Check your inbox (or console if running locally) for the verification code.
                  </p>
                  <div className="max-w-xs mx-auto">
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full text-center text-3xl font-mono tracking-[0.5em] py-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || verificationCode.length < 6}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-teal-600/30 transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? 'Verifying Code...' : 'Confirm & Activate Account'}
                </button>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resending}
                    className="hover:text-blue-400 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                    <span>{resending ? 'Sending...' : 'Resend Email Code'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep('form')}
                    className="hover:text-slate-200 transition cursor-pointer"
                  >
                    Change Registration Details
                  </button>
                </div>
              </form>
            )}

            {/* Footer link */}
            <div className="mt-6 text-center text-xs text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-4">
                Sign In to Portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
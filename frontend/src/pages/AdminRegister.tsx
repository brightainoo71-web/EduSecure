import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import {
  ShieldAlert,
  AlertCircle,
  Mail,
  Lock,
  User,
  KeyRound,
  ArrowRight,
  Sparkles,
  RotateCw,
  Eye,
  EyeOff,
} from 'lucide-react';

export const AdminRegister: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminSecretKey, setAdminSecretKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [registeredUsername, setRegisteredUsername] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();

  const handleAdminRegister = async (e: React.FormEvent) => {
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
        role: 'ADMIN',
        adminSecretKey,
      });

      setRegisteredUsername(username);
      setRegisteredEmail(email);
      setStep('verify');
      setSuccess(res.data.message || 'Verification code sent to your administrator email.');
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.errors?.password?.[0] ||
          'Administrator registration failed'
      );
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

      setSuccess('Administrator email verified! Redirecting to sign in...');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setResending(true);
    try {
      const res = await api.post('/auth/resend-verification', {
        identifier: registeredEmail || registeredUsername,
      });
      setSuccess(res.data.message || 'A fresh 6-digit verification code was sent.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
      <div className="w-full max-w-lg">
        <div className="relative">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-amber-500 opacity-25 blur-xl" />

          <div className="relative bg-slate-900/90 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-purple-600/30 mb-3 border border-purple-400/30">
                <ShieldAlert className="w-7 h-7 text-white" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-purple-500/20 text-purple-300 border border-purple-500/30 mb-2">
                Restricted Provisioning Link
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                {step === 'form' ? 'School Administrator Registration' : 'Verify Admin Email'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                {step === 'form'
                  ? 'Dedicated onboarding portal for authorized school administrators only'
                  : `Enter the 6-digit confirmation code sent to ${registeredEmail}`}
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {step === 'form' ? (
              <form onSubmit={handleAdminRegister} className="space-y-4">
                {/* Master Admin Authorization Key */}
                <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30">
                  <label className="block text-xs font-semibold text-purple-300 uppercase tracking-wider mb-1.5">
                    Admin Authorization Key
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-purple-400 absolute left-3.5 top-3" />
                    <input
                      type={showSecretKey ? 'text' : 'password'}
                      required
                      value={adminSecretKey}
                      onChange={(e) => setAdminSecretKey(e.target.value)}
                      placeholder="Enter school master key (e.g. EDU-ADMIN-2026)"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/90 border border-purple-500/40 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                      className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-200 focus:outline-none cursor-pointer"
                      title={showSecretKey ? 'Hide key' : 'Show key'}
                    >
                      {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-purple-300/70 mt-1.5">
                    Required to prevent unauthorized privilege escalation on public networks.
                  </p>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Administrator Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. admin_principal"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Official Administrator Email (Gmail)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. admin@gmail.com"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    />
                  </div>
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
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-200 focus:outline-none cursor-pointer"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/30 transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    'Provisioning Admin Account...'
                  ) : (
                    <>
                      <span>Register School Administrator</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyEmail} className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                  <p className="text-xs text-slate-400 mb-3">
                    Enter the 6-digit security code sent to{' '}
                    <span className="text-purple-400 font-semibold">{registeredEmail}</span>
                  </p>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full text-center text-3xl font-mono tracking-[0.5em] py-3 rounded-xl bg-slate-900 border border-purple-500/40 text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || verificationCode.length < 6}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-teal-600/30 transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? 'Verifying Code...' : 'Confirm & Activate Admin Account'}
                </button>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resending}
                    className="hover:text-purple-400 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                    <span>{resending ? 'Sending...' : 'Resend Email Code'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep('form')}
                    className="hover:text-slate-200 transition cursor-pointer"
                  >
                    Back to Form
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-800/80">
              <Link to="/register" className="text-slate-400 hover:text-slate-200 transition">
                ← Student / Teacher Registration
              </Link>
              <Link to="/login" className="text-purple-400 hover:text-purple-300 font-semibold underline underline-offset-4">
                Sign In to Portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

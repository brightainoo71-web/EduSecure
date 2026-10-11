import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  AlertCircle,
  KeyRound,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  Send,
  Eye,
  EyeOff,
} from 'lucide-react';

export const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [totpToken, setTotpToken] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [pre2faToken, setPre2faToken] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [unverifiedUsername, setUnverifiedUsername] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSending, setEmailSending] = useState(false);

  const { loginState } = useAuth();
  const navigate = useNavigate();

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/login', {
        identifier,
        username: identifier,
        password,
      });

      if (res.data.status === '2fa_required') {
        setRequires2FA(true);
        setPre2faToken(res.data.pre2faToken);
        setMaskedEmail(res.data.email || null);
        setInfoMsg(
          res.data.email
            ? `Two-Factor Authentication is enabled. You can use your Authenticator app or request the code sent to ${res.data.email}.`
            : 'Two-Factor Authentication required. Enter the 6-digit code from your authenticator app.'
        );
      } else if (res.data.status === 'success') {
        loginState(res.data.user, res.data.accessToken, res.data.refreshToken);
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (err.response?.data?.status === 'email_unverified') {
        setRequiresVerification(true);
        setUnverifiedUsername(err.response.data.username);
        setError(err.response.data.message || 'Please verify your email before logging in.');
      } else {
        setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSend2FACodeToEmail = async () => {
    if (!pre2faToken) return;
    setEmailSending(true);
    setError(null);
    try {
      const res = await api.post('/auth/2fa/send-email', { pre2faToken });
      setInfoMsg(res.data.message || '2FA code dispatched to your Gmail inbox.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed sending 2FA code to email');
    } finally {
      setEmailSending(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post(
        '/auth/2fa/login',
        {
          code: totpToken,
          token: totpToken,
          totpToken: totpToken,
          pre2faToken,
        },
        {
          headers: pre2faToken ? { Authorization: `Bearer ${pre2faToken}` } : {},
        }
      );

      loginState(res.data.user, res.data.accessToken, res.data.refreshToken);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired 2FA security code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPendingEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('/auth/verify-email', {
        username: unverifiedUsername,
        code: verificationCode,
      });
      setRequiresVerification(false);
      setInfoMsg('Email verified! You can now log in with your credentials.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
      <div className="w-full max-w-md">
        <div className="relative">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-20 blur-xl" />

          <div className="relative bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
            {/* Header Icon */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25 mb-3">
                {requires2FA ? (
                  <KeyRound className="w-7 h-7 text-amber-300" />
                ) : requiresVerification ? (
                  <Mail className="w-7 h-7 text-blue-300" />
                ) : (
                  <Lock className="w-7 h-7 text-white" />
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {requires2FA
                  ? 'Two-Factor Challenge'
                  : requiresVerification
                  ? 'Email Verification Required'
                  : 'Sign In to EduSecure'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                {requires2FA
                  ? 'Enter the 6-digit code from your Authenticator app or Gmail inbox.'
                  : requiresVerification
                  ? 'Your account email has not been activated yet.'
                  : 'Enter your username or email and password to access your school portal.'}
              </p>
            </div>

            {/* Alerts */}
            {error && (
              <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs sm:text-sm flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {infoMsg && (
              <div className="mb-4 p-3.5 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-xl text-xs sm:text-sm flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 flex-shrink-0 text-blue-400 mt-0.5" />
                <span>{infoMsg}</span>
              </div>
            )}

            {/* Form state */}
            {!requires2FA && !requiresVerification && (
              <form onSubmit={handleStandardLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Username or Email
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. bright or bright@gmail.com"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                </div>

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
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 focus:outline-none cursor-pointer"
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    'Verifying credentials...'
                  ) : (
                    <>
                      <span>Sign In to School Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* 2FA Challenge Form */}
            {requires2FA && (
              <form onSubmit={handle2FASubmit} className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                  <p className="text-xs text-slate-400 mb-3">
                    Enter the 6-digit TOTP code generated for your account
                  </p>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={totpToken}
                    onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full text-center text-3xl font-mono tracking-[0.5em] py-3 rounded-xl bg-slate-900 border border-amber-500/40 text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    autoFocus
                  />
                </div>

                {maskedEmail && (
                  <button
                    type="button"
                    onClick={handleSend2FACodeToEmail}
                    disabled={emailSending}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className={`w-3.5 h-3.5 ${emailSending ? 'animate-pulse text-blue-400' : 'text-blue-400'}`} />
                    <span>{emailSending ? 'Sending to Gmail...' : `Send Code to Gmail (${maskedEmail})`}</span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={loading || totpToken.length < 6}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold text-sm shadow-lg shadow-orange-600/30 transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? 'Verifying 2FA...' : 'Authenticate & Open Portal'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRequires2FA(false);
                      setTotpToken('');
                      setError(null);
                      setInfoMsg(null);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  >
                    ← Back to standard login
                  </button>
                </div>
              </form>
            )}

            {/* Email verification on login */}
            {requiresVerification && (
              <form onSubmit={handleVerifyPendingEmail} className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                  <p className="text-xs text-slate-400 mb-3">
                    Enter the 6-digit verification code sent to your email during registration:
                  </p>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full text-center text-3xl font-mono tracking-[0.5em] py-3 rounded-xl bg-slate-900 border border-blue-500/40 text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || verificationCode.length < 6}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                >
                  {loading ? 'Confirming...' : 'Verify Email & Unlock Account'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRequiresVerification(false);
                      setError(null);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  >
                    ← Back to login
                  </button>
                </div>
              </form>
            )}

            {/* Footer */}
            <div className="mt-6 text-center text-xs text-slate-400">
              New to EduSecure?{' '}
              <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-4">
                Register an Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
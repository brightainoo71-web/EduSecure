import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export const LoginScreen = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAdminRegistering, setIsAdminRegistering] = useState(false);
  const [adminSecretKey, setAdminSecretKey] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<'STUDENT' | 'TEACHER' | 'ADMIN'>('STUDENT');

  // Verification & 2FA State
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [unverifiedUsername, setUnverifiedUsername] = useState('');

  const [requires2FA, setRequires2FA] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [pre2faToken, setPre2faToken] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { loginSuccess } = useAuth();

  const handleAuthSubmit = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isRegistering) {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        const effectiveRole = isAdminRegistering ? 'ADMIN' : role === 'ADMIN' ? 'STUDENT' : role;

        // Register new account with selected school role & email
        const res = await api.post('/auth/register', {
          username,
          email,
          password,
          confirmPassword,
          role: effectiveRole,
          adminSecretKey: isAdminRegistering ? adminSecretKey : undefined,
        });

        setSuccessMsg(res.data.message || 'Verification code sent to your email.');
        setRequiresVerification(true);
        setUnverifiedUsername(username);
      } else {
        // Standard or Email Login
        const res = await api.post('/auth/login', {
          identifier: username,
          username,
          password,
        });

        if (res.data.status === '2fa_required') {
          setRequires2FA(true);
          setPre2faToken(res.data.pre2faToken);
          setMaskedEmail(res.data.email || null);
          setSuccessMsg(
            res.data.email
              ? `2FA enabled. Enter your authenticator code or tap 'Send Code to Gmail'.`
              : 'Enter the 6-digit code from your authenticator app.'
          );
        } else if (res.data.status === 'success') {
          await loginSuccess(res.data.user, res.data.accessToken, res.data.refreshToken);
        }
      }
    } catch (err: any) {
      if (err.response?.data?.status === 'email_unverified') {
        setRequiresVerification(true);
        setUnverifiedUsername(err.response.data.username);
        setError(err.response.data.message || 'Please verify your email before logging in.');
      } else {
        setError(err.response?.data?.message || (isRegistering ? 'Registration failed' : 'Login failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/verify-email', {
        username: unverifiedUsername,
        code: verificationCode,
      });

      setSuccessMsg('Email verified successfully! You can now sign in.');
      setRequiresVerification(false);
      setIsRegistering(false);
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid verification code');
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
      setSuccessMsg(res.data.message || '2FA code dispatched to your Gmail inbox.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed sending 2FA code to email');
    } finally {
      setEmailSending(false);
    }
  };

  const handleVerify2FA = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.post(
        '/auth/2fa/login',
        {
          code: totpCode,
          token: totpCode,
          totpToken: totpCode,
          pre2faToken,
        },
        {
          headers: pre2faToken ? { Authorization: `Bearer ${pre2faToken}` } : {},
        }
      );

      await loginSuccess(res.data.user, res.data.accessToken, res.data.refreshToken);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid 2FA code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          {/* Header */}
          <Text style={styles.title}>
            {requires2FA
              ? 'Two-Factor Challenge'
              : requiresVerification
              ? 'Email Verification'
              : isRegistering
              ? 'Join EduSecure Portal'
              : 'Sign In to EduSecure'}
          </Text>

          <Text style={styles.subText}>
            {requires2FA
              ? 'Enter code from Authenticator app or receive it in your Gmail.'
              : requiresVerification
              ? 'Enter the 6-digit confirmation code sent to your email.'
              : isRegistering
              ? 'Verified email access for Students, Teachers, and School Admins.'
              : 'Enter your username or verified email to sign in.'}
          </Text>

          {successMsg ? <Text style={styles.successText}>{successMsg}</Text> : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Regular Login or Register Form */}
          {!requires2FA && !requiresVerification && (
            <>
              {isRegistering && !isAdminRegistering && (
                <View style={styles.roleContainer}>
                  <Text style={styles.roleHeading}>Select Your School Role:</Text>
                  <View style={styles.roleRow}>
                    {(['STUDENT', 'TEACHER'] as const).map((r) => (
                      <TouchableOpacity
                        key={r}
                        style={[
                          styles.rolePill,
                          role === r && styles.rolePillActive,
                        ]}
                        onPress={() => setRole(r)}
                      >
                        <Text
                          style={[
                            styles.rolePillText,
                            role === r && styles.rolePillTextActive,
                          ]}
                        >
                          {r === 'TEACHER' ? 'Teacher' : 'Student'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {isRegistering && isAdminRegistering && (
                <View style={styles.roleContainer}>
                  <Text style={[styles.roleHeading, { color: '#c084fc' }]}>
                    Restricted Admin Provisioning Key:
                  </Text>
                  <TextInput
                    style={[styles.input, { borderColor: '#9333ea', marginBottom: 4 }]}
                    placeholder="Admin Key (e.g. EDU-ADMIN-2026)"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                    value={adminSecretKey}
                    onChangeText={setAdminSecretKey}
                  />
                </View>
              )}

              <TextInput
                style={styles.input}
                placeholder={isRegistering ? 'Username' : 'Username or Email'}
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
              />

              {isRegistering && (
                <TextInput
                  style={styles.input}
                  placeholder="Verified Email (e.g. name@gmail.com)"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              )}

              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
              </View>

              {isRegistering && (
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm Password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={styles.button}
                onPress={handleAuthSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>
                    {isRegistering
                      ? isAdminRegistering
                        ? 'Register Administrator'
                        : 'Register & Send Code'
                      : 'Sign In'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleBtn}
                onPress={() => {
                  setIsRegistering(!isRegistering);
                  setIsAdminRegistering(false);
                  setError(null);
                  setSuccessMsg(null);
                }}
              >
                <Text style={styles.toggleText}>
                  {isRegistering
                    ? 'Already have an account? Sign In'
                    : "Don't have an account? Register with Email"}
                </Text>
              </TouchableOpacity>

              {isRegistering && (
                <TouchableOpacity
                  style={[styles.toggleBtn, { marginTop: 4 }]}
                  onPress={() => {
                    setIsAdminRegistering(!isAdminRegistering);
                    setError(null);
                  }}
                >
                  <Text style={[styles.toggleText, { color: '#c084fc', fontSize: 12 }]}>
                    {isAdminRegistering
                      ? '← Back to Student / Teacher Registration'
                      : '🔒 Restricted School Admin Registration'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Email Verification Step */}
          {requiresVerification && (
            <>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="000000"
                placeholderTextColor="#64748b"
                keyboardType="number-pad"
                maxLength={6}
                value={verificationCode}
                onChangeText={setVerificationCode}
                autoFocus
              />

              <TouchableOpacity
                style={styles.button}
                onPress={handleVerifyEmail}
                disabled={loading || verificationCode.length < 6}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Confirm Email & Activate</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleBtn}
                onPress={() => {
                  setRequiresVerification(false);
                  setError(null);
                }}
              >
                <Text style={styles.toggleText}>← Back to Sign In</Text>
              </TouchableOpacity>
            </>
          )}

          {/* 2FA Challenge */}
          {requires2FA && (
            <>
              <TextInput
                style={[styles.input, styles.codeInput, styles.totpInput]}
                placeholder="000000"
                placeholderTextColor="#92400e"
                keyboardType="number-pad"
                maxLength={6}
                value={totpCode}
                onChangeText={setTotpCode}
                autoFocus
              />

              {maskedEmail && (
                <TouchableOpacity
                  style={styles.email2faBtn}
                  onPress={handleSend2FACodeToEmail}
                  disabled={emailSending}
                >
                  <Text style={styles.email2faBtnText}>
                    {emailSending ? 'Sending to Gmail...' : `📧 Send Code to Gmail (${maskedEmail})`}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.button, styles.verifyButton]}
                onPress={handleVerify2FA}
                disabled={loading || totpCode.length < 6}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verify 2FA Security Code</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleBtn}
                onPress={() => {
                  setRequires2FA(false);
                  setTotpCode('');
                  setError(null);
                  setSuccessMsg(null);
                }}
              >
                <Text style={styles.toggleText}>← Back to Sign In</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617', // slate-950 modern dark theme
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#0f172a', // slate-900
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#4f46e5',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
    textAlign: 'center',
  },
  subText: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 18,
    textAlign: 'center',
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    fontSize: 15,
    color: '#ffffff',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    fontSize: 15,
    color: '#ffffff',
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleContainer: {
    marginBottom: 14,
  },
  roleHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rolePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#020617',
    alignItems: 'center',
  },
  rolePillActive: {
    backgroundColor: '#4338ca',
    borderColor: '#6366f1',
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  rolePillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  codeInput: {
    textAlign: 'center',
    letterSpacing: 10,
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: '#020617',
    color: '#38bdf8',
    borderColor: '#0284c7',
  },
  totpInput: {
    color: '#fbbf24',
    borderColor: '#d97706',
  },
  button: {
    backgroundColor: '#4f46e5',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  verifyButton: {
    backgroundColor: '#d97706',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  email2faBtn: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#38bdf8',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  email2faBtnText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600',
  },
  toggleBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  toggleText: {
    color: '#818cf8',
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    color: '#f87171',
    backgroundColor: '#450a0a',
    padding: 10,
    borderRadius: 8,
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  successText: {
    color: '#4ade80',
    backgroundColor: '#052e16',
    padding: 10,
    borderRadius: 8,
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
});
export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'USER';

export interface UserDocument {
  id: string;
  username: string;
  email?: string;
  isEmailVerified?: boolean;
  emailVerificationToken?: string;
  emailVerificationTokenExpires?: string;
  displayName: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  isTwoFactorEnabled: boolean;
  twoFactorSecret?: string;
  emailTwoFactorCode?: string;
  emailTwoFactorExpires?: string;
  lastTotpSentAt?: string;
  createdAt: string;
  updatedAt: string;
} 
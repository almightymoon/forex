export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country?: string;
  role: 'student' | 'teacher' | 'admin';
  profileImage?: string;
  subscription: {
    plan: string;
    isActive: boolean;
  };
  isActive?: boolean;
  isVerified?: boolean;
  parentReferralCode?: string;
  referralCode?: string;
  hasPackage?: boolean;
  hasPendingPackage?: boolean;
  hasReferral?: boolean;
  accessStatus?: 'active' | 'pending' | 'inactive';
  createdAt: string;
  lastLogin?: string;
  security?: {
    isLocked?: boolean;
    lockedUntil?: string;
    lockReason?: string;
  };
}

export interface Payment {
  _id: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  amount: number;
  finalAmount?: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'processing' | 'cancelled' | 'refunded';
  type?: 'signup' | 'course' | 'session' | 'subscription' | 'signal' | 'package' | 'monthly_fee' | string;
  description?: string;
  package?: {
    name?: string;
    price?: number;
  };
  paymentMethod: string;
  createdAt: string;
  transactionId?: string;
  binanceWallet?: {
    walletAddress?: string;
    network?: string;
    transactionHash?: string;
  };
  payerName?: string;
  payerEmail?: string;
  paymentScreenshotUrl?: string;
  adminConfirmed?: boolean;
}

export interface RecentActivityItem {
  type: 'user_registration' | 'payment_received';
  _id: string;
  createdAt: string;
  userName?: string;
  email?: string;
  role?: string;
  amount?: number;
  currency?: string;
  packageName?: string;
}

export interface Analytics {
  totalUsers: number;
  totalRevenue: number;
  monthlyGrowth: number;
  activeUsers: number;
  totalPayments: number;
  paymentsThisMonth: number;
  activePromoCodes: number;
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  monthlyUserGrowth: Array<{ month: string; users: number }>;
  paymentMethodStats: Array<{ method: string; count: number; totalAmount: number }>;
  recentActivity?: RecentActivityItem[];
}

export interface PromoCode {
  _id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses: number;
  currentUses: number;
  validUntil?: string;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSettings {
  general: {
    platformName: string;
    description: string;
    defaultCurrency: string;
    timezone: string;
    language: string;
    maintenanceMode: boolean;
    maintenanceAllowTeachers: boolean;
    defaultReferralCode: string;
    telegramInviteEnabled: boolean;
    telegramInviteUrl: string;
  };
  security: {
    twoFactorAuth: boolean;
    sessionTimeout: number;
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireNumbers: boolean;
      requireSymbols: boolean;
    };
    loginAttempts: number;
    accountLockDuration: number;
  };
  notifications: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    newUserRegistration: boolean;
    paymentReceived: boolean;
    systemAlerts: boolean;
    courseCompletions: boolean;
  };
  payments: {
    stripeEnabled: boolean;
    paypalEnabled: boolean;
    easypaisaEnabled: boolean;
    jazzCashEnabled: boolean;
    currency: string;
    taxRate: number;
    promoCodesEnabled: boolean;
  };
  courses: {
    autoApproval: boolean;
    maxFileSize: number;
    allowedFileTypes: string[];
    certificateEnabled: boolean;
    completionThreshold: number;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
    fromName: string;
  };
}

export interface UserForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  country: string;
  role: 'admin' | 'teacher' | 'student';
  isActive: boolean;
  isVerified: boolean;
}

export interface PromoForm {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses: number;
  expiresAt: string;
  isActive: boolean;
  description: string;
}

export interface CustomTemplate {
  name: string;
  category: string;
  subject: string;
  htmlContent: string;
  variables: string;
}

export interface BulkNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  targetAudience: 'all' | 'students' | 'teachers' | 'admins' | 'custom';
  targetUsers?: string[];
  scheduledFor?: Date;
  sentAt?: Date;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  channels: ('email' | 'sms' | 'push' | 'in-app')[];
  createdAt: Date;
  createdBy: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: 'email' | 'sms' | 'push' | 'in-app';
  variables: string[];
  isActive: boolean;
  createdAt: Date;
}

export interface NotificationHistory {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  channel: 'email' | 'sms' | 'push' | 'in-app';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  sentAt: Date;
  readAt?: Date;
  metadata?: Record<string, any>;
}

export interface TwoFactorAuth {
  id: string;
  userId: string;
  secret: string;
  qrCode: string;
  backupCodes: string[];
  isEnabled: boolean;
  lastUsed: Date;
  createdAt: Date;
  verifiedAt?: Date;
}

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
  verificationCode: string;
}

export interface TwoFactorVerification {
  userId: string;
  code: string;
  backupCode?: boolean;
}

'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Edit3, 
  Save, 
  X,
  Camera,
  Bell,
  Settings,
  Award,
  Copy,
  Share2,
  Wallet,
  ArrowUpRight,
  ArrowLeft,
  AlertCircle,
  Fingerprint
} from 'lucide-react';
import { showToast } from '@/utils/toast';
import { useRouter } from 'next/navigation';
import { buildApiUrl } from '../../utils/api';
import { useSettings } from '../../context/SettingsContext';
import { useLanguage } from '../../context/LanguageContext';
import { useDashboard } from '../../context/DashboardContext';
import { getDashboardRoute, getUserRole } from '../../utils/dashboardUtils';
import UserProfileDropdown from '@/app/components/UserProfileDropdown';
import DarkModeToggle from '../../components/DarkModeToggle';
import ReferralBadge from '../components/ReferralBadge';
import CoolLoader from '../../components/CoolLoader';
import './profile.css';

interface UserProfile {
  _id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  role: string;
  profileImage?: string;
  bio?: string;
  balance?: number;
  badges?: Array<{
    packageName: string;
    purchasedAt: string;
    packagePrice: number;
  }>;
  referralCode?: string;
  preferences?: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    marketingEmails: boolean;
  };
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [draftAvatarUrl, setDraftAvatarUrl] = useState<string | null>(null);
  const [draftAvatarFile, setDraftAvatarFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1.2);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropDragging, setCropDragging] = useState(false);
  const cropDragStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const cropImgRef = useRef<HTMLImageElement | null>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalWallet, setWithdrawalWallet] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const { settings, loading: settingsLoading } = useSettings();
  const { t } = useLanguage();
  const { data: dashboardData, refreshUser } = useDashboard();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      // Use dashboard context data if available, otherwise fetch from API
      if (dashboardData.user) {
        // Create a basic user profile from dashboard data
        const basicUser: UserProfile = {
          _id: dashboardData.user._id,
          firstName: dashboardData.user.firstName,
          lastName: dashboardData.user.lastName,
          email: dashboardData.user.email,
          role: dashboardData.user.role,
          profileImage: dashboardData.user.profileImage,
          phone: '',
          address: '',
          dateOfBirth: '',
          bio: '',
          preferences: {
            emailNotifications: true,
            pushNotifications: true,
            marketingEmails: false
          }
        };
        setUser(basicUser);
        setEditForm({
          firstName: basicUser.firstName || '',
          lastName: basicUser.lastName || '',
          phone: basicUser.phone || '',
          address: basicUser.address || '',
          dateOfBirth: basicUser.dateOfBirth || '',
          bio: basicUser.bio || '',
          preferences: basicUser.preferences
        });
        setLoading(false);
        // Still fetch full profile data for complete information
        fetchUserProfile();
      } else {
        fetchUserProfile();
      }
    }
  }, [mounted, dashboardData.user]);

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      // Force re-render when language changes
      setMounted(false);
      setTimeout(() => setMounted(true), 0);
    };
    
    window.addEventListener('languageChanged', handleLanguageChange);
    
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange);
    };
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      // Check if we're in the browser
      if (typeof window === 'undefined') return;
      
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(buildApiUrl('api/auth/me'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        const userData = result.user;
        setUser(userData);
        setEditForm({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          phone: userData.phone || '',
          address: userData.address || '',
          dateOfBirth: userData.dateOfBirth || '',
          bio: userData.bio || '',
          preferences: userData.preferences || {
            emailNotifications: true,
            pushNotifications: true,
            marketingEmails: false
          }
        });

        // If referral code is missing, fetch it
        if (!userData.referralCode) {
          try {
            const referralRes = await fetch(buildApiUrl('/api/referrals/code'), {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            if (referralRes.ok) {
              const referralData = await referralRes.json();
              if (referralData.success && referralData.referralCode) {
                setUser(prev => prev ? { ...prev, referralCode: referralData.referralCode } : prev);
              }
            }
          } catch (refError) {
            console.error('Error fetching referral code:', refError);
          }
        }
      } else {
        showToast('Failed to fetch profile', 'error');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      showToast('Error fetching profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Check if we're in the browser
      if (typeof window === 'undefined') return;
      
      const token = localStorage.getItem('token');
      if (!token) return;

      // Backend validates ISO8601 when `dateOfBirth` is present; avoid sending empty strings.
      const payload: any = { ...editForm };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === '') delete payload[k];
      });
      if (payload.dateOfBirth != null && String(payload.dateOfBirth).trim() === '') {
        delete payload.dateOfBirth;
      }

      const response = await fetch(buildApiUrl('api/auth/profile'), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        setUser(result.user);

        // Save avatar only when the user clicks "Save Changes"
        if (draftAvatarFile) {
          const avatarOk = await uploadProfileImage(draftAvatarFile);
          if (!avatarOk) {
            showToast('Profile saved, but profile photo failed to update. Please try again.', 'error');
            return;
          }
        }

        if (draftAvatarUrl) URL.revokeObjectURL(draftAvatarUrl);
        setDraftAvatarUrl(null);
        setDraftAvatarFile(null);

        setIsEditing(false);
        showToast('Profile updated successfully!', 'success');
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to update profile', 'error');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast('Error updating profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (draftAvatarUrl) URL.revokeObjectURL(draftAvatarUrl);
    setDraftAvatarUrl(null);
    setDraftAvatarFile(null);
    setEditForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      address: user?.address || '',
      dateOfBirth: user?.dateOfBirth || '',
      bio: user?.bio || '',
      preferences: user?.preferences || {
        emailNotifications: true,
        pushNotifications: true,
        marketingEmails: false
      }
    });
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: any) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePreferenceChange = (preference: string, value: boolean) => {
    setEditForm(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [preference]: value
      }
    }));
  };

  const clampCropOffset = (offset: { x: number; y: number }, canvasSize: number) => {
    const img = cropImgRef.current;
    if (!img) return offset;

    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return offset;

    const baseScale = canvasSize / Math.min(iw, ih);
    const scale = baseScale * Math.max(1, cropZoom);
    const dw = iw * scale;
    const dh = ih * scale;

    const maxX = Math.max(0, (dw - canvasSize) / 2);
    const maxY = Math.max(0, (dh - canvasSize) / 2);

    return {
      x: Math.max(-maxX, Math.min(maxX, offset.x)),
      y: Math.max(-maxY, Math.min(maxY, offset.y)),
    };
  };

  const drawCropPreview = () => {
    const canvas = cropCanvasRef.current;
    const img = cropImgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;

    const baseScale = size / Math.min(iw, ih);
    const scale = baseScale * Math.max(1, cropZoom);
    const dw = iw * scale;
    const dh = ih * scale;

    const clamped = clampCropOffset(cropOffset, size);
    if (clamped.x !== cropOffset.x || clamped.y !== cropOffset.y) {
      // Avoid blank edges when dragging too far
      setCropOffset(clamped);
      return;
    }

    const dx = (size - dw) / 2 + clamped.x;
    const dy = (size - dh) / 2 + clamped.y;

    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, dx, dy, dw, dh);

    // Subtle overlay + crop guide border
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);
    ctx.restore();
  };

  useEffect(() => {
    if (!cropOpen) return;
    drawCropPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropOpen, cropZoom, cropOffset.x, cropOffset.y]);

  const openCropForFile = async (file: File) => {
    if (!file || uploadingAvatar) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file.', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image must be under 10MB.', 'error');
      return;
    }

    const url = URL.createObjectURL(file);
    setCropSrc(url);
    setCropZoom(1.2);
    setCropOffset({ x: 0, y: 0 });
    setCropOpen(true);
  };

  const closeCrop = () => {
    if (uploadingAvatar) return;
    setCropOpen(false);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    cropImgRef.current = null;
    cropDragStartRef.current = null;
    setCropDragging(false);
  };

  const buildCroppedAvatarFile = async (outputSize = 512): Promise<File | null> => {
    const img = cropImgRef.current;
    if (!img) return null;

    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return null;

    const baseScale = outputSize / Math.min(iw, ih);
    const scale = baseScale * Math.max(1, cropZoom);
    const dw = iw * scale;
    const dh = ih * scale;

    const clamped = clampCropOffset(cropOffset, outputSize);
    const dx = (outputSize - dw) / 2 + clamped.x;
    const dy = (outputSize - dh) / 2 + clamped.y;

    const out = document.createElement('canvas');
    out.width = outputSize;
    out.height = outputSize;
    const ctx = out.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(img, dx, dy, dw, dh);

    const blob: Blob | null = await new Promise((resolve) =>
      out.toBlob((b) => resolve(b), 'image/jpeg', 0.9)
    );
    if (!blob) return null;

    return new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
  };

  const uploadProfileImage = async (file: File): Promise<boolean> => {
    try {
      if (!file) return false;
      if (!file.type.startsWith('image/')) {
        showToast('Please select an image file.', 'error');
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image must be under 5MB.', 'error');
        return false;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Please login again.', 'error');
        router.push('/login');
        return false;
      }

      setUploadingAvatar(true);

      const form = new FormData();
      form.append('image', file);

      const res = await fetch(buildApiUrl('api/users/profile/me/profile-image'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: form
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast((data as any)?.error || 'Failed to update profile image', 'error');
        return false;
      }

      const updatedUser = (data as any)?.user;
      if (updatedUser) {
        setUser(updatedUser);
      } else if ((data as any)?.profileImage) {
        setUser((prev) => (prev ? { ...prev, profileImage: (data as any).profileImage } : prev));
      }

      await refreshUser();
      window.dispatchEvent(new Event('platform:userChanged'));
      showToast('Profile image updated!', 'success');
      return true;
    } catch (e) {
      console.error('Profile image upload error:', e);
      showToast('Failed to update profile image', 'error');
      return false;
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Safe date formatting to prevent hydration issues
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not provided';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted || settingsLoading) {
    return (
      <CoolLoader
        message={settingsLoading ? 'Loading...' : 'Initializing Profile'}
        size="md"
        variant="student"
      />
    );
  }

  if (loading) {
    return (
      <CoolLoader 
        message="Loading Profile"
        size="md"
        variant="student"
      />
    );
  }

  if (!user) {
    return (
      <div className="profile-page profile-empty">
        <User className="h-12 w-12 text-[var(--admin-muted)]" />
        <h2 className="mt-4 text-xl font-bold">Profile Not Found</h2>
        <p className="mt-2 text-[var(--admin-muted)]">Unable to load your profile information.</p>
        <button type="button" onClick={() => router.push('/dashboard')} className="profile-btn profile-btn--primary mt-6">
          Go to Dashboard
        </button>
      </div>
    );
  }

  const roleLabel = user.role === 'admin' ? 'Admin' : user.role === 'teacher' ? 'Instructor' : 'Student';
  const dashboardRoute = getDashboardRoute(getUserRole() || user.role || 'student');

  return (
    <div className="profile-page">
      <header className="profile-header">
        <div className="profile-header__inner">
          <div className="profile-header__brand">
            <img src="/all-07.svg" alt={`${settings.platformName} Logo`} />
            <div>
              <h1>{settings.platformName}</h1>
              <p>Trading Education Platform</p>
            </div>
          </div>
          <div className="profile-header__actions">
            <DarkModeToggle size="sm" />
            {user.role === 'student' && <ReferralBadge />}
            <UserProfileDropdown user={user} />
          </div>
        </div>
      </header>

      <main className="profile-main">
        <div className="profile-topbar">
          <button type="button" onClick={() => router.push(dashboardRoute)} className="profile-topbar__back">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
          <div className="profile-topbar__actions">
            {!isEditing ? (
              <button type="button" onClick={() => setIsEditing(true)} className="profile-btn profile-btn--primary">
                <Edit3 className="h-4 w-4" />
                {t('edit')} {t('profile')}
              </button>
            ) : (
              <>
                <button type="button" onClick={handleCancel} className="profile-btn profile-btn--ghost">
                  <X className="h-4 w-4" />
                  {t('cancel')}
                </button>
                <button type="button" onClick={handleSave} disabled={saving} className="profile-btn profile-btn--success">
                  <Save className="h-4 w-4" />
                  {saving ? t('loading') : t('saveChanges')}
                </button>
              </>
            )}
          </div>
        </div>

        <section className="profile-hero">
          <div className="profile-hero__aurora" aria-hidden />
          <div className="profile-hero__inner">
            <div className="profile-avatar-wrap">
              <div className="profile-avatar">
                {(isEditing && draftAvatarUrl) || user.profileImage ? (
                  <img
                    src={(isEditing && draftAvatarUrl) ? draftAvatarUrl : (user.profileImage as string)}
                    alt="Profile"
                  />
                ) : (
                  <span>{user.firstName?.charAt(0) || user.lastName?.charAt(0) || 'U'}</span>
                )}
              </div>
              <span className="profile-avatar__badge">{roleLabel}</span>
              {isEditing && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) openCropForFile(f);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="profile-avatar__camera"
                    title={uploadingAvatar ? 'Uploading…' : 'Change profile picture'}
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>

            <div className="profile-hero__info">
              <h2>{user.firstName} {user.lastName}</h2>
              <p>{user.email}</p>
              {user.bio ? <p className="profile-hero__bio">{user.bio}</p> : null}
            </div>

            <div className="profile-hero__stats">
              <div className="profile-hero__stat">
                <strong>{user.badges?.length || 0}</strong>
                <span>Packages</span>
              </div>
              {user.balance !== undefined && user.balance > 0 ? (
                <div className="profile-hero__stat">
                  <strong>${(user.balance || 0).toFixed(0)}</strong>
                  <span>Balance</span>
                </div>
              ) : null}
              {user.referralCode ? (
                <div className="profile-hero__stat">
                  <strong>{user.referralCode}</strong>
                  <span>Referral</span>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <div className="profile-grid">
          <aside className="profile-sidebar">
            {user.referralCode ? (
              <div className="profile-card profile-referral">
                <div className="profile-card__head">
                  <Share2 className="h-4 w-4" />
                  <h3>Referral code</h3>
                </div>
                <div className="profile-card__body">
                  <div className="profile-referral__code">
                    <code>{user.referralCode}</code>
                    <button
                      type="button"
                      onClick={async () => {
                        const referralUrl = `${window.location.origin}/register?ref=${user.referralCode}`;
                        await navigator.clipboard.writeText(referralUrl);
                        showToast('Referral link copied!', 'success');
                      }}
                      className="profile-referral__copy"
                      title="Copy referral link"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="profile-referral__hint">Share this code to earn commissions.</p>
                </div>
              </div>
            ) : null}

            {user.badges && user.badges.length > 0 ? (
              <div className="profile-card">
                <div className="profile-card__head">
                  <Award className="h-4 w-4" />
                  <h3>Package badges</h3>
                </div>
                <div className="profile-card__body">
                  <div className="profile-badges">
                    {user.badges.map((badge, idx) => (
                      <span key={idx} className="profile-badge">{badge.packageName}</span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {user.balance !== undefined && user.balance > 0 ? (
              <div className="profile-card">
                <div className="profile-card__head">
                  <Wallet className="h-4 w-4 profile-card__head-icon--green" />
                  <h3>Account balance</h3>
                </div>
                <div className="profile-card__body profile-balance">
                  <p className="profile-balance__amount">${(user.balance || 0).toFixed(2)} USDT</p>
                  <button type="button" onClick={() => setShowWithdrawalForm(true)} className="profile-quick-link profile-quick-link--primary">
                    <ArrowUpRight className="h-4 w-4" />
                    Withdraw
                  </button>
                </div>
              </div>
            ) : null}

            <div className="profile-card">
              <div className="profile-card__head">
                <Settings className="h-4 w-4" />
                <h3>Quick links</h3>
              </div>
              <div className="profile-card__body">
                <div className="profile-quick-links">
                  <button type="button" onClick={() => router.push('/notifications')} className="profile-quick-link profile-quick-link--primary">
                    <Bell className="h-4 w-4" />
                    Notifications
                  </button>
                  <button type="button" onClick={() => router.push('/dashboard?tab=settings')} className="profile-quick-link profile-quick-link--secondary">
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                  {user.referralCode ? (
                    <button type="button" onClick={() => router.push('/referrals')} className="profile-quick-link profile-quick-link--accent">
                      <Share2 className="h-4 w-4" />
                      My Referrals
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </aside>

          <div className="profile-content">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="profile-card">
              <div className="profile-card__head">
                <User className="h-4 w-4" />
                <h3>Personal information</h3>
              </div>
              <div className="profile-card__body">
                <div className="profile-fields">
                  <div className="profile-field">
                    <label>{t('firstName')}</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.firstName || ''}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className="profile-field__input"
                        placeholder="Enter your first name"
                      />
                    ) : (
                      <div className="profile-field__value">{user.firstName}</div>
                    )}
                  </div>

                  <div className="profile-field">
                    <label>{t('lastName')}</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.lastName || ''}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className="profile-field__input"
                        placeholder="Enter your last name"
                      />
                    ) : (
                      <div className="profile-field__value">{user.lastName}</div>
                    )}
                  </div>

                  <div className="profile-field">
                    <label>{t('email')}</label>
                    <div className="profile-field__value">
                      <Mail className="h-4 w-4 text-[var(--admin-muted)]" />
                      {user.email}
                    </div>
                  </div>

                  {user.userId ? (
                    <div className="profile-field">
                      <label>User ID</label>
                      <div className="profile-field__value profile-field__value--highlight">
                        <span className="flex items-center gap-2">
                          <Fingerprint className="h-4 w-4 text-blue-600" />
                          {user.userId}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            if (user.userId) {
                              await navigator.clipboard.writeText(user.userId);
                              showToast('User ID copied to clipboard!', 'success');
                            }
                          }}
                          className="profile-copy-btn"
                          title="Copy User ID"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="profile-field">
                    <label>{t('phone')}</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editForm.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="profile-field__input"
                        placeholder="Enter phone number"
                      />
                    ) : (
                      <div className="profile-field__value">
                        <Phone className="h-4 w-4 text-[var(--admin-muted)]" />
                        {user.phone || 'Not provided'}
                      </div>
                    )}
                  </div>

                  <div className="profile-field">
                    <label>{t('dateOfBirth')}</label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editForm.dateOfBirth || ''}
                        onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                        className="profile-field__input"
                      />
                    ) : (
                      <div className="profile-field__value">
                        <Calendar className="h-4 w-4 text-[var(--admin-muted)]" />
                        {formatDate(user.dateOfBirth)}
                      </div>
                    )}
                  </div>

                  <div className="profile-field profile-field--full">
                    <label>{t('address')}</label>
                    {isEditing ? (
                      <textarea
                        value={editForm.address || ''}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        rows={3}
                        className="profile-field__textarea"
                        placeholder="Enter your address"
                      />
                    ) : (
                      <div className="profile-field__value">
                        <MapPin className="h-4 w-4 shrink-0 text-[var(--admin-muted)]" />
                        {user.address || 'Not provided'}
                      </div>
                    )}
                  </div>

                  <div className="profile-field profile-field--full">
                    <label>{t('bio')}</label>
                    {isEditing ? (
                      <textarea
                        value={editForm.bio || ''}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                        rows={4}
                        className="profile-field__textarea"
                        placeholder="Tell us about yourself..."
                      />
                    ) : (
                      <div className="profile-field__value">{user.bio || 'No bio provided'}</div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="profile-card">
              <div className="profile-card__head">
                <Bell className="h-4 w-4 profile-card__head-icon--green" />
                <h3>{t('notifications')}</h3>
              </div>
              <div className="profile-card__body profile-prefs">
                <div className="profile-pref">
                  <div>
                    <h4>{t('emailNotifications')}</h4>
                    <p>Receive notifications via email</p>
                  </div>
                  <label className={`profile-toggle${editForm.preferences?.emailNotifications ? ' is-on' : ''}${!isEditing ? ' is-disabled' : ''}`}>
                    <input
                      type="checkbox"
                      checked={editForm.preferences?.emailNotifications || false}
                      onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                      disabled={!isEditing}
                    />
                  </label>
                </div>

                <div className="profile-pref">
                  <div>
                    <h4>{t('security')}</h4>
                    <p>Manage password, 2FA, and security preferences</p>
                  </div>
                  <button type="button" onClick={() => router.push('/settings')} className="profile-btn profile-btn--primary">
                    {t('edit')}
                  </button>
                </div>

                <div className="profile-pref">
                  <div>
                    <h4>{t('pushNotifications')}</h4>
                    <p>Receive push notifications in browser</p>
                  </div>
                  <label className={`profile-toggle${editForm.preferences?.pushNotifications ? ' is-on' : ''}${!isEditing ? ' is-disabled' : ''}`}>
                    <input
                      type="checkbox"
                      checked={editForm.preferences?.pushNotifications || false}
                      onChange={(e) => handlePreferenceChange('pushNotifications', e.target.checked)}
                      disabled={!isEditing}
                    />
                  </label>
                </div>

                <div className="profile-pref">
                  <div>
                    <h4>{t('marketingEmails')}</h4>
                    <p>Receive promotional and marketing emails</p>
                  </div>
                  <label className={`profile-toggle${editForm.preferences?.marketingEmails ? ' is-on' : ''}${!isEditing ? ' is-disabled' : ''}`}>
                    <input
                      type="checkbox"
                      checked={editForm.preferences?.marketingEmails || false}
                      onChange={(e) => handlePreferenceChange('marketingEmails', e.target.checked)}
                      disabled={!isEditing}
                    />
                  </label>
                </div>
              </div>
            </motion.div>

            {user.balance !== undefined && user.balance > 0 ? (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="profile-card">
                <div className="profile-card__head">
                  <Wallet className="h-4 w-4 profile-card__head-icon--green" />
                  <h3>Withdrawal</h3>
                </div>
                <div className="profile-card__body">
                  {showWithdrawalForm ? (
                    <div className="profile-fields">
                      <div className="profile-field profile-field--full">
                        <label>Amount (USDT)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={user.balance}
                          value={withdrawalAmount}
                          onChange={(e) => setWithdrawalAmount(e.target.value)}
                          placeholder={`Max: $${(user.balance || 0).toFixed(2)}`}
                          className="profile-field__input"
                        />
                      </div>
                      <div className="profile-field profile-field--full">
                        <label>Wallet address</label>
                        <input
                          type="text"
                          value={withdrawalWallet}
                          onChange={(e) => setWithdrawalWallet(e.target.value)}
                          placeholder="Enter your USDT wallet address"
                          className="profile-field__input font-mono text-sm"
                        />
                      </div>
                      <div className="profile-field profile-field--full">
                        <label>Network</label>
                        <div className="profile-field__value">TRC20 (Tron) — only supported network</div>
                        <p className="mt-2 text-xs text-[var(--admin-muted)]">
                          Withdrawals are processed on TRC20 only. Do not use ERC20 or BEP20 addresses.
                        </p>
                      </div>
                      <div className="profile-field profile-field--full">
                        <div className="profile-withdraw-alert">
                          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
                          <p>Admin will process your withdrawal request. You will be notified once it&apos;s completed.</p>
                        </div>
                      </div>
                      <div className="profile-field profile-field--full">
                        <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setShowWithdrawalForm(false);
                            setWithdrawalAmount('');
                            setWithdrawalWallet('');
                          }}
                          className="profile-btn profile-btn--ghost flex-1 justify-center"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const amount = parseFloat(withdrawalAmount);
                            const MIN_WITHDRAWAL_AMOUNT = 30;
                            if (!amount || amount <= 0) {
                              showToast('Please enter a valid amount', 'error');
                              return;
                            }
                            if (amount < MIN_WITHDRAWAL_AMOUNT) {
                              showToast(`Minimum withdrawal amount is $${MIN_WITHDRAWAL_AMOUNT}`, 'error');
                              return;
                            }
                            if (amount > (user.balance || 0)) {
                              showToast('Insufficient balance', 'error');
                              return;
                            }
                            if (!withdrawalWallet.trim()) {
                              showToast('Please enter wallet address', 'error');
                              return;
                            }
                            try {
                              setWithdrawing(true);
                              const token = localStorage.getItem('token');
                              const response = await fetch(buildApiUrl('api/withdrawals/request'), {
                                method: 'POST',
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  amount,
                                  walletAddress: withdrawalWallet,
                                  network: 'TRC20',
                                }),
                              });
                              const data = await response.json();
                              if (response.ok) {
                                showToast('Withdrawal request submitted successfully!', 'success');
                                setShowWithdrawalForm(false);
                                setWithdrawalAmount('');
                                setWithdrawalWallet('');
                                fetchUserProfile();
                                await refreshUser();
                                window.dispatchEvent(new Event('platform:userChanged'));
                              } else {
                                showToast(data.message || 'Failed to submit withdrawal request', 'error');
                              }
                            } catch (error) {
                              console.error('Withdrawal error:', error);
                              showToast('Error submitting withdrawal request', 'error');
                            } finally {
                              setWithdrawing(false);
                            }
                          }}
                          disabled={withdrawing}
                          className="profile-btn profile-btn--success flex-1 justify-center"
                        >
                          {withdrawing ? 'Submitting...' : 'Submit request'}
                        </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="profile-balance">
                      <p className="text-sm text-[var(--admin-muted)]">
                        Your balance: <strong className="text-[var(--admin-text)]">${(user.balance || 0).toFixed(2)} USDT</strong>
                      </p>
                      <button type="button" onClick={() => setShowWithdrawalForm(true)} className="profile-btn profile-btn--success mt-4">
                        <ArrowUpRight className="h-4 w-4" />
                        Request withdrawal
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : null}
          </div>
        </div>
      </main>

      {cropOpen ? (
        <div className="profile-crop-modal" role="dialog" aria-modal="true" onClick={closeCrop}>
          <div className="profile-crop-modal__panel" onClick={(e) => e.stopPropagation()}>
            <div className="profile-crop-modal__head">
              <div>
                <h3>Crop profile photo</h3>
                <p>Drag to reposition, use the slider to zoom.</p>
              </div>
              <button type="button" onClick={closeCrop} className="profile-copy-btn" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="profile-crop-modal__body">
              <div className="flex justify-center">
                <div
                  className="relative select-none"
                  onMouseDown={(e) => {
                    if (!cropOpen) return;
                    setCropDragging(true);
                    cropDragStartRef.current = { x: e.clientX, y: e.clientY, ox: cropOffset.x, oy: cropOffset.y };
                  }}
                  onMouseMove={(e) => {
                    if (!cropDragging || !cropDragStartRef.current) return;
                    const s = cropDragStartRef.current;
                    setCropOffset({ x: s.ox + (e.clientX - s.x), y: s.oy + (e.clientY - s.y) });
                  }}
                  onMouseUp={() => {
                    setCropDragging(false);
                    cropDragStartRef.current = null;
                  }}
                  onMouseLeave={() => {
                    setCropDragging(false);
                    cropDragStartRef.current = null;
                  }}
                  onTouchStart={(e) => {
                    const t0 = e.touches[0];
                    if (!t0) return;
                    setCropDragging(true);
                    cropDragStartRef.current = { x: t0.clientX, y: t0.clientY, ox: cropOffset.x, oy: cropOffset.y };
                  }}
                  onTouchMove={(e) => {
                    const t0 = e.touches[0];
                    if (!t0 || !cropDragging || !cropDragStartRef.current) return;
                    const s = cropDragStartRef.current;
                    setCropOffset({ x: s.ox + (t0.clientX - s.x), y: s.oy + (t0.clientY - s.y) });
                  }}
                  onTouchEnd={() => {
                    setCropDragging(false);
                    cropDragStartRef.current = null;
                  }}
                >
                  <canvas ref={cropCanvasRef} width={320} height={320} className="profile-crop-canvas" />
                  {cropSrc ? (
                    <img
                      src={cropSrc}
                      alt="Crop source"
                      className="hidden"
                      onLoad={(e) => {
                        cropImgRef.current = e.currentTarget;
                        drawCropPreview();
                      }}
                    />
                  ) : null}
                </div>
              </div>
              <div className="mt-5">
                <label className="block text-sm font-medium mb-2">Zoom</label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={cropZoom}
                  onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
            <div className="profile-crop-modal__foot">
              <button type="button" onClick={closeCrop} className="profile-btn profile-btn--ghost">Cancel</button>
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    const cropped = await buildCroppedAvatarFile(512);
                    if (!cropped) {
                      showToast('Failed to process image. Try a different photo.', 'error');
                      return;
                    }
                    if (draftAvatarUrl) URL.revokeObjectURL(draftAvatarUrl);
                    setDraftAvatarFile(cropped);
                    setDraftAvatarUrl(URL.createObjectURL(cropped));
                    closeCrop();
                  } catch (err) {
                    console.error('Crop+upload error:', err);
                    showToast('Failed to process image.', 'error');
                  }
                }}
                className="profile-btn profile-btn--primary"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const nodemailer = require('nodemailer');
const Settings = require('../models/Settings');
const User = require('../models/User');
const NotificationTracking = require('../models/NotificationTracking');
const Notification = require('../models/Notification');
const emailTemplates = require('./emailTemplates');

function escapeHtml(str) {
  if (str == null || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isUsableFromEmail(value) {
  const email = String(value || '').trim();
  if (!email || !email.includes('@')) return false;
  const lower = email.toLowerCase();
  return !lower.endsWith('@example.com') && lower !== 'noreply@example.com';
}

function isUsableFromName(value) {
  const name = String(value || '').trim();
  return Boolean(name) && !/^platform name$/i.test(name);
}

/** Merge DB email settings with .env fallback so .env SMTP works without re-entering in Admin */
function getEffectiveEmailConfig(dbEmail) {
  const env = process.env;
  const smtpUser = dbEmail?.smtpUser || env.SMTP_USER || '';
  const fromEmailCandidate = dbEmail?.fromEmail || env.SMTP_FROM_EMAIL || '';
  const fromNameCandidate = dbEmail?.fromName || env.SMTP_FROM_NAME || '';
  return {
    smtpHost: dbEmail?.smtpHost || env.SMTP_HOST || '',
    smtpPort: dbEmail?.smtpPort ?? (env.SMTP_PORT ? parseInt(env.SMTP_PORT, 10) : 587),
    smtpUser,
    smtpPassword: dbEmail?.smtpPassword || env.SMTP_PASSWORD || '',
    // Gmail rejects mismatched From addresses; never send as example.com placeholders.
    fromEmail: isUsableFromEmail(fromEmailCandidate) ? fromEmailCandidate.trim() : (smtpUser || 'noreply@forexnavigators.com'),
    fromName: isUsableFromName(fromNameCandidate) ? fromNameCandidate.trim() : 'Forex Navigators',
    isMockMode: dbEmail?.isMockMode ?? false
  };
}

/** Strip leftover {{...}} placeholders, but keep tracked-button placeholders if somehow unreplaced. */
function stripTemplatePlaceholders(str) {
  if (str == null || typeof str !== 'string') return str;
  return str
    .replace(/\{\{\s*(track|trackUrl|button_[a-zA-Z0-9_-]+)\s*\}\}/g, '#')
    .replace(/\{\{[^}]*\}\}/g, '');
}

class NotificationService {
  constructor() {
    this.emailTransporter = null;
    this.initializeEmailTransporter();
  }

  /**
   * Initialize email transporter with settings from database
   */
  async initializeEmailTransporter() {
    try {
      const settings = await Settings.getSettings();
      const emailConfig = getEffectiveEmailConfig(settings.email);

      // Check if we're in mock mode
      if (emailConfig.isMockMode) {
        console.log('Mock email mode enabled - emails will be logged to console');
        this.emailTransporter = null; // No real transporter needed
        return;
      }

      if (emailConfig.smtpHost && emailConfig.smtpPort && emailConfig.smtpUser && emailConfig.smtpPassword) {
        this.emailTransporter = nodemailer.createTransport({
          host: emailConfig.smtpHost,
          port: emailConfig.smtpPort,
          secure: emailConfig.smtpPort === 465, // true for 465, false for other ports
          auth: {
            user: emailConfig.smtpUser,
            pass: emailConfig.smtpPassword,
          },
          tls: {
            rejectUnauthorized: false // For development purposes
          }
        });

        // Verify transporter configuration
        await this.emailTransporter.verify();
        console.log('Email transporter initialized successfully');
      } else {
        console.log('Email configuration incomplete, email notifications disabled');
      }
    } catch (error) {
      console.error('Failed to initialize email transporter:', error.message);
    }
  }

  /**
   * Refresh email transporter with updated settings
   * @returns {Promise<boolean>} - Success status
   */
  async refreshEmailTransporter() {
    try {
      console.log('Refreshing email transporter with updated settings...');
      await this.initializeEmailTransporter();
      return true;
    } catch (error) {
      console.error('Failed to refresh email transporter:', error.message);
      return false;
    }
  }

  /**
   * Send email notification
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.html - HTML content
   * @param {string} options.text - Plain text content
   * @param {string} options.userId - User ID for tracking
   * @param {string} options.type - Notification type for tracking
   * @param {string} options.bulkNotificationId - Bulk notification ID if applicable
   * @returns {Promise<boolean>} - Success status
   */
  async sendEmail({ to, subject, html, text, userId, type, bulkNotificationId }) {
    let trackingRecord = null;
    
    try {
      console.log(`[Email] Attempting to send email to ${to}, subject: ${subject}, type: ${type}`);
      
      // Skip if recipient is marked as unreachable (by userId or by email lookup)
      let recipientUser = userId ? await User.findById(userId) : await User.findOne({ email: (to || '').toLowerCase().trim() });
      if (recipientUser && recipientUser.emailUnreachable === true) {
        console.log(`[Email] Skipping - ${to} is marked as unreachable`);
        return false;
      }
      
      // Create tracking record (never block send if tracking schema rejects a type)
      if (userId) {
        try {
          trackingRecord = new NotificationTracking({
            userId,
            type: type || 'system',
            channel: 'email',
            status: 'pending',
            title: subject,
            message: text || this.stripHtml(html),
            bulkNotificationId
          });
          await trackingRecord.save();
        } catch (trackingError) {
          console.warn(
            `[Email] NotificationTracking skipped for type=${type}:`,
            trackingError?.message || trackingError
          );
          trackingRecord = null;
        }
      }

      // Always get fresh settings from database (with .env fallback)
      const settings = await Settings.getSettings();
      const emailConfig = getEffectiveEmailConfig(settings.email);

      console.log(`[Email] SMTP Config - Host: ${emailConfig.smtpHost}, User: ${emailConfig.smtpUser}, Mock Mode: ${emailConfig.isMockMode}`);

      // Check if we're in mock mode
      if (emailConfig.isMockMode) {
        const safeHtml = stripTemplatePlaceholders(html);
        const safeText = stripTemplatePlaceholders(text || this.stripHtml(html));
        const safeSubject = stripTemplatePlaceholders(subject);
        console.log('\n📧 MOCK EMAIL SENT:');
        console.log('To:', to);
        console.log('Subject:', safeSubject);
        console.log('From:', `${emailConfig.fromName} <${emailConfig.fromEmail}>`);
        console.log('Content:', safeText);
        console.log('---\n');
        
        if (trackingRecord) {
          await trackingRecord.markAsDelivered();
        }
        return true;
      }

      // Check if we have valid configuration
      if (!emailConfig.smtpHost || !emailConfig.smtpUser || !emailConfig.smtpPassword) {
        console.error('[Email] Missing SMTP configuration:', {
          hasHost: !!emailConfig.smtpHost,
          hasUser: !!emailConfig.smtpUser,
          hasPassword: !!emailConfig.smtpPassword
        });
        console.log('Email configuration incomplete, skipping email notification');
        if (trackingRecord) {
          await trackingRecord.markAsFailed('Email configuration incomplete');
        }
        return false;
      }

      // Create fresh transporter for each email (ensures latest settings + .env fallback)
      const transporter = nodemailer.createTransport({
        host: emailConfig.smtpHost,
        port: emailConfig.smtpPort,
        secure: emailConfig.smtpPort === 465,
        auth: {
          user: emailConfig.smtpUser,
          pass: emailConfig.smtpPassword
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Strip any unreplaced {{...}} placeholders so variables never show in email
      const safeHtml = stripTemplatePlaceholders(html);
      const safeText = stripTemplatePlaceholders(text || this.stripHtml(html));
      const safeSubject = stripTemplatePlaceholders(subject);

      const mailOptions = {
        from: `"${emailConfig.fromName}" <${emailConfig.fromEmail}>`,
        to,
        subject: safeSubject,
        html: safeHtml,
        text: safeText
      };

      console.log('[Email] Attempting to send email via SMTP...');
      const info = await transporter.sendMail(mailOptions);
      console.log('[Email] ✅ Email sent successfully!');
      console.log('[Email] Message ID:', info.messageId);
      console.log('[Email] Response:', info.response);
      
      // Update tracking record
      if (trackingRecord) {
        trackingRecord.status = 'sent';
        trackingRecord.sentAt = new Date();
        trackingRecord.metadata = { messageId: info.messageId };
        await trackingRecord.save();
      }
      
      return true;
    } catch (error) {
      console.error('[Email] ❌ Failed to send email:', error.message);
      console.error('[Email] Error code:', error.code);
      console.error('[Email] Error command:', error.command);
      console.error('[Email] Error response:', error.response);
      console.error('[Email] Error stack:', error.stack);
      
      // Update tracking record with error
      if (trackingRecord) {
        await trackingRecord.markAsFailed(error.message);
      }
      
      return false;
    }
  }

  /**
   * Send SMS notification (placeholder for future implementation)
   * @param {Object} options - SMS options
   * @param {string} options.to - Phone number
   * @param {string} options.message - SMS message
   * @returns {Promise<boolean>} - Success status
   */
  async sendSMS({ to, message }) {
    try {
      // TODO: Implement SMS service (Twilio, AWS SNS, etc.)
      console.log(`SMS notification (not implemented): ${to} - ${message}`);
      return true;
    } catch (error) {
      console.error('Failed to send SMS:', error.message);
      return false;
    }
  }

  /**
   * Send push notification (placeholder for future implementation)
   * @param {Object} options - Push notification options
   * @param {string} options.userId - User ID
   * @param {string} options.title - Notification title
   * @param {string} options.body - Notification body
   * @param {Object} options.data - Additional data
   * @returns {Promise<boolean>} - Success status
   */
  async sendPushNotification({ userId, title, body, data = {} }) {
    try {
      const user = await User.findById(userId).select('preferences.expoPushToken preferences.pushNotifications');
      if (!user) {
        console.log(`[Push] User not found: ${userId}`);
        return false;
      }

      if (user.preferences?.pushNotifications === false) {
        console.log(`[Push] Disabled for user ${userId}`);
        return false;
      }

      const token = user.preferences?.expoPushToken;
      if (!token) {
        console.log(`[Push] No Expo token for user ${userId}`);
        return false;
      }

      const settings = await Settings.getSettings();
      if (settings.notifications?.pushNotifications === false) {
        console.log('[Push] Disabled globally in settings');
        return false;
      }

      const { sendToToken } = require('./expoPushService');
      const sent = await sendToToken(token, { title, body, data });
      if (sent) {
        console.log(`[Push] Sent to user ${userId}: ${title}`);
      }
      return sent;
    } catch (error) {
      console.error('Failed to send push notification:', error.message);
      return false;
    }
  }

  /**
   * Send notification to user based on their preferences
   * @param {string} userId - User ID
   * @param {string} type - Notification type
   * @param {Object} data - Notification data
   * @param {string} bulkNotificationId - Optional bulk notification ID for tracking
   * @returns {Promise<Object>} - Results for each channel
   */
  async sendNotificationToUser(userId, type, data, bulkNotificationId = null) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const settings = await Settings.getSettings();
      const results = {
        email: false,
        sms: false,
        push: false
      };

      // Check if notification type is enabled in global settings
      const isTypeEnabled = this.isNotificationTypeEnabled(settings, type);
      if (!isTypeEnabled) {
        console.log(`Notification type ${type} is disabled globally`);
        return results;
      }

      // Generate notification content
      console.log(`[Notification] Generating content for type: ${type}`);
      const content = this.generateNotificationContent(type, data, user);
      console.log(`[Notification] Content generated - Subject: ${content.subject}`);
      console.log(`[Notification] HTML length: ${content.html?.length || 0} chars`);
      console.log(`[Notification] Text length: ${content.text?.length || 0} chars`);

      // Send email notification (skip if user marked as unreachable)
      const emailEnabled = settings.notifications.emailNotifications;
      const userEmailEnabled = user.preferences?.emailNotifications !== false;
      const emailUnreachable = user.emailUnreachable === true;
      console.log(`[Notification] Email enabled - Global: ${emailEnabled}, User: ${userEmailEnabled}, Unreachable: ${emailUnreachable}`);
      
      if (emailUnreachable) {
        console.log(`[Notification] Skipping email to ${user.email} - marked as unreachable`);
        return results;
      }
      
      if (emailEnabled && userEmailEnabled) {
        console.log(`[Notification] Sending email to ${user.email}`);
        results.email = await this.sendEmail({
          to: user.email,
          subject: content.subject,
          html: content.html,
          text: content.text,
          userId: user._id.toString(),
          type: type,
          bulkNotificationId: bulkNotificationId
        });
        console.log(`[Notification] Email send result: ${results.email}`);
      } else {
        console.log(`[Notification] Email notifications disabled - skipping email`);
      }

      // Send SMS notification
      if (settings.notifications.smsNotifications && user.phone && user.preferences?.smsNotifications !== false) {
        results.sms = await this.sendSMS({
          to: user.phone,
          message: content.sms
        });
      }

      // Send push notification
      if (settings.notifications.pushNotifications && user.preferences?.pushNotifications !== false) {
        results.push = await this.sendPushNotification({
          userId: user._id.toString(),
          title: content.pushTitle,
          body: content.pushBody,
          data: { type, ...data }
        });
      }

      return results;
    } catch (error) {
      console.error('Failed to send notification to user:', error.message);
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   * @param {Array<string>} userIds - Array of user IDs
   * @param {string} type - Notification type
   * @param {Object} data - Notification data
   * @param {string} bulkNotificationId - Optional bulk notification ID for tracking
   * @returns {Promise<Array>} - Array of results
   */
  async sendBulkNotification(userIds, type, data, bulkNotificationId = null) {
    const results = [];
    
    for (const userId of userIds) {
      try {
        const result = await this.sendNotificationToUser(userId, type, data, bulkNotificationId);
        results.push({ userId, success: true, result });
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Send notification to admins
   * @param {string} type - Notification type
   * @param {Object} data - Notification data
   * @returns {Promise<Array>} - Array of results
   */
  async sendAdminNotification(type, data) {
    try {
      const admins = await User.find({ role: 'admin' });
      const adminIds = admins.map(admin => admin._id.toString());
      return await this.sendBulkNotification(adminIds, type, data);
    } catch (error) {
      console.error('Failed to send admin notification:', error.message);
      throw error;
    }
  }

  /**
   * Check if notification type is enabled in settings
   * @param {Object} settings - Platform settings
   * @param {string} type - Notification type
   * @returns {boolean} - Whether type is enabled
   */
  isNotificationTypeEnabled(settings, type) {
    const typeMap = {
      'user_registration': 'newUserRegistration',
      'payment_received': 'paymentReceived',
      'payment_pending': 'paymentReceived', // Use paymentReceived setting for payment_pending
      'monthly_fee_imposed': 'paymentReceived',
      'monthly_fee_invoice': 'paymentReceived',
      'course_enrollment': 'newUserRegistration',
      'system_alert': 'systemAlerts',
      'password_reset': 'systemAlerts',
      'login_security': 'systemAlerts',
      '2fa_enabled': 'systemAlerts',
      'account_locked': 'systemAlerts'
    };

    const settingKey = typeMap[type];
    const isEnabled = settingKey ? settings.notifications[settingKey] : true;
    console.log(`[Notification] Type ${type} enabled check - Setting key: ${settingKey}, Enabled: ${isEnabled}`);
    return isEnabled;
  }

  /**
   * Generate notification content based on type and data
   * @param {string} type - Notification type
   * @param {Object} data - Notification data
   * @param {Object} user - User object
   * @returns {Object} - Generated content
   */
  generateNotificationContent(type, data, user) {
    // emailTemplates is now loaded at the top of the file

    const templates = {
      user_registration: {
        subject: 'Welcome to Forex Navigators!',
        html: this.getWelcomeEmailTemplate(user, data),
        text: `Welcome to Forex Navigators, ${user.firstName}! Your account has been created successfully.`,
        sms: `Welcome to Forex Navigators! Your account is ready.`,
        pushTitle: 'Welcome!',
        pushBody: 'Your Forex Navigators account is ready'
      },
      payment_received: {
        subject: 'Payment Received - Forex Navigators',
        html: this.getPaymentEmailTemplate(user, data),
        text: `Payment of $${data.amount} received successfully. Transaction ID: ${data.transactionId}`,
        sms: `Payment of $${data.amount} confirmed. Welcome to Forex Navigators!`,
        pushTitle: 'Payment Confirmed',
        pushBody: `Your payment of $${data.amount} has been processed`
      },
      course_enrollment: {
        subject: 'Course Enrollment Confirmed - Forex Navigators',
        html: this.getCourseEnrollmentTemplate(user, data),
        text: `You have successfully enrolled in "${data.courseName}". Start learning now!`,
        sms: `Enrolled in ${data.courseName}. Happy learning!`,
        pushTitle: 'Course Enrollment',
        pushBody: `Enrolled in ${data.courseName}`
      },
      password_reset: {
        subject: 'Password Reset - Forex Navigators',
        html: this.getPasswordResetTemplate(user, data),
        text: `Your password reset link: ${data.resetLink}`,
        sms: 'Password reset requested. Check your email for the link.',
        pushTitle: 'Password Reset',
        pushBody: 'Password reset link sent to your email'
      },
      '2fa_enabled': {
        subject: '2FA Enabled - Forex Navigators',
        html: this.get2FATemplate(user, data),
        text: 'Two-factor authentication has been enabled for your account.',
        sms: '2FA enabled for your Forex Navigators account.',
        pushTitle: 'Security Update',
        pushBody: '2FA has been enabled for your account'
      },
      account_locked: {
        subject: 'Account Security Alert - Forex Navigators',
        html: this.getAccountLockedTemplate(user, data),
        text: 'Your account has been temporarily locked due to multiple failed login attempts.',
        sms: 'Account locked due to failed login attempts. Contact support if needed.',
        pushTitle: 'Security Alert',
        pushBody: 'Account temporarily locked for security'
      }
    };

    // Handle payment_pending dynamically since it needs user and data
    if (type === 'payment_pending') {
      try {
        console.log('[Notification] Processing payment_pending notification');
        console.log('[Notification] User:', user.firstName, user.lastName);
        console.log('[Notification] Data:', JSON.stringify(data, null, 2));
        
        // Format payment ID - get first 8 characters if it's an ObjectId or long string
        let paymentIdStr = 'N/A';
        if (data.paymentId) {
          const paymentId = data.paymentId.toString();
          paymentIdStr = paymentId.length > 8 ? paymentId.substring(0, 8) : paymentId;
        }
        
        const template = emailTemplates.renderTemplate('payment_pending', {
          userName: `${user.firstName} ${user.lastName}`,
          amount: data.amount || data.finalAmount || 0,
          currency: data.currency || 'USD',
          packageName: data.packageName || 'Premium Package',
          paymentId: paymentIdStr,
          loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
          companyName: 'Forex Navigators'
        });
        
        console.log('[Notification] ✅ Template rendered successfully!');
        console.log('[Notification] HTML length:', template.html?.length || 0);
        console.log('[Notification] Subject:', template.subject);
        console.log('[Notification] Template preview (first 200 chars):', template.html?.substring(0, 200));
        
        return {
          subject: template.subject || 'Payment Received - Awaiting Admin Approval',
          html: template.html,
          text: template.text,
          sms: `Payment of $${data.amount || data.finalAmount || 0} received. Awaiting admin approval.`,
          pushTitle: 'Payment Received',
          pushBody: `Your payment is being reviewed`
        };
      } catch (error) {
        console.error('[Notification] ❌ Error rendering payment_pending template:', error);
        console.error('[Notification] Error message:', error.message);
        console.error('[Notification] Error stack:', error.stack);
        // Fallback to simple template if rendering fails
        return {
          subject: 'Payment Received - Awaiting Admin Approval',
          html: `<p>Hello ${user.firstName},</p><p>Your payment is being reviewed by our admin team.</p>`,
          text: `Hello ${user.firstName}, your payment is being reviewed.`,
          sms: `Payment received. Awaiting admin approval.`,
          pushTitle: 'Payment Received',
          pushBody: 'Your payment is being reviewed'
        };
      }
    }

    // Handle payment_confirmed dynamically
    if (type === 'payment_confirmed') {
      try {
        console.log('[Notification] Processing payment_confirmed notification');
        console.log('[Notification] User:', user.firstName, user.lastName);
        console.log('[Notification] Data:', JSON.stringify(data, null, 2));
        
        const template = emailTemplates.renderTemplate('payment_confirmed', {
          userName: `${user.firstName} ${user.lastName}`,
          amount: data.amount || data.finalAmount || 0,
          currency: data.currency || 'USD',
          packageName: data.packageName || 'Premium Package',
          transactionId: data.transactionId || data.paymentId?.toString() || 'N/A',
          date: data.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
          companyName: 'Forex Navigators'
        });
        
        console.log('[Notification] ✅ Payment confirmed template rendered successfully!');
        console.log('[Notification] HTML length:', template.html?.length || 0);
        console.log('[Notification] Subject:', template.subject);
        
        return {
          subject: template.subject || 'Payment Confirmed - Your Account is Activated!',
          html: template.html,
          text: template.text,
          sms: `Payment of $${data.amount || data.finalAmount || 0} confirmed. Your account is now activated!`,
          pushTitle: 'Payment Confirmed',
          pushBody: `Your payment has been confirmed!`
        };
      } catch (error) {
        console.error('[Notification] ❌ Error rendering payment_confirmed template:', error);
        return {
          subject: 'Payment Confirmed - Your Account is Activated!',
          html: `<p>Hello ${user.firstName},</p><p>Your payment has been confirmed. Your account is now activated!</p>`,
          text: `Hello ${user.firstName}, your payment has been confirmed.`,
          sms: `Payment confirmed. Account activated.`,
          pushTitle: 'Payment Confirmed',
          pushBody: 'Your payment has been confirmed!'
        };
      }
    }

    const paymentAdminTemplates = new Set([
      'payment_complete_required',
      'payment_unable_verify',
      'payment_rejected_retry'
    ]);
    if (paymentAdminTemplates.has(type)) {
      try {
        const paymentIdRaw = data.paymentId || data._id || data.payment?._id;
        let paymentIdStr = 'N/A';
        if (paymentIdRaw) {
          const s = paymentIdRaw.toString();
          paymentIdStr = s.length > 8 ? s.substring(0, 8) : s;
        }
        const template = emailTemplates.renderTemplate(type, {
          userName: `${user.firstName} ${user.lastName}`,
          amount: data.amount || data.finalAmount || 0,
          currency: data.currency || 'USD',
          packageName: data.packageName || 'Premium Package',
          paymentId: paymentIdStr,
          loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
          companyName: 'Forex Navigators',
          note: data.note || ''
        });
        return {
          subject: template.subject,
          html: template.html,
          text: template.text,
          sms: template.text ? template.text.slice(0, 140) : 'Payment update. Please check your email.',
          pushTitle: template.subject || 'Payment update',
          pushBody: 'Please check your email for details'
        };
      } catch (error) {
        console.error(`[Notification] ❌ Error rendering ${type} template:`, error);
        const fallbackTitle = data?.title || 'Payment update';
        const fallbackMessage =
          data?.message ||
          'Please check your payment details in the app and submit again if required.';
        return {
          subject: fallbackTitle,
          html: `<p>Hello ${user.firstName},</p><p>${escapeHtml(fallbackMessage)}</p>`,
          text: `Hello ${user.firstName},\n\n${fallbackMessage}`,
          sms: fallbackMessage,
          pushTitle: fallbackTitle,
          pushBody: fallbackMessage
        };
      }
    }

    // Handle account_verified dynamically
    if (type === 'account_verified') {
      try {
        console.log('[Notification] Processing account_verified notification');
        const template = emailTemplates.renderTemplate('account_verified', {
          userName: `${user.firstName} ${user.lastName}`,
          packageName: data.packageName || 'Premium Package',
          loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
          companyName: 'Forex Navigators'
        });
        
        console.log('[Notification] ✅ Account verified template rendered successfully!');
        
        return {
          subject: template.subject || 'Account Verified - Welcome!',
          html: template.html,
          text: template.text,
          sms: `Your Forex Navigators account has been verified!`,
          pushTitle: 'Account Verified',
          pushBody: 'Your account is now active!'
        };
      } catch (error) {
        console.error('[Notification] ❌ Error rendering account_verified template:', error);
        return {
          subject: 'Account Verified - Welcome!',
          html: `<p>Hello ${user.firstName},</p><p>Your account has been verified.</p>`,
          text: `Hello ${user.firstName}, your account has been verified.`,
          sms: `Your account has been verified!`,
          pushTitle: 'Account Verified',
          pushBody: 'Your account is now active!'
        };
      }
    }

    // Handle withdrawal_request dynamically
    if (type === 'withdrawal_request') {
      try {
        console.log('[Notification] Processing withdrawal_request notification');
        const template = emailTemplates.renderTemplate('withdrawal_request', {
          userName: `${user.firstName} ${user.lastName}`,
          amount: data.amount || 0,
          currency: data.currency || 'USDT',
          walletAddress: data.walletAddress || 'N/A',
          network: data.network || 'TRC20',
          withdrawalId: data.withdrawalId ? data.withdrawalId.toString().substring(0, 8) : 'N/A',
          loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
          companyName: 'Forex Navigators'
        });
        
        console.log('[Notification] ✅ Withdrawal request template rendered successfully!');
        
        return {
          subject: template.subject || 'Withdrawal Request Submitted - Awaiting Admin Approval',
          html: template.html,
          text: template.text,
          sms: `Withdrawal request of $${data.amount || 0} submitted. Awaiting admin approval.`,
          pushTitle: 'Withdrawal Request Submitted',
          pushBody: `Your withdrawal request is being reviewed`
        };
      } catch (error) {
        console.error('[Notification] ❌ Error rendering withdrawal_request template:', error);
        return {
          subject: 'Withdrawal Request Submitted',
          html: `<p>Hello ${user.firstName},</p><p>Your withdrawal request has been submitted and is being reviewed.</p>`,
          text: `Hello ${user.firstName}, your withdrawal request has been submitted.`,
          sms: `Withdrawal request submitted.`,
          pushTitle: 'Withdrawal Request Submitted',
          pushBody: 'Your withdrawal request is being reviewed'
        };
      }
    }

    // Handle withdrawal_confirmed dynamically
    if (type === 'withdrawal_confirmed') {
      try {
        console.log('[Notification] Processing withdrawal_confirmed notification');
        const template = emailTemplates.renderTemplate('withdrawal_confirmed', {
          userName: `${user.firstName} ${user.lastName}`,
          amount: data.amount || 0,
          currency: data.currency || 'USDT',
          transactionHash: data.transactionHash || 'N/A',
          withdrawalId: data.withdrawalId ? data.withdrawalId.toString().substring(0, 8) : 'N/A',
          date: data.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`,
          companyName: 'Forex Navigators'
        });
        
        console.log('[Notification] ✅ Withdrawal confirmed template rendered successfully!');
        
        return {
          subject: template.subject || 'Withdrawal Confirmed - Funds Transferred!',
          html: template.html,
          text: template.text,
          sms: `Withdrawal of $${data.amount || 0} confirmed. Funds transferred!`,
          pushTitle: 'Withdrawal Confirmed',
          pushBody: `Your withdrawal has been processed!`
        };
      } catch (error) {
        console.error('[Notification] ❌ Error rendering withdrawal_confirmed template:', error);
        return {
          subject: 'Withdrawal Confirmed - Funds Transferred!',
          html: `<p>Hello ${user.firstName},</p><p>Your withdrawal has been confirmed and funds have been transferred.</p>`,
          text: `Hello ${user.firstName}, your withdrawal has been confirmed.`,
          sms: `Withdrawal confirmed. Funds transferred.`,
          pushTitle: 'Withdrawal Confirmed',
          pushBody: 'Your withdrawal has been processed!'
        };
      }
    }

    if (type === 'monthly_fee_invoice') {
      try {
        const paymentIdRaw = data.paymentId;
        const paymentIdStr = paymentIdRaw
          ? String(paymentIdRaw).length > 8
            ? String(paymentIdRaw).substring(0, 8)
            : String(paymentIdRaw)
          : '—';
        const template = emailTemplates.renderTemplate('monthly_fee_invoice', {
          userName: `${user.firstName} ${user.lastName}`.trim() || user.firstName || 'there',
          amount: Number(data.amount ?? 0).toFixed(2),
          currency: data.currency || 'USD',
          feeMonthLabel: data.feeForMonthLabel || 'Current billing cycle',
          packageName: data.packageName || 'Your package',
          paymentId: paymentIdStr,
          payByLabel: data.payByLabel || 'See Monthly fee page',
          monthlyFeeUrl:
            data.monthlyFeeUrl ||
            `${process.env.FRONTEND_URL || 'http://localhost:3000'}/monthly-fee`,
          invoiceNote: data.invoiceNote || 'Log in to submit your wallet transfer and payment proof.',
          companyName: 'Forex Navigators'
        });
        return {
          subject: template.subject || 'Monthly fee invoice',
          html: template.html,
          text: template.text,
          sms: `Monthly fee invoice: $${Number(data.amount ?? 0).toFixed(2)} USDT for ${data.feeForMonthLabel || 'this cycle'}.`,
          pushTitle: 'Monthly fee invoice',
          pushBody: `Please pay $${Number(data.amount ?? 0).toFixed(2)} USDT for ${data.feeForMonthLabel || 'your monthly fee'}.`
        };
      } catch (error) {
        console.error('[Notification] Error rendering monthly_fee_invoice template:', error);
        const amt = Number(data.amount ?? 0).toFixed(2);
        return {
          subject: 'Monthly fee invoice',
          html: `<p>Please pay your monthly fee of $${amt} USDT.</p>`,
          text: `Monthly fee invoice: $${amt} USDT.`,
          pushTitle: 'Monthly fee invoice',
          pushBody: `Please pay $${amt} USDT.`
        };
      }
    }

    // Admin-imposed monthly fee (student must pay via /monthly-fee)
    if (type === 'monthly_fee_imposed') {
      try {
        const paymentIdRaw = data.paymentId;
        const paymentIdStr = paymentIdRaw
          ? String(paymentIdRaw).length > 8
            ? String(paymentIdRaw).substring(0, 8)
            : String(paymentIdRaw)
          : 'N/A';
        const notes = (data.notes && String(data.notes).trim()) || '';
        const template = emailTemplates.renderTemplate('monthly_fee_imposed', {
          userName: `${user.firstName} ${user.lastName}`.trim() || user.firstName || 'there',
          amount: Number(data.amount ?? 0).toFixed(2),
          currency: data.currency || 'USD',
          feeMonthLabel: data.feeForMonthLabel || 'Current billing cycle',
          packageName: data.packageName || 'Your package',
          paymentId: paymentIdStr,
          monthlyFeeUrl:
            data.monthlyFeeUrl ||
            `${process.env.FRONTEND_URL || 'http://localhost:3000'}/monthly-fee`,
          blockAccessNote:
            data.blockAccessNote ||
            (data.blockAccessUntilPaid
              ? 'Your platform access is limited until this fee is paid and confirmed.'
              : 'You can continue using the platform; please complete this fee when you are ready.'),
          adminNotes: notes || '—',
          adminNotesDisplay: notes ? 'block' : 'none',
          adminNotesLine: notes ? `Admin note: ${notes}` : '',
          companyName: 'Forex Navigators'
        });

        return {
          subject: template.subject || 'Monthly fee required — action needed',
          html: template.html,
          text: template.text,
          sms: `Monthly fee of $${Number(data.amount ?? 0).toFixed(2)} USDT required. Open Monthly fee in the app.`,
          pushTitle: data.blockAccessUntilPaid ? 'Monthly fee required' : 'Monthly fee added',
          pushBody: data.blockAccessUntilPaid
            ? `Pay $${Number(data.amount ?? 0).toFixed(2)} USDT to restore full access.`
            : `A $${Number(data.amount ?? 0).toFixed(2)} USDT monthly fee was added to your account.`
        };
      } catch (error) {
        console.error('[Notification] Error rendering monthly_fee_imposed template:', error);
        const amt = Number(data.amount ?? 0).toFixed(2);
        const msg =
          data.message ||
          `Your administrator has added a monthly fee of $${amt} USDT. Open the Monthly fee page to pay.`;
        return {
          subject: 'Monthly fee required',
          html: `<p>Hello ${escapeHtml(user.firstName || 'there')},</p><p>${escapeHtml(msg)}</p>`,
          text: `Hello ${user.firstName || 'there'},\n\n${msg}`,
          sms: msg,
          pushTitle: 'Monthly fee required',
          pushBody: msg
        };
      }
    }

    // Handle balance_credited dynamically
    if (type === 'balance_credited') {
      try {
        console.log('[Notification] Processing balance_credited notification');
        const template = emailTemplates.renderTemplate('balance_credited', {
          userName: `${user.firstName} ${user.lastName}`,
          amount: data.amount || 0,
          currency: data.currency || 'USDT',
          description: data.description || 'Balance credited to your account',
          transactionId: data.transactionId ? data.transactionId.toString().substring(0, 8) : 'N/A',
          date: data.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`,
          companyName: 'Forex Navigators'
        });
        
        console.log('[Notification] ✅ Balance credited template rendered successfully!');
        
        return {
          subject: template.subject || 'Balance Credited to Your Account',
          html: template.html,
          text: template.text,
          sms: `$${data.amount || 0} USDT has been credited to your account.`,
          pushTitle: 'Balance Credited',
          pushBody: `$${data.amount || 0} USDT added to your account`
        };
      } catch (error) {
        console.error('[Notification] ❌ Error rendering balance_credited template:', error);
        return {
          subject: 'Balance Credited to Your Account',
          html: `<p>Hello ${user.firstName},</p><p>$${data.amount || 0} USDT has been credited to your account.</p><p>${data.description || ''}</p>`,
          text: `Hello ${user.firstName}, $${data.amount || 0} USDT has been credited to your account.`,
          sms: `$${data.amount || 0} USDT credited to your account.`,
          pushTitle: 'Balance Credited',
          pushBody: `$${data.amount || 0} USDT added to your account`  
        };
      }
    }

    // Handle rank_reward_unlocked dynamically
    if (type === 'rank_reward_unlocked') {
      try {
        console.log('[Notification] Processing rank_reward_unlocked notification');
        const template = emailTemplates.renderTemplate('rank_reward_unlocked', {
          userName: `${user.firstName} ${user.lastName}`.trim() || user.firstName || 'there',
          ruleName: data.ruleName || 'New tier',
          thresholdBalance: String(data.thresholdBalance ?? ''),
          directBusinessVolumeUsdAtUnlock: String(data.directBusinessVolumeUsdAtUnlock ?? ''),
          dashboardUrl: data.dashboardUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/rank-rewards`,
          companyName: 'Forex Navigators'
        });

        return {
          subject: template.subject || 'Rank reward unlocked — congratulations!',
          html: template.html,
          text: template.text,
          sms: `Rank reward unlocked: ${data.ruleName || ''}`.trim(),
          pushTitle: template.subject || 'Rank reward unlocked',
          pushBody: `You unlocked "${data.ruleName || 'a new tier'}"`
        };
      } catch (error) {
        console.error('[Notification] ❌ Error rendering rank_reward_unlocked template:', error);
        const fallbackTitle = 'Rank reward unlocked';
        const fallbackMessage =
          data?.message ||
          `Congratulations! You unlocked "${data?.ruleName || 'a new tier'}".`;
        return {
          subject: fallbackTitle,
          html: `<p>Hello ${escapeHtml(user.firstName || 'there')},</p><p><strong>${escapeHtml(fallbackTitle)}</strong></p><p>${escapeHtml(
            fallbackMessage
          )}</p>`,
          text: `Hello ${user.firstName || 'there'},\n\n${fallbackTitle}\n\n${fallbackMessage}`,
          sms: fallbackMessage,
          pushTitle: fallbackTitle,
          pushBody: fallbackMessage
        };
      }
    }

    // Default: use actual values only (no template placeholders) so variables never show in email
    const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'there';
    const notifTitle = (data && data.title) ? String(data.title) : 'New notification';
    const notifMessage = (data && data.message) ? String(data.message) : 'You have a new notification.';
    const defaultTemplate = {
      subject: (data && data.title) ? String(data.title) : 'Notification from Forex Navigators',
      html: `<p>Hello ${userName},</p><p><strong>${escapeHtml(notifTitle)}</strong></p><p>${escapeHtml(notifMessage)}</p>`,
      text: `Hello ${userName},\n\n${notifTitle}\n\n${notifMessage}`,
      sms: notifMessage || 'You have a new notification from Forex Navigators.',
      pushTitle: notifTitle,
      pushBody: notifMessage || 'You have a new notification'
    };

    if (!templates[type]) {
      console.log(`[Notification] ⚠️ Template not found for type: ${type}, using default`);
      console.log(`[Notification] Available templates: ${Object.keys(templates).join(', ')}`);
      return defaultTemplate;
    }

    console.log(`[Notification] ✅ Using template for type: ${type}`);
    return templates[type];
  }

  /**
   * Generate welcome email template
   */
  getWelcomeEmailTemplate(user, data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Forex Navigators</title>
        <style>
          body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Forex Navigators!</h1>
            <p>Master the Art of Forex Trading</p>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName}!</h2>
            <p>Welcome to Forex Navigators, your premier destination for forex trading education. We're excited to have you join our community of successful traders!</p>
            
            <h3>What's Next?</h3>
            <ul>
              <li>📚 Explore our comprehensive course library</li>
              <li>📈 Join live trading sessions with expert instructors</li>
              <li>💡 Get real-time trading signals and market insights</li>
              <li>🎯 Track your learning progress and achievements</li>
            </ul>
            
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Access Your Dashboard</a>
            </p>
            
            <p>If you have any questions, our support team is here to help. Simply reply to this email or contact us through your dashboard.</p>
            
            <p>Happy Trading!<br>The Forex Navigators Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 Forex Navigators. All rights reserved.</p>
            <p>You received this email because you signed up for Forex Navigators.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate payment confirmation email template
   */
  getPaymentEmailTemplate(user, data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Confirmation</title>
        <style>
          body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .payment-details { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Payment Confirmed!</h1>
            <p>Your subscription is now active</p>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName}!</h2>
            <p>Thank you for your payment! Your Forex Navigators subscription is now active and you have full access to all premium features.</p>
            
            <div class="payment-details">
              <h3>Payment Details</h3>
              <p><strong>Amount:</strong> $${data.amount}</p>
              <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
              <p><strong>Payment Method:</strong> ${data.paymentMethod}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <h3>You Now Have Access To:</h3>
            <ul>
              <li>🎓 All premium trading courses</li>
              <li>📊 Live trading sessions and webinars</li>
              <li>📈 Real-time trading signals</li>
              <li>💬 Private community access</li>
              <li>📱 Mobile app access</li>
              <li>🏆 Certificates upon completion</li>
            </ul>
            
            <p>Start your forex trading journey today and join thousands of successful traders who learned with Forex Navigators!</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 Forex Navigators. All rights reserved.</p>
            <p>Keep this email as your payment receipt.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate course enrollment email template
   */
  getCourseEnrollmentTemplate(user, data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Course Enrollment Confirmed</title>
        <style>
          body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .course-info { background: #f0f7ff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3b82f6; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 Enrollment Confirmed!</h1>
            <p>You're ready to start learning</p>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName}!</h2>
            <p>Congratulations! You have successfully enrolled in a new course. Get ready to expand your forex trading knowledge!</p>
            
            <div class="course-info">
              <h3>Course Details</h3>
              <p><strong>Course:</strong> ${data.courseName}</p>
              <p><strong>Instructor:</strong> ${data.instructorName || 'Expert Trader'}</p>
              <p><strong>Duration:</strong> ${data.duration || 'Self-paced'}</p>
              <p><strong>Enrolled:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <h3>What's Included:</h3>
            <ul>
              <li>📹 High-quality video lessons</li>
              <li>📋 Interactive assignments and quizzes</li>
              <li>📊 Real trading examples and case studies</li>
              <li>🏆 Certificate of completion</li>
              <li>💬 Direct access to instructor Q&A</li>
            </ul>
            
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/course/${data.courseId}" class="button">Start Learning Now</a>
            </p>
            
            <p>Remember: Consistent learning is the key to trading success. We recommend dedicating at least 30 minutes daily to complete this course effectively.</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 Forex Navigators. All rights reserved.</p>
            <p>Happy learning and successful trading!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate password reset email template
   */
  getPasswordResetTemplate(user, data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Request</title>
        <style>
          body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .alert { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset</h1>
            <p>Secure your account</p>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName}!</h2>
            <p>We received a request to reset your password for your Forex Navigators account. If you didn't make this request, you can safely ignore this email.</p>
            
            <div class="alert">
              <strong>⚠️ Security Notice:</strong> This password reset link will expire in 1 hour for your security.
            </div>
            
            <p style="text-align: center;">
              <a href="${data.resetLink}" class="button">Reset Your Password</a>
            </p>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666; font-size: 14px;">${data.resetLink}</p>
            
            <h3>Security Tips:</h3>
            <ul>
              <li>Choose a strong password with at least 8 characters</li>
              <li>Include uppercase and lowercase letters, numbers, and symbols</li>
              <li>Don't reuse passwords from other accounts</li>
              <li>Consider enabling two-factor authentication</li>
            </ul>
            
            <p>If you continue to have problems, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 Forex Navigators. All rights reserved.</p>
            <p>This email was sent because a password reset was requested for your account.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate 2FA enabled email template
   */
  get2FATemplate(user, data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>2FA Enabled - Security Update</title>
        <style>
          body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #10b981 0%, #047857 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .security-box { background: #ecfdf5; border: 1px solid #10b981; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛡️ 2FA Enabled</h1>
            <p>Your account is now more secure</p>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName}!</h2>
            <p>Great news! Two-factor authentication (2FA) has been successfully enabled for your Forex Navigators account.</p>
            
            <div class="security-box">
              <h3>✅ Security Enhanced</h3>
              <p>Your account now requires a second verification step when logging in, making it much more secure against unauthorized access.</p>
            </div>
            
            <h3>What This Means:</h3>
            <ul>
              <li>🔒 Enhanced security for your trading account</li>
              <li>📱 Login requires your authenticator app code</li>
              <li>🛡️ Protection against unauthorized access</li>
              <li>💰 Better security for your financial information</li>
            </ul>
            
            <h3>Important Reminders:</h3>
            <ul>
              <li>Keep your authenticator app safe and backed up</li>
              <li>Store your backup codes in a secure location</li>
              <li>Never share your 2FA codes with anyone</li>
              <li>Contact support if you lose access to your device</li>
            </ul>
            
            <p>If you didn't enable 2FA or have concerns about this change, please contact our support team immediately.</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 Forex Navigators. All rights reserved.</p>
            <p>This is a security notification for your account.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate account locked email template
   */
  getAccountLockedTemplate(user, data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Security Alert</title>
        <style>
          body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .alert-box { background: #fef2f2; border: 1px solid #ef4444; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 Security Alert</h1>
            <p>Account temporarily locked</p>
          </div>
          <div class="content">
            <h2>Hello ${user.firstName}!</h2>
            <p>Your Forex Navigators account has been temporarily locked due to multiple failed login attempts.</p>
            
            <div class="alert-box">
              <h3>⚠️ Account Status</h3>
              <p><strong>Status:</strong> Temporarily Locked</p>
              <p><strong>Reason:</strong> Multiple failed login attempts</p>
              <p><strong>Auto-unlock:</strong> ${data.unlockTime || '30 minutes'}</p>
            </div>
            
            <h3>What Happened?</h3>
            <p>Our security system detected ${data.attemptCount || 'multiple'} failed login attempts on your account. As a security measure, we've temporarily locked your account to protect it from unauthorized access.</p>
            
            <h3>What You Can Do:</h3>
            <ul>
              <li>⏱️ Wait for the automatic unlock (${data.unlockTime || '30 minutes'})</li>
              <li>🔑 Make sure you're using the correct password</li>
              <li>🛡️ Consider enabling 2FA for better security</li>
              <li>💬 Contact support if you need immediate assistance</li>
            </ul>
            
            <h3>If This Wasn't You:</h3>
            <p>If you didn't attempt to log in, someone else may be trying to access your account. We recommend:</p>
            <ul>
              <li>Changing your password immediately after unlock</li>
              <li>Enabling two-factor authentication</li>
              <li>Reviewing your account activity</li>
              <li>Contacting our support team</li>
            </ul>
            
            <p>Your account security is our top priority. Thank you for your understanding.</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 Forex Navigators. All rights reserved.</p>
            <p>This is an automated security notification.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Strip HTML tags from text
   * @param {string} html - HTML string
   * @returns {string} - Plain text
   */
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Test email configuration
   * @returns {Promise<Object>} - Test result object
   */
  async testEmailConfiguration() {
    try {
      console.log('Testing email configuration...');
      
      const settings = await Settings.getSettings();
      const emailConfig = getEffectiveEmailConfig(settings.email);
      
      console.log('Email config (DB + .env fallback):', {
        host: emailConfig.smtpHost,
        port: emailConfig.smtpPort,
        user: emailConfig.smtpUser,
        hasPassword: !!emailConfig.smtpPassword,
        fromEmail: emailConfig.fromEmail,
        fromName: emailConfig.fromName
      });

      // Check if all required fields are present
      if (!emailConfig.smtpHost || !emailConfig.smtpPort || !emailConfig.smtpUser || !emailConfig.smtpPassword) {
        const missingFields = [];
        if (!emailConfig.smtpHost) missingFields.push('SMTP Host');
        if (!emailConfig.smtpPort) missingFields.push('SMTP Port');
        if (!emailConfig.smtpUser) missingFields.push('SMTP User');
        if (!emailConfig.smtpPassword) missingFields.push('SMTP Password');
        
        return { 
          success: false, 
          error: `Email configuration incomplete. Missing: ${missingFields.join(', ')}` 
        };
      }

      // Create a fresh transporter for testing (don't use cached one)
      console.log('Creating fresh transporter for testing...');
      const testTransporter = nodemailer.createTransport({
        host: emailConfig.smtpHost,
        port: emailConfig.smtpPort,
        secure: emailConfig.smtpPort === 465,
        auth: {
          user: emailConfig.smtpUser,
          pass: emailConfig.smtpPassword
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Test the connection
      console.log('Verifying email transporter connection...');
      await testTransporter.verify();
      
      console.log('Email configuration test successful');
      return { 
        success: true, 
        message: 'Email configuration is valid and connection verified' 
      };
    } catch (error) {
      console.error('Email configuration test failed:', error);
      return { 
        success: false, 
        error: `Connection test failed: ${error.message}` 
      };
    }
  }

  /**
   * Schedule a notification for future delivery
   * @param {string} userId - User ID
   * @param {string} type - Notification type
   * @param {Object} data - Notification data
   * @param {Date} scheduledFor - When to send the notification
   * @param {string} bulkNotificationId - Optional bulk notification ID for tracking
   * @returns {Promise<Object>} - Tracking record
   */
  async scheduleNotification(userId, type, data, scheduledFor, bulkNotificationId = null) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const settings = await Settings.getSettings();
      
      // Check if notification type is enabled in global settings
      const isTypeEnabled = this.isNotificationTypeEnabled(settings, type);
      if (!isTypeEnabled) {
        throw new Error(`Notification type ${type} is disabled globally`);
      }

      // Generate notification content
      const content = this.generateNotificationContent(type, data, user);

      // Create tracking record with scheduled status
      const trackingRecord = new NotificationTracking({
        userId,
        type: type || 'system',
        channel: 'email', // For now, we'll focus on email scheduling
        status: 'scheduled',
        title: content.subject,
        message: content.text || this.stripHtml(content.html),
        scheduledFor: new Date(scheduledFor),
        bulkNotificationId,
        metadata: {
          html: content.html,
          text: content.text,
          subject: content.subject
        }
      });

      await trackingRecord.save();
      return trackingRecord;
    } catch (error) {
      console.error('Failed to schedule notification:', error.message);
      throw error;
    }
  }

  /**
   * Process scheduled notifications (should be called by a cron job)
   * @returns {Promise<Object>} - Processing results
   */
  async processScheduledNotifications() {
    try {
      const now = new Date();
      const scheduledNotifications = await NotificationTracking.find({
        status: 'scheduled',
        scheduledFor: { $lte: now }
      }).populate('userId');

      const results = {
        processed: 0,
        successful: 0,
        failed: 0
      };

      for (const trackingRecord of scheduledNotifications) {
        try {
          results.processed++;
          
          // Update status to pending
          trackingRecord.status = 'pending';
          await trackingRecord.save();

          // Send the notification
          const user = trackingRecord.userId;
          if (!user) {
            await trackingRecord.markAsFailed('User not found');
            results.failed++;
            continue;
          }

          const success = await this.sendEmail({
            to: user.email,
            subject: trackingRecord.title,
            html: trackingRecord.metadata.html,
            text: trackingRecord.metadata.text,
            userId: user._id.toString(),
            type: trackingRecord.type,
            bulkNotificationId: trackingRecord.bulkNotificationId
          });

          if (success) {
            trackingRecord.status = 'sent';
            trackingRecord.sentAt = new Date();
            await trackingRecord.save();
            results.successful++;
          } else {
            await trackingRecord.markAsFailed('Email sending failed');
            results.failed++;
          }
        } catch (error) {
          console.error(`Failed to process scheduled notification ${trackingRecord._id}:`, error);
          await trackingRecord.markAsFailed(error.message);
          results.failed++;
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to process scheduled notifications:', error.message);
      throw error;
    }
  }

  /**
   * Get notification statistics for admin dashboard
   * @returns {Promise<Object>} - Notification statistics
   */
  async getNotificationStatistics() {
    try {
      const stats = await NotificationTracking.getNotificationStats();
      const statsByChannel = await NotificationTracking.getStatsByChannel();
      const recentActivity = await NotificationTracking.getRecentActivity(7);
      const failedNotifications = await NotificationTracking.getFailedNotifications(10);
      const scheduledNotifications = await NotificationTracking.getScheduledNotifications();

      // Format stats into a more usable format
      const formattedStats = {
        totalSent: 0,
        delivered: 0,
        scheduled: 0,
        failed: 0,
        pending: 0
      };

      stats.forEach(stat => {
        switch (stat._id) {
          case 'sent':
            formattedStats.totalSent = stat.count;
            break;
          case 'delivered':
            formattedStats.delivered = stat.count;
            break;
          case 'scheduled':
            formattedStats.scheduled = stat.count;
            break;
          case 'failed':
            formattedStats.failed = stat.count;
            break;
          case 'pending':
            formattedStats.pending = stat.count;
            break;
        }
      });

      return {
        summary: formattedStats,
        byChannel: statsByChannel,
        recentActivity: recentActivity,
        failedNotifications: failedNotifications,
        scheduledNotifications: scheduledNotifications
      };
    } catch (error) {
      console.error('Failed to get notification statistics:', error.message);
      return {
        summary: {
          totalSent: 0,
          delivered: 0,
          scheduled: 0,
          failed: 0,
          pending: 0
        },
        byChannel: [],
        recentActivity: [],
        failedNotifications: [],
        scheduledNotifications: []
      };
    }
  }

  /**
   * Create an in-app notification
   * @param {Object} notificationData - Notification data
   * @param {string} notificationData.user - User ID
   * @param {string} notificationData.type - Notification type
   * @param {string} notificationData.title - Notification title
   * @param {string} notificationData.message - Notification message
   * @param {string} notificationData.link - Optional link
   * @returns {Promise<Object>} - Created notification
   */
  async createNotification(notificationData) {
    try {
      const notification = await Notification.createNotification({
        userId: notificationData.user,
        type: notificationData.type || 'system',
        title: notificationData.title,
        message: notificationData.message,
        link: notificationData.link,
        read: false
      });

      const userId = notificationData.user?.toString?.() || String(notificationData.user);
      setImmediate(() => {
        this.sendPushNotification({
          userId,
          title: notificationData.title,
          body: notificationData.message,
          data: {
            type: notificationData.type || 'system',
            notificationId: notification._id.toString(),
            link: notificationData.link || null,
          },
        }).catch((err) => {
          console.error('[Push] In-app notification push failed:', err.message);
        });
      });

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * In-app notification + email/push when admin imposes a monthly fee.
   */
  async notifyMonthlyFeeImposed(userId, data) {
    const amount = Number(data.amount ?? 0);
    const currency = data.currency || 'USD';
    const feeForMonthLabel = data.feeForMonthLabel || 'Current billing cycle';
    const blockAccessUntilPaid = !!data.blockAccessUntilPaid;
    const monthlyFeeUrl =
      data.monthlyFeeUrl ||
      `${process.env.FRONTEND_URL || 'http://localhost:3000'}/monthly-fee`;

    const title = blockAccessUntilPaid
      ? 'Monthly fee required — access limited'
      : 'Monthly fee added by administrator';
    const message = blockAccessUntilPaid
      ? `Your administrator added a $${amount.toFixed(2)} ${currency} monthly fee for ${feeForMonthLabel}. Pay now to restore full access.`
      : `Your administrator added a $${amount.toFixed(2)} ${currency} monthly fee for ${feeForMonthLabel}. Open the Monthly fee page when you are ready to pay.`;

    try {
      await this.createNotification({
        user: userId,
        type: 'payment',
        title,
        message,
        link: monthlyFeeUrl
      });
    } catch (e) {
      console.error('notifyMonthlyFeeImposed: in-app notification failed', e);
    }

    return this.sendNotificationToUser(userId, 'monthly_fee_imposed', {
      amount,
      currency,
      paymentId: data.paymentId,
      feeForMonthLabel,
      packageName: data.packageName,
      blockAccessUntilPaid,
      blockAccessNote: blockAccessUntilPaid
        ? 'Your platform access is limited until this fee is paid and confirmed.'
        : 'You can continue using the platform; please complete this fee when you are ready.',
      notes: data.notes,
      monthlyFeeUrl,
      message
    });
  }

  /**
   * Invoice reminder (email + in-app) — uses existing pending payment or cycle due amount.
   */
  async notifyMonthlyFeeInvoice(userId, data) {
    const amount = Number(data.amount ?? 0);
    const currency = data.currency || 'USD';
    const feeForMonthLabel = data.feeForMonthLabel || 'Current billing cycle';
    const monthlyFeeUrl =
      data.monthlyFeeUrl ||
      `${process.env.FRONTEND_URL || 'http://localhost:3000'}/monthly-fee`;

    const title = 'Monthly fee invoice';
    const message = `Your monthly fee of $${amount.toFixed(2)} ${currency} for ${feeForMonthLabel} is due. Open the Monthly fee page to pay.`;

    let inAppOk = false;
    try {
      await this.createNotification({
        user: userId,
        type: 'payment',
        title,
        message,
        link: monthlyFeeUrl
      });
      inAppOk = true;
    } catch (e) {
      console.error('notifyMonthlyFeeInvoice: in-app notification failed', e);
    }

    let emailResult = { email: false, sms: false, push: false };
    try {
      emailResult = await this.sendNotificationToUser(userId, 'monthly_fee_invoice', {
        amount,
        currency,
        paymentId: data.paymentId,
        feeForMonthLabel,
        packageName: data.packageName,
        payByLabel: data.payByLabel,
        invoiceNote: data.invoiceNote,
        monthlyFeeUrl,
        message
      });
    } catch (e) {
      console.error('notifyMonthlyFeeInvoice: email/push failed', e?.message || e);
    }

    return {
      ...emailResult,
      inApp: inAppOk,
      // Invoice is considered delivered if in-app and/or email succeeded
      delivered: inAppOk || !!emailResult?.email
    };
  }

  /**
   * Notify students about a new published trading signal (in-app + Expo push).
   * Push is sent first so students get it instantly; in-app rows are written after.
   */
  async notifyNewTradingSignal(signal) {
    if (!signal || signal.isPublished === false) {
      return { notified: 0, pushed: 0 };
    }

    const typeLabel = String(signal.type || 'buy')
      .replace(/_/g, ' ')
      .toUpperCase();
    const symbol = signal.symbol || 'SIGNAL';
    const entry = Number(signal.entryPrice || 0);
    const target = Number(signal.targetPrice || 0);
    const stop = Number(signal.stopLoss || 0);
    const format = (n) =>
      Number.isFinite(n) ? (Math.abs(n) >= 100 ? n.toFixed(2) : n.toFixed(4)) : '0';

    const title = `New ${typeLabel} signal`;
    const remark = String(signal.description || '').trim().replace(/\s+/g, ' ');
    const remarkSnippet = remark ? (remark.length > 80 ? `${remark.slice(0, 77)}…` : remark) : '';
    const message = remarkSnippet
      ? `${symbol}: Entry ${format(entry)} · TP ${format(target)} · SL ${format(stop)} — ${remarkSnippet}`
      : `${symbol}: Entry ${format(entry)} · TP ${format(target)} · SL ${format(stop)}`;
    const signalId = signal._id?.toString?.() || String(signal._id || '');
    const pushData = {
      type: 'signal',
      signalId,
      link: '/(app)/signals',
    };

    // 1) Instant push — only users who have a device token
    const pushUsers = await User.find({
      role: 'student',
      isActive: { $ne: false },
      'preferences.pushNotifications': { $ne: false },
      'preferences.expoPushToken': { $type: 'string', $ne: '' },
    })
      .select('preferences.expoPushToken')
      .lean();

    const tokens = pushUsers
      .map((user) => user.preferences?.expoPushToken)
      .filter(Boolean);

    const { sendToTokens } = require('./expoPushService');
    let pushResult = { sent: 0, failed: 0 };
    try {
      pushResult = await sendToTokens(tokens, {
        title,
        body: message,
        data: pushData,
        channelId: 'signals',
      });
    } catch (error) {
      console.error('[SignalNotify] Push failed:', error.message);
    }

    // 2) In-app notifications for all active students (does not block push)
    let notified = 0;
    try {
      const students = await User.find({
        role: 'student',
        isActive: { $ne: false },
      })
        .select('_id')
        .lean();

      if (students.length > 0) {
        const Notification = require('../models/Notification');
        const docs = students.map((user) => ({
          userId: user._id,
          type: 'signal',
          title,
          message,
          link: '/(app)/signals',
          data: { signalId, type: 'signal' },
          read: false,
          priority: 'high',
        }));
        await Notification.insertMany(docs, { ordered: false });
        notified = docs.length;
      }
    } catch (error) {
      console.error('[SignalNotify] In-app insert failed:', error.message);
    }

    console.log(
      `[SignalNotify] ${symbol}: in-app=${notified}, push recipients=${tokens.length}, sent=${pushResult.sent}, failed=${pushResult.failed}`
    );

    return { notified, pushed: pushResult.sent };
  }
}

// Export singleton instance
module.exports = new NotificationService();

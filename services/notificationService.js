const nodemailer = require('nodemailer');
const Settings = require('../models/Settings');
const User = require('../models/User');

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
      const emailConfig = settings.email;

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
   * @returns {Promise<boolean>} - Success status
   */
  async sendEmail({ to, subject, html, text }) {
    try {
      // Always get fresh settings from database
      const settings = await Settings.getSettings();
      const emailConfig = settings.email;

      // Check if we have valid configuration
      if (!emailConfig.smtpHost || !emailConfig.smtpUser || !emailConfig.smtpPassword) {
        console.log('Email configuration incomplete, skipping email notification');
        return false;
      }

      // Create fresh transporter for each email (ensures latest settings)
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

      const mailOptions = {
        from: `"${emailConfig.fromName}" <${emailConfig.fromEmail}>`,
        to,
        subject,
        html,
        text: text || this.stripHtml(html)
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error.message);
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
      // TODO: Implement push notification service (FCM, OneSignal, etc.)
      console.log(`Push notification (not implemented): ${userId} - ${title}: ${body}`);
      return true;
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
   * @returns {Promise<Object>} - Results for each channel
   */
  async sendNotificationToUser(userId, type, data) {
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
      const content = this.generateNotificationContent(type, data, user);

      // Send email notification
      if (settings.notifications.emailNotifications && user.preferences?.emailNotifications !== false) {
        results.email = await this.sendEmail({
          to: user.email,
          subject: content.subject,
          html: content.html,
          text: content.text
        });
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
   * @returns {Promise<Array>} - Array of results
   */
  async sendBulkNotification(userIds, type, data) {
    const results = [];
    
    for (const userId of userIds) {
      try {
        const result = await this.sendNotificationToUser(userId, type, data);
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
      'course_enrollment': 'newUserRegistration',
      'system_alert': 'systemAlerts',
      'password_reset': 'systemAlerts',
      'login_security': 'systemAlerts',
      '2fa_enabled': 'systemAlerts',
      'account_locked': 'systemAlerts'
    };

    const settingKey = typeMap[type];
    return settingKey ? settings.notifications[settingKey] : true;
  }

  /**
   * Generate notification content based on type and data
   * @param {string} type - Notification type
   * @param {Object} data - Notification data
   * @param {Object} user - User object
   * @returns {Object} - Generated content
   */
  generateNotificationContent(type, data, user) {
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

    return templates[type] || {
      subject: 'Notification from Forex Navigators',
      html: `<p>Hello ${user.firstName},</p><p>You have a new notification.</p>`,
      text: `Hello ${user.firstName}, you have a new notification.`,
      sms: 'You have a new notification from Forex Navigators.',
      pushTitle: 'Notification',
      pushBody: 'You have a new notification'
    };
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
      
      // Always get fresh settings from database
      const settings = await Settings.getSettings();
      const emailConfig = settings.email;
      
      console.log('Email config from database:', {
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
}

// Export singleton instance
module.exports = new NotificationService();

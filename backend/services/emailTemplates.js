const fs = require('fs');
const path = require('path');

class EmailTemplateService {
  constructor() {
    this.templates = this.loadTemplates();
  }

  loadTemplates() {
    return {
      // Professional Business Templates
      welcome: {
        name: 'Welcome Email',
        category: 'onboarding',
        description: 'Professional welcome email for new users',
        channels: ['email'],
        variables: ['userName', 'companyName', 'loginUrl'],
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to {{companyName}}</title>
            <style>
              body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; }
              .header h1 { color: white; margin: 0; font-size: 32px; font-weight: 300; }
              .content { padding: 40px 30px; }
              .welcome-text { font-size: 18px; color: #333; line-height: 1.6; margin-bottom: 30px; }
              .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; transition: transform 0.3s ease; }
              .cta-button:hover { transform: translateY(-2px); }
              .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; }
              .social-links { margin-top: 20px; }
              .social-links a { display: inline-block; margin: 0 10px; color: #667eea; text-decoration: none; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Welcome to {{companyName}}</h1>
              </div>
              <div class="content">
                <div class="welcome-text">
                  <p>Hello <strong>{{userName}}</strong>,</p>
                  <p>Welcome aboard! We're thrilled to have you join our community of learners and traders.</p>
                  <p>Your account has been successfully created and you're now ready to access our premium trading courses, live sessions, and expert insights.</p>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="{{loginUrl}}" class="cta-button">🚀 Get Started Now</a>
                </div>
                <p style="color: #666; font-size: 14px;">If you have any questions, our support team is here to help!</p>
              </div>
              <div class="footer">
                <p>© 2024 {{companyName}}. All rights reserved.</p>
                <div class="social-links">
                  <a href="#">Twitter</a> | <a href="#">LinkedIn</a> | <a href="#">Support</a>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Welcome to {{companyName}}!\n\nHello {{userName}},\n\nWelcome aboard! We're thrilled to have you join our community.\n\nYour account has been successfully created and you're now ready to access our premium trading courses.\n\nGet started: {{loginUrl}}\n\nBest regards,\nThe {{companyName}} Team`
      },

      course_enrollment: {
        name: 'Course Enrollment Confirmation',
        category: 'courses',
        description: 'Professional course enrollment confirmation',
        channels: ['email'],
        variables: ['userName', 'courseName', 'courseUrl', 'startDate', 'instructorName'],
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Course Enrollment Confirmation</title>
            <style>
              body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f7fa; }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 40px 30px; text-align: center; }
              .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
              .content { padding: 40px 30px; }
              .course-card { background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #4facfe; }
              .course-title { font-size: 20px; font-weight: 600; color: #333; margin-bottom: 10px; }
              .course-details { color: #666; line-height: 1.6; }
              .cta-button { display: inline-block; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: all 0.3s ease; }
              .cta-button:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(79, 172, 254, 0.3); }
              .footer { background: #2d3748; color: white; padding: 30px; text-align: center; font-size: 14px; }
              .highlight { background: linear-gradient(120deg, #a8edea 0%, #fed6e3 100%); padding: 2px 6px; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📚 Course Enrollment Confirmed</h1>
              </div>
              <div class="content">
                <p>Hello <strong>{{userName}}</strong>,</p>
                <p>Congratulations! You've successfully enrolled in our premium course. We're excited to have you on this learning journey.</p>
                
                <div class="course-card">
                  <div class="course-title">🎯 {{courseName}}</div>
                  <div class="course-details">
                    <p><strong>Instructor:</strong> {{instructorName}}</p>
                    <p><strong>Start Date:</strong> <span class="highlight">{{startDate}}</span></p>
                    <p><strong>Access:</strong> Available immediately</p>
                  </div>
                </div>
                
                <p>Your course materials are now available in your dashboard. You can start learning at your own pace.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="{{courseUrl}}" class="cta-button">📖 Access Course</a>
                </div>
                
                <p style="color: #666; font-size: 14px;">Happy learning! 🚀</p>
              </div>
              <div class="footer">
                <p>© 2024 Forex Navigators. All rights reserved.</p>
                <p>Questions? Contact our support team</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Course Enrollment Confirmed!\n\nHello {{userName}},\n\nCongratulations! You've successfully enrolled in {{courseName}}.\n\nInstructor: {{instructorName}}\nStart Date: {{startDate}}\n\nAccess your course: {{courseUrl}}\n\nHappy learning!\nThe Forex Navigators Team`
      },

      payment_success: {
        name: 'Payment Success',
        category: 'payments',
        description: 'Professional payment confirmation email',
        channels: ['email'],
        variables: ['userName', 'amount', 'currency', 'transactionId', 'date', 'description'],
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Payment Successful</title>
            <style>
              body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f0f4f8; }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%); padding: 40px 30px; text-align: center; }
              .header h1 { color: white; margin: 0; font-size: 30px; font-weight: 600; }
              .success-icon { font-size: 48px; margin-bottom: 10px; }
              .content { padding: 40px 30px; }
              .payment-details { background: #f8f9fa; border-radius: 16px; padding: 30px; margin: 25px 0; border: 2px solid #e9ecef; }
              .amount { font-size: 32px; font-weight: 700; color: #28a745; text-align: center; margin-bottom: 20px; }
              .detail-row { display: flex; justify-content: space-between; margin: 15px 0; padding: 10px 0; border-bottom: 1px solid #e9ecef; }
              .detail-label { color: #6c757d; font-weight: 500; }
              .detail-value { color: #333; font-weight: 600; }
              .footer { background: #2c3e50; color: white; padding: 30px; text-align: center; font-size: 14px; }
              .checkmark { color: #28a745; font-size: 24px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="success-icon">✅</div>
                <h1>Payment Successful!</h1>
              </div>
              <div class="content">
                <p>Hello <strong>{{userName}}</strong>,</p>
                <p>Thank you for your payment! Your transaction has been completed successfully.</p>
                
                <div class="payment-details">
                  <div class="amount">{{currency}} {{amount}}</div>
                  <div class="detail-row">
                    <span class="detail-label">Transaction ID:</span>
                    <span class="detail-value">{{transactionId}}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Date:</span>
                    <span class="detail-value">{{date}}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Description:</span>
                    <span class="detail-value">{{description}}</span>
                  </div>
                </div>
                
                <p style="text-align: center; color: #28a745; font-weight: 600;">
                  <span class="checkmark">✓</span> Your account has been updated
                </p>
                
                <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
                  A receipt has been sent to your email address.
                </p>
              </div>
              <div class="footer">
                <p>© 2024 Forex Navigators. All rights reserved.</p>
                <p>Questions about this payment? Contact support</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Payment Successful!\n\nHello {{userName}},\n\nThank you for your payment! Your transaction has been completed successfully.\n\nAmount: {{currency}} {{amount}}\nTransaction ID: {{transactionId}}\nDate: {{date}}\nDescription: {{description}}\n\nYour account has been updated.\n\nBest regards,\nThe Forex Navigators Team`
      },

      maintenance_notice: {
        name: 'Maintenance Notice',
        category: 'system',
        description: 'Professional maintenance notification',
        channels: ['email'],
        variables: ['userName', 'maintenanceDate', 'duration', 'affectedServices', 'status'],
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Maintenance Notice</title>
            <style>
              body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8f9fa; }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); padding: 40px 30px; text-align: center; }
              .header h1 { color: #d63384; margin: 0; font-size: 28px; font-weight: 600; }
              .maintenance-icon { font-size: 48px; margin-bottom: 10px; }
              .content { padding: 40px 30px; }
              .notice-box { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 12px; padding: 25px; margin: 25px 0; }
              .notice-title { color: #856404; font-weight: 600; font-size: 18px; margin-bottom: 15px; }
              .schedule { background: #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; }
              .schedule-title { font-weight: 600; color: #495057; margin-bottom: 15px; }
              .time-slot { background: white; border-radius: 6px; padding: 15px; margin: 10px 0; border-left: 4px solid #ff9a9e; }
              .status-badge { display: inline-block; background: #dc3545; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
              .footer { background: #343a40; color: white; padding: 30px; text-align: center; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="maintenance-icon">🔧</div>
                <h1>Scheduled Maintenance Notice</h1>
              </div>
              <div class="content">
                <p>Hello <strong>{{userName}}</strong>,</p>
                <p>We want to inform you about scheduled maintenance to improve our platform's performance and reliability.</p>
                
                <div class="notice-box">
                  <div class="notice-title">⚠️ Important Information</div>
                  <p style="color: #856404; margin: 0;">During this maintenance window, some services may be temporarily unavailable.</p>
                </div>
                
                <div class="schedule">
                  <div class="schedule-title">📅 Maintenance Schedule</div>
                  <div class="time-slot">
                    <strong>Date:</strong> {{maintenanceDate}}<br>
                    <strong>Duration:</strong> {{duration}}<br>
                    <strong>Status:</strong> <span class="status-badge">{{status}}</span>
                  </div>
                </div>
                
                <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <strong>Affected Services:</strong><br>
                  {{affectedServices}}
                </div>
                
                <p style="color: #666; font-size: 14px; text-align: center;">
                  We apologize for any inconvenience and appreciate your patience.
                </p>
              </div>
              <div class="footer">
                <p>© 2024 Forex Navigators. All rights reserved.</p>
                <p>For urgent issues, contact our support team</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Scheduled Maintenance Notice\n\nHello {{userName}},\n\nWe want to inform you about scheduled maintenance to improve our platform.\n\nDate: {{maintenanceDate}}\nDuration: {{duration}}\nStatus: {{status}}\n\nAffected Services:\n{{affectedServices}}\n\nWe apologize for any inconvenience.\n\nBest regards,\nThe Forex Navigators Team`
      },

      trading_signal: {
        name: 'Trading Signal Alert',
        category: 'trading',
        description: 'Professional trading signal notification',
        channels: ['email'],
        variables: ['userName', 'symbol', 'action', 'entryPrice', 'stopLoss', 'takeProfit', 'riskLevel', 'analysis'],
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Trading Signal Alert</title>
            <style>
              body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
              .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 40px 30px; text-align: center; }
              .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
              .signal-icon { font-size: 48px; margin-bottom: 10px; }
              .content { padding: 40px 30px; }
              .signal-card { background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border-radius: 16px; padding: 30px; margin: 25px 0; border: 2px solid #cbd5e1; }
              .symbol { font-size: 32px; font-weight: 700; color: #1e293b; text-align: center; margin-bottom: 20px; }
              .action-buy { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; }
              .action-sell { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; }
              .price-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin: 20px 0; }
              .price-box { background: white; border-radius: 8px; padding: 15px; text-align: center; border: 1px solid #e2e8f0; }
              .price-label { color: #64748b; font-size: 12px; font-weight: 500; margin-bottom: 5px; }
              .price-value { color: #1e293b; font-weight: 600; font-size: 16px; }
              .risk-indicator { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0; }
              .risk-title { color: #92400e; font-weight: 600; margin-bottom: 10px; }
              .analysis { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6; }
              .footer { background: #1e293b; color: white; padding: 30px; text-align: center; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="signal-icon">📊</div>
                <h1>Trading Signal Alert</h1>
              </div>
              <div class="content">
                <p>Hello <strong>{{userName}}</strong>,</p>
                <p>A new trading opportunity has been identified by our expert analysts.</p>
                
                <div class="signal-card">
                  <div class="symbol">{{symbol}}</div>
                  <div style="text-align: center; margin-bottom: 20px;">
                    <span class="action-{{action.toLowerCase()}}">{{action.toUpperCase()}}</span>
                  </div>
                  
                  <div class="price-grid">
                    <div class="price-box">
                      <div class="price-label">Entry Price</div>
                      <div class="price-value">{{entryPrice}}</div>
                    </div>
                    <div class="price-box">
                      <div class="price-label">Stop Loss</div>
                      <div class="price-value">{{stopLoss}}</div>
                    </div>
                    <div class="price-box">
                      <div class="price-label">Take Profit</div>
                      <div class="price-value">{{takeProfit}}</div>
                    </div>
                  </div>
                </div>
                
                <div class="risk-indicator">
                  <div class="risk-title">⚠️ Risk Level: {{riskLevel}}</div>
                  <p style="color: #92400e; margin: 0; font-size: 14px;">Please ensure this aligns with your risk tolerance and trading strategy.</p>
                </div>
                
                <div class="analysis">
                  <strong>📈 Analysis:</strong><br>
                  {{analysis}}
                </div>
                
                <p style="color: #666; font-size: 14px; text-align: center;">
                  <strong>Disclaimer:</strong> This is not financial advice. Always do your own research.
                </p>
              </div>
              <div class="footer">
                <p>© 2024 Forex Navigators. All rights reserved.</p>
                <p>Professional trading signals and analysis</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Trading Signal Alert\n\nHello {{userName}},\n\nA new trading opportunity has been identified:\n\nSymbol: {{symbol}}\nAction: {{action}}\nEntry Price: {{entryPrice}}\nStop Loss: {{stopLoss}}\nTake Profit: {{takeProfit}}\nRisk Level: {{riskLevel}}\n\nAnalysis:\n{{analysis}}\n\nDisclaimer: This is not financial advice.\n\nBest regards,\nThe Forex Navigators Team`
      },

      password_reset: {
        name: 'Password Reset',
        category: 'security',
        description: 'Professional password reset email',
        channels: ['email'],
        variables: ['userName', 'resetUrl', 'expiryTime', 'companyName'],
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset Request</title>
            <style>
              body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8f9fa; }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); padding: 40px 30px; text-align: center; }
              .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
              .security-icon { font-size: 48px; margin-bottom: 10px; }
              .content { padding: 40px 30px; }
              .reset-button { display: inline-block; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: all 0.3s ease; }
              .reset-button:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(255, 107, 107, 0.3); }
              .warning-box { background: #fff5f5; border: 1px solid #fed7d7; border-radius: 12px; padding: 20px; margin: 20px 0; }
              .warning-title { color: #c53030; font-weight: 600; margin-bottom: 10px; }
              .expiry-notice { background: #fef5e7; border: 1px solid #f6ad55; border-radius: 8px; padding: 15px; margin: 20px 0; }
              .footer { background: #2d3748; color: white; padding: 30px; text-align: center; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="security-icon">🔐</div>
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hello <strong>{{userName}}</strong>,</p>
                <p>We received a request to reset your password for your {{companyName}} account.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="{{resetUrl}}" class="reset-button">🔄 Reset Password</a>
                </div>
                
                <div class="warning-box">
                  <div class="warning-title">⚠️ Security Notice</div>
                  <p style="color: #c53030; margin: 0; font-size: 14px;">If you didn't request this password reset, please ignore this email and contact our support team immediately.</p>
                </div>
                
                <div class="expiry-notice">
                  <strong>⏰ Important:</strong> This reset link will expire in {{expiryTime}}.
                </div>
                
                <p style="color: #666; font-size: 14px;">
                  For security reasons, this link can only be used once. If you need to reset your password again, please request a new reset link.
                </p>
              </div>
              <div class="footer">
                <p>© 2024 {{companyName}}. All rights reserved.</p>
                <p>Security is our top priority</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Password Reset Request\n\nHello {{userName}},\n\nWe received a request to reset your password for your {{companyName}} account.\n\nReset your password: {{resetUrl}}\n\nThis link will expire in {{expiryTime}}.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nThe {{companyName}} Team`
      }
    };
  }

  getTemplate(templateName) {
    return this.templates[templateName] || null;
  }

  getAllTemplates() {
    return Object.values(this.templates);
  }

  getTemplatesByCategory(category) {
    return Object.values(this.templates).filter(template => template.category === category);
  }

  renderTemplate(templateName, variables) {
    const template = this.getTemplate(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    let html = template.html;
    let text = template.text;

    // Replace variables in both HTML and text versions
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, variables[key] || '');
      text = text.replace(regex, variables[key] || '');
    });

    return {
      html,
      text,
      subject: template.name,
      ...template
    };
  }

  // Custom template functionality
  createCustomTemplate(templateData) {
    const templateId = `custom_${Date.now()}`;
    this.templates[templateId] = {
      name: templateData.name || 'Custom Template',
      category: 'custom',
      description: templateData.description || 'Custom email template',
      channels: ['email'],
      variables: templateData.variables || [],
      html: templateData.html || '',
      text: templateData.text || ''
    };
    return templateId;
  }

  updateCustomTemplate(templateId, templateData) {
    if (this.templates[templateId] && this.templates[templateId].category === 'custom') {
      this.templates[templateId] = {
        ...this.templates[templateId],
        ...templateData
      };
      return true;
    }
    return false;
  }

  deleteCustomTemplate(templateId) {
    if (this.templates[templateId] && this.templates[templateId].category === 'custom') {
      delete this.templates[templateId];
      return true;
    }
    return false;
  }

  getCustomTemplates() {
    return Object.entries(this.templates)
      .filter(([id, template]) => template.category === 'custom')
      .map(([id, template]) => ({ id, ...template }));
  }
}

module.exports = new EmailTemplateService();

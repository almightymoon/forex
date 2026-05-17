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
                <p>© 2026 Forex Navigators. All rights reserved.</p>
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
                <p>© 2026 Forex Navigators. All rights reserved.</p>
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
                <p>© 2026 Forex Navigators. All rights reserved.</p>
                <p>For urgent issues, contact our support team</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Scheduled Maintenance Notice\n\nHello {{userName}},\n\nWe want to inform you about scheduled maintenance to improve our platform.\n\nDate: {{maintenanceDate}}\nDuration: {{duration}}\nStatus: {{status}}\n\nAffected Services:\n{{affectedServices}}\n\nWe apologize for any inconvenience.\n\nBest regards,\nThe Forex Navigators Team`
      },

      rank_reward_unlocked: {
        name: 'Rank Reward Unlocked',
        subject: 'Rank reward unlocked — congratulations!',
        category: 'rewards',
        description: 'Email sent when a user unlocks a rank reward tier',
        channels: ['email'],
        variables: ['userName', 'ruleName', 'thresholdBalance', 'directBusinessVolumeUsdAtUnlock', 'dashboardUrl', 'companyName'],
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Rank Reward Unlocked</title>
            <style>
              body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f3f4f6; }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 18px; overflow: hidden; box-shadow: 0 18px 40px rgba(0,0,0,0.10); }
              .header { background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); padding: 38px 28px; text-align: center; color: white; }
              .header h1 { margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.02em; }
              .content { padding: 28px; color: #111827; }
              .badge { display: inline-block; background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.25); color: white; padding: 8px 14px; border-radius: 999px; font-weight: 700; margin-top: 10px; }
              .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 14px; padding: 18px; margin: 18px 0; }
              .row { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
              .row:last-child { border-bottom: none; }
              .label { color: #6b7280; font-weight: 700; }
              .value { color: #111827; font-weight: 800; text-align: right; }
              .cta { display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: white; padding: 14px 22px; border-radius: 999px; text-decoration: none; font-weight: 800; margin-top: 14px; }
              .note { margin-top: 14px; padding: 14px 16px; border-left: 4px solid #2563eb; background: #eff6ff; border-radius: 10px; color: #1e3a8a; }
              .footer { background: #111827; color: #9ca3af; padding: 18px 22px; text-align: center; font-size: 13px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🏆 Rank reward unlocked</h1>
                <div class="badge">{{ruleName}}</div>
              </div>
              <div class="content">
                <p>Hello <strong>{{userName}}</strong>,</p>
                <p>Congratulations — you’ve just unlocked a new rank reward tier!</p>

                <div class="card">
                  <div class="row"><span class="label">Tier</span><span class="value">{{ruleName}}</span></div>
                  <div class="row"><span class="label">Threshold</span><span class="value">$ {{thresholdBalance}}</span></div>
                  <div class="row"><span class="label">Your direct volume</span><span class="value">$ {{directBusinessVolumeUsdAtUnlock}}</span></div>
                </div>

                <div class="note">
                  Our team will process and deliver your reward soon. You can track status anytime from your dashboard.
                </div>

                <div style="text-align:center;">
                  <a href="{{dashboardUrl}}" class="cta">View rank rewards</a>
                </div>
              </div>
              <div class="footer">© 2026 {{companyName}}. All rights reserved.</div>
            </div>
          </body>
          </html>
        `,
        text: `Rank reward unlocked — congratulations!\n\nHello {{userName}},\n\nYou’ve unlocked a new rank reward tier: {{ruleName}}\n\nThreshold: $ {{thresholdBalance}}\nYour direct volume: $ {{directBusinessVolumeUsdAtUnlock}}\n\nOur team will process and deliver your reward soon. Track status here:\n{{dashboardUrl}}\n\nBest regards,\nThe {{companyName}} Team`
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
                <p>© 2026 Forex Navigators. All rights reserved.</p>
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
      },

      account_verified: {
        name: 'Account Verified',
        subject: 'Account Verified - Welcome to Forex Navigators!',
        category: 'onboarding',
        description: 'Email sent when user account is verified',
        channels: ['email'],
        variables: ['userName', 'packageName', 'loginUrl', 'companyName'],
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Account Verified - Welcome!</title>
            <style>
              body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; }
              .header h1 { color: white; margin: 0; font-size: 32px; font-weight: 300; }
              .success-icon { font-size: 64px; margin-bottom: 10px; }
              .content { padding: 40px 30px; }
              .welcome-text { font-size: 18px; color: #333; line-height: 1.6; margin-bottom: 30px; }
              .package-card { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #10b981; }
              .package-name { font-size: 22px; font-weight: 600; color: #059669; margin-bottom: 10px; }
              .cta-button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; transition: transform 0.3s ease; }
              .cta-button:hover { transform: translateY(-2px); }
              .features-list { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0; }
              .feature-item { padding: 10px 0; border-bottom: 1px solid #e9ecef; }
              .feature-item:last-child { border-bottom: none; }
              .footer { background: #2d3748; color: white; padding: 30px; text-align: center; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="success-icon">✅</div>
                <h1>Account Verified!</h1>
              </div>
              <div class="content">
                <div class="welcome-text">
                  <p>Hello <strong>{{userName}}</strong>,</p>
                  <p>🎉 Great news! Your account has been verified and activated successfully!</p>
                  <p>Your payment has been confirmed by our admin team, and you now have full access to all premium features.</p>
                </div>
                
                <div class="package-card">
                  <div class="package-name">📦 {{packageName}}</div>
                  <p style="color: #666; margin: 0;">Your subscription is now active and you can access all course materials, live sessions, and trading signals.</p>
                </div>
                
                <div class="features-list">
                  <div class="feature-item">
                    <strong>✅</strong> Full access to premium courses
                  </div>
                  <div class="feature-item">
                    <strong>✅</strong> Live trading sessions
                  </div>
                  <div class="feature-item">
                    <strong>✅</strong> Expert trading signals
                  </div>
                  <div class="feature-item">
                    <strong>✅</strong> Community support
                  </div>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="{{loginUrl}}" class="cta-button">🚀 Access Dashboard</a>
                </div>
                
                <p style="color: #666; font-size: 14px; text-align: center;">
                  If you have any questions, our support team is here to help!
                </p>
              </div>
              <div class="footer">
                <p>© 2026 {{companyName}}. All rights reserved.</p>
                <p>Welcome to the Forex Navigators community!</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Account Verified - Welcome!\n\nHello {{userName}},\n\n🎉 Great news! Your account has been verified and activated successfully!\n\nYour payment has been confirmed by our admin team, and you now have full access to all premium features.\n\nPackage: {{packageName}}\n\nYou now have access to:\n✅ Full access to premium courses\n✅ Live trading sessions\n✅ Expert trading signals\n✅ Community support\n\nAccess your dashboard: {{loginUrl}}\n\nIf you have any questions, our support team is here to help!\n\nBest regards,\nThe {{companyName}} Team`
      },

      payment_confirmed: {
        name: 'Payment Confirmed',
        subject: 'Payment Confirmed - Your Account is Activated!',
        category: 'payments',
        description: 'Email sent when payment is confirmed by admin',
        channels: ['email'],
        variables: ['userName', 'amount', 'currency', 'packageName', 'transactionId', 'date', 'loginUrl', 'companyName'],
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Payment Confirmed</title>
            <style>
              body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f0f4f8; }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; }
              .header h1 { color: white; margin: 0; font-size: 30px; font-weight: 600; }
              .success-icon { font-size: 48px; margin-bottom: 10px; }
              .content { padding: 40px 30px; }
              .payment-details { background: #f8f9fa; border-radius: 16px; padding: 30px; margin: 25px 0; border: 2px solid #e9ecef; }
              .amount { font-size: 32px; font-weight: 700; color: #10b981; text-align: center; margin-bottom: 20px; }
              .detail-row { display: flex; justify-content: space-between; margin: 15px 0; padding: 10px 0; border-bottom: 1px solid #e9ecef; }
              .detail-label { color: #6c757d; font-weight: 500; }
              .detail-value { color: #333; font-weight: 600; }
              .cta-button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: all 0.3s ease; }
              .cta-button:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3); }
              .footer { background: #2c3e50; color: white; padding: 30px; text-align: center; font-size: 14px; }
              .checkmark { color: #10b981; font-size: 24px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="success-icon">✅</div>
                <h1>Payment Confirmed!</h1>
              </div>
              <div class="content">
                <p>Hello <strong>{{userName}}</strong>,</p>
                <p>Your payment has been confirmed by our admin team. Your account is now activated and you have full access to all premium features!</p>
                
                <div class="payment-details">
                  <div class="amount">{{currency}} {{amount}}</div>
                  <div class="detail-row">
                    <span class="detail-label">Package:</span>
                    <span class="detail-value">{{packageName}}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Transaction ID:</span>
                    <span class="detail-value">{{transactionId}}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Date:</span>
                    <span class="detail-value">{{date}}</span>
                  </div>
                </div>
                
                <p style="text-align: center; color: #10b981; font-weight: 600;">
                  <span class="checkmark">✓</span> Your account has been activated
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="{{loginUrl}}" class="cta-button">🚀 Access Dashboard</a>
                </div>
                
                <p style="color: #666; font-size: 14px; text-align: center;">
                  You can now access all courses, live sessions, and trading signals.
                </p>
              </div>
              <div class="footer">
                <p>© 2026 {{companyName}}. All rights reserved.</p>
                <p>Questions about this payment? Contact support</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Payment Confirmed!\n\nHello {{userName}},\n\nYour payment has been confirmed by our admin team. Your account is now activated!\n\nAmount: {{currency}} {{amount}}\nPackage: {{packageName}}\nTransaction ID: {{transactionId}}\nDate: {{date}}\n\nYour account has been activated and you have full access to all premium features.\n\nAccess your dashboard: {{loginUrl}}\n\nBest regards,\nThe {{companyName}} Team`
      },

      payment_pending: {
        name: 'Payment Pending',
        subject: 'Payment Received - Awaiting Admin Approval',
        category: 'payments',
        description: 'Email sent when payment is created and pending admin approval',
        channels: ['email'],
        variables: ['userName', 'amount', 'currency', 'packageName', 'paymentId', 'loginUrl', 'companyName'],
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Payment Received - Awaiting Approval</title>
            <style>
              body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; }
              .header h1 { color: white; margin: 0; font-size: 32px; font-weight: 300; }
              .icon { font-size: 64px; margin-bottom: 10px; }
              .content { padding: 40px 30px; }
              .welcome-text { font-size: 18px; color: #333; line-height: 1.6; margin-bottom: 30px; }
              .payment-card { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 16px; padding: 30px; margin: 25px 0; border-left: 4px solid #667eea; }
              .payment-amount { font-size: 36px; font-weight: 700; color: #667eea; text-align: center; margin-bottom: 15px; }
              .payment-details { background: white; border-radius: 8px; padding: 20px; margin: 15px 0; }
              .detail-row { display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
              .detail-row:last-child { border-bottom: none; }
              .detail-label { color: #6c757d; font-weight: 500; }
              .detail-value { color: #333; font-weight: 600; }
              .status-badge { display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; margin: 10px 0; }
              .info-box { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 20px; margin: 25px 0; }
              .info-title { color: #c2410c; font-weight: 600; margin-bottom: 10px; font-size: 16px; }
              .info-text { color: #9a3412; line-height: 1.6; font-size: 14px; }
              .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; transition: transform 0.3s ease; margin: 20px 0; }
              .cta-button:hover { transform: translateY(-2px); }
              .features-list { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0; }
              .feature-item { padding: 10px 0; border-bottom: 1px solid #e9ecef; color: #495057; }
              .feature-item:last-child { border-bottom: none; }
              .footer { background: #2d3748; color: white; padding: 30px; text-align: center; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="icon">📧</div>
                <h1>Payment Received!</h1>
              </div>
              <div class="content">
                <div class="welcome-text">
                  <p>Hello <strong>{{userName}}</strong>,</p>
                  <p>Thank you for your payment! We have successfully received your payment request and it is currently being reviewed by our admin team.</p>
                </div>
                
                <div class="payment-card">
                  <div class="payment-amount">{{currency}} {{amount}}</div>
                  <div style="text-align: center;">
                    <span class="status-badge">⏳ Awaiting Admin Approval</span>
                  </div>
                  
                  <div class="payment-details">
                    <div class="detail-row">
                      <span class="detail-label">Package:</span>
                      <span class="detail-value">{{packageName}}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Payment ID:</span>
                      <span class="detail-value">#{{paymentId}}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Status:</span>
                      <span class="detail-value">Pending Review</span>
                    </div>
                  </div>
                </div>
                
                <div class="info-box">
                  <div class="info-title">📋 What Happens Next?</div>
                  <div class="info-text">
                    <p style="margin: 8px 0;">1. Our admin team will review your payment</p>
                    <p style="margin: 8px 0;">2. Once verified, your account will be activated</p>
                    <p style="margin: 8px 0;">3. You'll receive a confirmation email with full access details</p>
                    <p style="margin: 8px 0;">4. Access to Forex LMS will be opened for you</p>
                  </div>
                </div>
                
                <div class="features-list">
                  <div class="feature-item">
                    <strong>✅</strong> Premium trading courses and materials
                  </div>
                  <div class="feature-item">
                    <strong>✅</strong> Live trading sessions with expert instructors
                  </div>
                  <div class="feature-item">
                    <strong>✅</strong> Real-time trading signals and market insights
                  </div>
                  <div class="feature-item">
                    <strong>✅</strong> Community support and networking
                  </div>
                  <div class="feature-item">
                    <strong>✅</strong> Certificates upon course completion
                  </div>
                </div>
                
                <p style="text-align: center; color: #666; font-size: 14px; margin: 30px 0 20px;">
                  Once your payment is confirmed, you can access your account here:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="{{loginUrl}}" class="cta-button">🚀 Login to Forex LMS</a>
                </div>
                
                <p style="color: #666; font-size: 14px; text-align: center;">
                  We'll notify you via email as soon as your account is activated. This usually takes 24-48 hours.
                </p>
              </div>
              <div class="footer">
                <p>© 2026 {{companyName}}. All rights reserved.</p>
                <p>Questions? Contact our support team</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Payment Received - Awaiting Admin Approval\n\nHello {{userName}},\n\nThank you for your payment! We have successfully received your payment request and it is currently being reviewed by our admin team.\n\nPayment Details:\nAmount: {{currency}} {{amount}}\nPackage: {{packageName}}\nPayment ID: #{{paymentId}}\nStatus: Pending Review\n\nWhat Happens Next?\n1. Our admin team will review your payment\n2. Once verified, your account will be activated\n3. You'll receive a confirmation email with full access details\n4. Access to Forex LMS will be opened for you\n\nOnce your payment is confirmed, you can access your account here:\n{{loginUrl}}\n\nWe'll notify you via email as soon as your account is activated. This usually takes 24-48 hours.\n\nBest regards,\nThe {{companyName}} Team`
      },

      monthly_fee_imposed: {
        name: 'Monthly Fee Imposed (Admin)',
        subject: 'Monthly fee required — action needed',
        category: 'payments',
        description: 'Sent when an administrator imposes a monthly fee on a student',
        channels: ['email'],
        variables: [
          'userName',
          'amount',
          'currency',
          'feeMonthLabel',
          'packageName',
          'paymentId',
          'monthlyFeeUrl',
          'blockAccessNote',
          'adminNotes',
          'companyName'
        ],
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Monthly Fee Required</title>
            <style>
              body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f3f4f6; }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 32px rgba(0,0,0,0.08); }
              .header { background: linear-gradient(135deg, #d97706 0%, #b45309 100%); padding: 36px 28px; text-align: center; color: white; }
              .header h1 { margin: 0; font-size: 26px; font-weight: 700; }
              .content { padding: 28px; color: #111827; line-height: 1.6; }
              .card { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 12px; padding: 18px; margin: 18px 0; }
              .amount { font-size: 32px; font-weight: 800; color: #b45309; text-align: center; margin: 8px 0 12px; }
              .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #fde68a; }
              .row:last-child { border-bottom: none; }
              .label { color: #92400e; font-weight: 600; }
              .value { color: #78350f; font-weight: 700; text-align: right; }
              .alert { background: #fef2f2; border-left: 4px solid #dc2626; padding: 14px 16px; border-radius: 8px; color: #991b1b; margin: 16px 0; font-size: 14px; }
              .note { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; margin-top: 14px; font-size: 14px; color: #374151; }
              .cta { display: inline-block; background: linear-gradient(135deg, #d97706 0%, #b45309 100%); color: white; padding: 14px 28px; border-radius: 999px; text-decoration: none; font-weight: 700; margin-top: 8px; }
              .footer { background: #111827; color: #9ca3af; padding: 18px 22px; text-align: center; font-size: 13px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Monthly fee required</h1>
              </div>
              <div class="content">
                <p>Hello <strong>{{userName}}</strong>,</p>
                <p>Your administrator has added a monthly fee to your account. Please complete payment using the Monthly fee page (wallet transfer + proof).</p>
                <div class="card">
                  <div class="amount">{{currency}} {{amount}}</div>
                  <div class="row"><span class="label">Fee period</span><span class="value">{{feeMonthLabel}}</span></div>
                  <div class="row"><span class="label">Package</span><span class="value">{{packageName}}</span></div>
                  <div class="row"><span class="label">Reference</span><span class="value">#{{paymentId}}</span></div>
                </div>
                <p><strong>{{blockAccessNote}}</strong></p>
                <div style="text-align:center; margin: 24px 0;">
                  <a href="{{monthlyFeeUrl}}" class="cta">Open Monthly fee page</a>
                </div>
                <p class="note" style="display: {{adminNotesDisplay}};"><strong>Admin note:</strong> {{adminNotes}}</p>
              </div>
              <div class="footer">© 2026 {{companyName}}. All rights reserved.</div>
            </div>
          </body>
          </html>
        `,
        text: `Monthly Fee Required\n\nHello {{userName}},\n\nYour administrator has added a monthly fee to your account.\n\nAmount: {{currency}} {{amount}}\nFee period: {{feeMonthLabel}}\nPackage: {{packageName}}\nReference: #{{paymentId}}\n\n{{blockAccessNote}}\n\nPay here: {{monthlyFeeUrl}}\n\n{{adminNotesLine}}\n\nBest regards,\nThe {{companyName}} Team`
      },

            monthly_fee_invoice: {
        name: 'Monthly Fee Invoice (Reminder)',
        subject: 'Monthly fee invoice — {{feeMonthLabel}}',
        category: 'payments',
        description: 'Invoice / reminder for monthly fee (existing pending payment or cycle due)',
        channels: ['email'],
        variables: [
          'userName',
          'amount',
          'currency',
          'feeMonthLabel',
          'packageName',
          'paymentId',
          'payByLabel',
          'monthlyFeeUrl',
          'invoiceNote',
          'companyName'
        ],
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Monthly Fee Invoice</title>
            <style>
              body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f3f4f6; }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 32px rgba(0,0,0,0.08); }
              .header { background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); padding: 36px 28px; text-align: center; color: white; }
              .header h1 { margin: 0; font-size: 26px; font-weight: 700; }
              .content { padding: 28px; color: #111827; line-height: 1.6; }
              .card { background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 18px; margin: 18px 0; }
              .amount { font-size: 32px; font-weight: 800; color: #4338ca; text-align: center; margin: 8px 0 12px; }
              .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #c7d2fe; }
              .row:last-child { border-bottom: none; }
              .label { color: #4338ca; font-weight: 600; }
              .value { color: #312e81; font-weight: 700; text-align: right; }
              .cta { display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); color: white; padding: 14px 28px; border-radius: 999px; text-decoration: none; font-weight: 700; margin-top: 8px; }
              .footer { background: #111827; color: #9ca3af; padding: 18px 22px; text-align: center; font-size: 13px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header"><h1>Monthly fee invoice</h1></div>
              <div class="content">
                <p>Hello <strong>{{userName}}</strong>,</p>
                <p>This is your monthly fee invoice for <strong>{{feeMonthLabel}}</strong>. Please complete payment on the Monthly fee page.</p>
                <div class="card">
                  <div class="amount">{{currency}} {{amount}}</div>
                  <div class="row"><span class="label">Package</span><span class="value">{{packageName}}</span></div>
                  <div class="row"><span class="label">Pay by</span><span class="value">{{payByLabel}}</span></div>
                  <div class="row"><span class="label">Reference</span><span class="value">#{{paymentId}}</span></div>
                </div>
                <p>{{invoiceNote}}</p>
                <div style="text-align:center; margin: 24px 0;">
                  <a href="{{monthlyFeeUrl}}" class="cta">View invoice &amp; pay</a>
                </div>
              </div>
              <div class="footer">© 2026 {{companyName}}. All rights reserved.</div>
            </div>
          </body>
          </html>
        `,
        text: `Monthly Fee Invoice\n\nHello {{userName}},\n\nInvoice for {{feeMonthLabel}}\n\nAmount: {{currency}} {{amount}}\nPackage: {{packageName}}\nPay by: {{payByLabel}}\nReference: #{{paymentId}}\n\n{{invoiceNote}}\n\nPay here: {{monthlyFeeUrl}}\n\nBest regards,\nThe {{companyName}} Team`
      },

payment_complete_required: {
        name: 'Complete Your Payment',
        subject: 'Action Required: Complete Your Payment',
        category: 'payments',
        description: 'Admin reminder email when user has not completed payment submission (missing transaction ID/proof)',
        channels: ['email'],
        variables: ['userName', 'amount', 'currency', 'packageName', 'paymentId', 'loginUrl', 'companyName', 'note'],
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Complete Your Payment</title>
            <style>
              body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f3f4f6; }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.08); }
              .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 36px 28px; text-align: center; color: white; }
              .header h1 { margin: 0; font-size: 26px; font-weight: 700; }
              .content { padding: 28px; color: #111827; }
              .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 16px 0; }
              .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
              .row:last-child { border-bottom: none; }
              .label { color: #6b7280; font-weight: 600; }
              .value { color: #111827; font-weight: 700; }
              .cta { display: inline-block; background: #2563eb; color: white; padding: 14px 22px; border-radius: 999px; text-decoration: none; font-weight: 700; margin-top: 14px; }
              .note { margin-top: 14px; padding: 12px 14px; border-left: 4px solid #2563eb; background: #eff6ff; border-radius: 8px; color: #1e3a8a; }
              .footer { background: #111827; color: #9ca3af; padding: 18px 22px; text-align: center; font-size: 13px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Action required: complete your payment</h1>
              </div>
              <div class="content">
                <p>Hello <strong>{{userName}}</strong>,</p>
                <p>We can’t verify your payment yet because we haven’t received the required details (transaction ID / proof).</p>
                <div class="card">
                  <div class="row"><span class="label">Amount</span><span class="value">{{currency}} {{amount}}</span></div>
                  <div class="row"><span class="label">Package</span><span class="value">{{packageName}}</span></div>
                  <div class="row"><span class="label">Payment ID</span><span class="value">#{{paymentId}}</span></div>
                </div>
                <p>Please complete your payment submission using the button below.</p>
                <div style="text-align:center;">
                  <a href="{{loginUrl}}" class="cta">Complete payment</a>
                </div>
                <div class="note"><strong>Note from admin:</strong> {{note}}</div>
              </div>
              <div class="footer">© 2026 {{companyName}}. All rights reserved.</div>
            </div>
          </body>
          </html>
        `,
        text: `Action Required: Complete Your Payment\n\nHello {{userName}},\n\nWe can’t verify your payment yet because we haven’t received the required details (transaction ID / proof).\n\nAmount: {{currency}} {{amount}}\nPackage: {{packageName}}\nPayment ID: #{{paymentId}}\n\nPlease complete your payment submission here:\n{{loginUrl}}\n\nNote from admin: {{note}}\n\nBest regards,\nThe {{companyName}} Team`
      },

      payment_unable_verify: {
        name: 'Unable to Verify Payment',
        subject: 'We are unable to verify your payment',
        category: 'payments',
        description: 'Admin email when payment proof cannot be verified and user should submit again',
        channels: ['email'],
        variables: ['userName', 'amount', 'currency', 'packageName', 'paymentId', 'loginUrl', 'companyName', 'note'],
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Unable to Verify Payment</title>
            <style>
              body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #fff7ed; }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.08); }
              .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 36px 28px; text-align: center; color: white; }
              .header h1 { margin: 0; font-size: 26px; font-weight: 700; }
              .content { padding: 28px; color: #111827; }
              .card { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 12px; padding: 16px; margin: 16px 0; }
              .cta { display: inline-block; background: #d97706; color: white; padding: 14px 22px; border-radius: 999px; text-decoration: none; font-weight: 700; margin-top: 14px; }
              .note { margin-top: 14px; padding: 12px 14px; border-left: 4px solid #d97706; background: #fffbeb; border-radius: 8px; color: #92400e; }
              .footer { background: #111827; color: #9ca3af; padding: 18px 22px; text-align: center; font-size: 13px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>We are unable to verify your payment</h1>
              </div>
              <div class="content">
                <p>Hello <strong>{{userName}}</strong>,</p>
                <p>We reviewed your submitted payment details, but we’re unable to verify them at this time.</p>
                <div class="card">
                  <p><strong>Payment ID:</strong> #{{paymentId}}</p>
                  <p><strong>Amount:</strong> {{currency}} {{amount}}</p>
                  <p><strong>Package:</strong> {{packageName}}</p>
                </div>
                <p>Please submit your payment again with a clear transaction ID / proof so we can verify it quickly.</p>
                <div style="text-align:center;">
                  <a href="{{loginUrl}}" class="cta">Submit payment again</a>
                </div>
                <div class="note"><strong>Note from admin:</strong> {{note}}</div>
              </div>
              <div class="footer">© 2026 {{companyName}}. All rights reserved.</div>
            </div>
          </body>
          </html>
        `,
        text: `We are unable to verify your payment\n\nHello {{userName}},\n\nWe reviewed your submitted payment details, but we’re unable to verify them at this time.\n\nPayment ID: #{{paymentId}}\nAmount: {{currency}} {{amount}}\nPackage: {{packageName}}\n\nPlease submit your payment again here:\n{{loginUrl}}\n\nNote from admin: {{note}}\n\nBest regards,\nThe {{companyName}} Team`
      },

      payment_rejected_retry: {
        name: 'Payment Rejected (Try Again)',
        subject: 'Payment rejected — please try again',
        category: 'payments',
        description: 'Admin email when payment has been rejected and user should retry payment submission',
        channels: ['email'],
        variables: ['userName', 'amount', 'currency', 'packageName', 'paymentId', 'loginUrl', 'companyName', 'note'],
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Payment Rejected</title>
            <style>
              body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #fef2f2; }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.08); }
              .header { background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); padding: 36px 28px; text-align: center; color: white; }
              .header h1 { margin: 0; font-size: 26px; font-weight: 700; }
              .content { padding: 28px; color: #111827; }
              .card { background: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 16px; margin: 16px 0; }
              .cta { display: inline-block; background: #b91c1c; color: white; padding: 14px 22px; border-radius: 999px; text-decoration: none; font-weight: 700; margin-top: 14px; }
              .note { margin-top: 14px; padding: 12px 14px; border-left: 4px solid #b91c1c; background: #fff1f2; border-radius: 8px; color: #7f1d1d; }
              .footer { background: #111827; color: #9ca3af; padding: 18px 22px; text-align: center; font-size: 13px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Your payment was rejected</h1>
              </div>
              <div class="content">
                <p>Hello <strong>{{userName}}</strong>,</p>
                <p>We were unable to accept your payment submission and it has been rejected. Please try again with correct details.</p>
                <div class="card">
                  <p><strong>Payment ID:</strong> #{{paymentId}}</p>
                  <p><strong>Amount:</strong> {{currency}} {{amount}}</p>
                  <p><strong>Package:</strong> {{packageName}}</p>
                </div>
                <div style="text-align:center;">
                  <a href="{{loginUrl}}" class="cta">Try again</a>
                </div>
                <div class="note"><strong>Note from admin:</strong> {{note}}</div>
              </div>
              <div class="footer">© 2026 {{companyName}}. All rights reserved.</div>
            </div>
          </body>
          </html>
        `,
        text: `Payment rejected — please try again\n\nHello {{userName}},\n\nWe were unable to accept your payment submission and it has been rejected. Please try again with correct details.\n\nPayment ID: #{{paymentId}}\nAmount: {{currency}} {{amount}}\nPackage: {{packageName}}\n\nTry again here:\n{{loginUrl}}\n\nNote from admin: {{note}}\n\nBest regards,\nThe {{companyName}} Team`
      },

      withdrawal_request: {
        name: 'Withdrawal Request',
        subject: 'Withdrawal Request Submitted - Awaiting Admin Approval',
        category: 'withdrawals',
        description: 'Email sent when user submits a withdrawal request',
        channels: ['email'],
        variables: ['userName', 'amount', 'currency', 'walletAddress', 'network', 'withdrawalId', 'loginUrl', 'companyName'],
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Withdrawal Request Submitted</title>
            <style>
              body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; }
              .header h1 { color: white; margin: 0; font-size: 32px; font-weight: 300; }
              .icon { font-size: 64px; margin-bottom: 10px; }
              .content { padding: 40px 30px; }
              .welcome-text { font-size: 18px; color: #333; line-height: 1.6; margin-bottom: 30px; }
              .withdrawal-card { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 16px; padding: 30px; margin: 25px 0; border-left: 4px solid #667eea; }
              .withdrawal-amount { font-size: 36px; font-weight: 700; color: #667eea; text-align: center; margin-bottom: 15px; }
              .withdrawal-details { background: white; border-radius: 8px; padding: 20px; margin: 15px 0; }
              .detail-row { display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
              .detail-row:last-child { border-bottom: none; }
              .detail-label { color: #6c757d; font-weight: 500; }
              .detail-value { color: #333; font-weight: 600; word-break: break-all; }
              .status-badge { display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; margin: 10px 0; }
              .info-box { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 20px; margin: 25px 0; }
              .info-title { color: #c2410c; font-weight: 600; margin-bottom: 10px; font-size: 16px; }
              .info-text { color: #9a3412; line-height: 1.6; font-size: 14px; }
              .footer { background: #2d3748; color: white; padding: 30px; text-align: center; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="icon">💸</div>
                <h1>Withdrawal Request Submitted!</h1>
              </div>
              <div class="content">
                <div class="welcome-text">
                  <p>Hello <strong>{{userName}}</strong>,</p>
                  <p>Your withdrawal request has been successfully submitted and is currently being reviewed by our admin team.</p>
                </div>
                
                <div class="withdrawal-card">
                  <div class="withdrawal-amount">{{currency}} {{amount}}</div>
                  <div style="text-align: center;">
                    <span class="status-badge">⏳ Awaiting Admin Approval</span>
                  </div>
                  
                  <div class="withdrawal-details">
                    <div class="detail-row">
                      <span class="detail-label">Amount:</span>
                      <span class="detail-value">{{currency}} {{amount}}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Network:</span>
                      <span class="detail-value">{{network}}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Wallet Address:</span>
                      <span class="detail-value">{{walletAddress}}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Withdrawal ID:</span>
                      <span class="detail-value">#{{withdrawalId}}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Status:</span>
                      <span class="detail-value">Pending Review</span>
                    </div>
                  </div>
                </div>
                
                <div class="info-box">
                  <div class="info-title">📋 What Happens Next?</div>
                  <div class="info-text">
                    <p style="margin: 8px 0;">1. Our admin team will review your withdrawal request</p>
                    <p style="margin: 8px 0;">2. Once verified, the funds will be transferred to your wallet</p>
                    <p style="margin: 8px 0;">3. You'll receive a confirmation email with transaction details</p>
                    <p style="margin: 8px 0;">4. The transaction will appear in your wallet within 24-48 hours</p>
                  </div>
                </div>
                
                <p style="color: #666; font-size: 14px; text-align: center;">
                  We'll notify you via email as soon as your withdrawal is processed. This usually takes 24-48 hours.
                </p>
              </div>
              <div class="footer">
                <p>© 2026 {{companyName}}. All rights reserved.</p>
                <p>Questions? Contact our support team</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Withdrawal Request Submitted - Awaiting Admin Approval\n\nHello {{userName}},\n\nYour withdrawal request has been successfully submitted and is currently being reviewed by our admin team.\n\nWithdrawal Details:\nAmount: {{currency}} {{amount}}\nNetwork: {{network}}\nWallet Address: {{walletAddress}}\nWithdrawal ID: #{{withdrawalId}}\nStatus: Pending Review\n\nWhat Happens Next?\n1. Our admin team will review your withdrawal request\n2. Once verified, the funds will be transferred to your wallet\n3. You'll receive a confirmation email with transaction details\n4. The transaction will appear in your wallet within 24-48 hours\n\nWe'll notify you via email as soon as your withdrawal is processed. This usually takes 24-48 hours.\n\nBest regards,\nThe {{companyName}} Team`
      },

      withdrawal_confirmed: {
        name: 'Withdrawal Confirmed',
        subject: 'Withdrawal Confirmed - Funds Transferred!',
        category: 'withdrawals',
        description: 'Email sent when admin confirms and processes withdrawal',
        channels: ['email'],
        variables: ['userName', 'amount', 'currency', 'transactionHash', 'withdrawalId', 'date', 'loginUrl', 'companyName'],
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Withdrawal Confirmed</title>
            <style>
              body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f0f4f8; }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; }
              .header h1 { color: white; margin: 0; font-size: 30px; font-weight: 600; }
              .success-icon { font-size: 48px; margin-bottom: 10px; }
              .content { padding: 40px 30px; }
              .withdrawal-details { background: #f8f9fa; border-radius: 16px; padding: 30px; margin: 25px 0; border: 2px solid #e9ecef; }
              .amount { font-size: 32px; font-weight: 700; color: #10b981; text-align: center; margin-bottom: 20px; }
              .detail-row { display: flex; justify-content: space-between; margin: 15px 0; padding: 10px 0; border-bottom: 1px solid #e9ecef; }
              .detail-row:last-child { border-bottom: none; }
              .detail-label { color: #6c757d; font-weight: 500; }
              .detail-value { color: #333; font-weight: 600; word-break: break-all; }
              .cta-button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: all 0.3s ease; }
              .cta-button:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3); }
              .footer { background: #2c3e50; color: white; padding: 30px; text-align: center; font-size: 14px; }
              .checkmark { color: #10b981; font-size: 24px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="success-icon">✅</div>
                <h1>Withdrawal Confirmed!</h1>
              </div>
              <div class="content">
                <p>Hello <strong>{{userName}}</strong>,</p>
                <p>Great news! Your withdrawal request has been confirmed and processed by our admin team. The funds have been transferred to your wallet.</p>
                
                <div class="withdrawal-details">
                  <div class="amount">{{currency}} {{amount}}</div>
                  <div class="detail-row">
                    <span class="detail-label">Amount:</span>
                    <span class="detail-value">{{currency}} {{amount}}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Withdrawal ID:</span>
                    <span class="detail-value">#{{withdrawalId}}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Transaction Hash:</span>
                    <span class="detail-value">{{transactionHash}}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Date:</span>
                    <span class="detail-value">{{date}}</span>
                  </div>
                </div>
                
                <p style="text-align: center; color: #10b981; font-weight: 600;">
                  <span class="checkmark">✓</span> Funds have been transferred to your wallet
                </p>
                
                <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
                  The transaction should appear in your wallet within a few minutes. If you don't see it after 24 hours, please contact our support team.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="{{loginUrl}}" class="cta-button">🚀 View Dashboard</a>
                </div>
              </div>
              <div class="footer">
                <p>© 2026 {{companyName}}. All rights reserved.</p>
                <p>Questions about this withdrawal? Contact support</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Withdrawal Confirmed - Funds Transferred!\n\nHello {{userName}},\n\nGreat news! Your withdrawal request has been confirmed and processed by our admin team. The funds have been transferred to your wallet.\n\nWithdrawal Details:\nAmount: {{currency}} {{amount}}\nWithdrawal ID: #{{withdrawalId}}\nTransaction Hash: {{transactionHash}}\nDate: {{date}}\n\n✓ Funds have been transferred to your wallet\n\nThe transaction should appear in your wallet within a few minutes. If you don't see it after 24 hours, please contact our support team.\n\nView Dashboard: {{loginUrl}}\n\nBest regards,\nThe {{companyName}} Team`
      },

      balance_credited: {
        name: 'Balance Credited',
        subject: 'Balance Credited to Your Account',
        category: 'balance',
        description: 'Email sent when admin credits balance to user account',
        channels: ['email'],
        variables: ['userName', 'amount', 'currency', 'description', 'transactionId', 'date', 'loginUrl', 'companyName'],
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Balance Credited</title>
            <style>
              body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; }
              .header h1 { color: white; margin: 0; font-size: 32px; font-weight: 300; }
              .success-icon { font-size: 64px; margin-bottom: 10px; }
              .content { padding: 40px 30px; }
              .welcome-text { font-size: 18px; color: #333; line-height: 1.6; margin-bottom: 30px; }
              .balance-card { background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 16px; padding: 30px; margin: 25px 0; border-left: 4px solid #10b981; }
              .balance-amount { font-size: 42px; font-weight: 700; color: #059669; text-align: center; margin-bottom: 15px; }
              .balance-details { background: white; border-radius: 8px; padding: 20px; margin: 15px 0; }
              .detail-row { display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
              .detail-row:last-child { border-bottom: none; }
              .detail-label { color: #6c757d; font-weight: 500; }
              .detail-value { color: #333; font-weight: 600; }
              .description-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 20px; margin: 25px 0; }
              .description-title { color: #166534; font-weight: 600; margin-bottom: 10px; font-size: 16px; }
              .description-text { color: #15803d; line-height: 1.6; font-size: 14px; }
              .cta-button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 16px; transition: transform 0.3s ease; margin: 20px 0; }
              .cta-button:hover { transform: translateY(-2px); }
              .footer { background: #2d3748; color: white; padding: 30px; text-align: center; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="success-icon">💰</div>
                <h1>Balance Credited!</h1>
              </div>
              <div class="content">
                <div class="welcome-text">
                  <p>Hello <strong>{{userName}}</strong>,</p>
                  <p>Great news! Funds have been successfully credited to your account.</p>
                </div>
                
                <div class="balance-card">
                  <div class="balance-amount">+{{currency}} {{amount}}</div>
                  <div style="text-align: center; color: #059669; font-weight: 600; font-size: 16px;">
                    ✓ Successfully Added to Your Account
                  </div>
                  
                  <div class="balance-details">
                    <div class="detail-row">
                      <span class="detail-label">Amount Credited:</span>
                      <span class="detail-value">{{currency}} {{amount}}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Transaction ID:</span>
                      <span class="detail-value">#{{transactionId}}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Date:</span>
                      <span class="detail-value">{{date}}</span>
                    </div>
                  </div>
                </div>
                
                <div class="description-box">
                  <div class="description-title">📝 Transaction Details</div>
                  <div class="description-text">
                    {{description}}
                  </div>
                </div>
                
                <p style="color: #666; font-size: 14px; text-align: center; margin: 30px 0 20px;">
                  Your new balance is now available in your account. You can use it for trading, withdrawals, or other transactions.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="{{loginUrl}}" class="cta-button">🚀 View My Balance</a>
                </div>
                
                <p style="color: #666; font-size: 14px; text-align: center;">
                  If you have any questions about this transaction, please contact our support team.
                </p>
              </div>
              <div class="footer">
                <p>© 2026 {{companyName}}. All rights reserved.</p>
                <p>Thank you for being part of our community!</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Balance Credited to Your Account\n\nHello {{userName}},\n\nGreat news! Funds have been successfully credited to your account.\n\nAmount Credited: {{currency}} {{amount}}\nTransaction ID: #{{transactionId}}\nDate: {{date}}\n\nTransaction Details:\n{{description}}\n\nYour new balance is now available in your account. You can use it for trading, withdrawals, or other transactions.\n\nView My Balance: {{loginUrl}}\n\nIf you have any questions about this transaction, please contact our support team.\n\nBest regards,\nThe {{companyName}} Team`
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
    let text = template.text || '';

    // Replace variables in both HTML and text versions
    // Handle both {{variable}} and {{ variable }} formats
    Object.keys(variables).forEach(key => {
      const value = variables[key] || '';
      // Replace {{key}} format
      const regex1 = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      html = html.replace(regex1, value);
      text = text.replace(regex1, value);
      // Replace {{ key }} format (with spaces)
      const regex2 = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      html = html.replace(regex2, value);
      text = text.replace(regex2, value);
    });

    // Strip any remaining {{...}} patterns (anything between double braces) so variables never show in email
    const stripPlaceholders = (s) => s.replace(/\{\{[^}]*\}\}/g, '');
    html = stripPlaceholders(html);
    text = stripPlaceholders(text);

    // Return with replaced html/text last so they are not overwritten by ...template
    return {
      ...template,
      html,
      text,
      subject: template.subject || template.name
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

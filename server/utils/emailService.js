import nodemailer from 'nodemailer';

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send email notification
export const sendEmail = async (to, subject, html) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('Email credentials not configured. Skipping email send.');
      return { success: false, message: 'Email not configured' };
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: `Task Manager <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Email templates
export const emailTemplates = {
  taskAssignment: (taskTitle, assignerName, dueDate) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366f1;">New Task Assigned</h2>
      <p>Hi there,</p>
      <p><strong>${assignerName}</strong> has assigned you a new task:</p>
      <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #1f2937;">${taskTitle}</h3>
        <p style="margin: 0; color: #6b7280;">Due Date: ${new Date(dueDate).toLocaleDateString()}</p>
      </div>
      <p>Log in to your dashboard to view details and start working on it.</p>
      <a href="${process.env.CLIENT_URL}/dashboard" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View Task</a>
    </div>
  `,
  
  deadlineReminder: (taskTitle, hoursLeft) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ef4444;">⏰ Task Deadline Reminder</h2>
      <p>Hi there,</p>
      <p>This is a reminder that your task is due soon:</p>
      <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
        <h3 style="margin: 0 0 10px 0; color: #991b1b;">${taskTitle}</h3>
        <p style="margin: 0; color: #7f1d1d; font-weight: bold;">Due in ${hoursLeft} hours</p>
      </div>
      <p>Please complete the task before the deadline.</p>
      <a href="${process.env.CLIENT_URL}/dashboard" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View Task</a>
    </div>
  `,
  
  statusChange: (taskTitle, oldStatus, newStatus, changedBy) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">Task Status Updated</h2>
      <p>Hi there,</p>
      <p><strong>${changedBy}</strong> has updated the status of a task:</p>
      <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #1f2937;">${taskTitle}</h3>
        <p style="margin: 0; color: #6b7280;">
          Status: <span style="text-decoration: line-through;">${oldStatus}</span> → <strong style="color: #10b981;">${newStatus}</strong>
        </p>
      </div>
      <a href="${process.env.CLIENT_URL}/dashboard" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View Task</a>
    </div>
  `,

  taskOverdue: (taskTitle, daysOverdue) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">🚨 Task Overdue Alert</h2>
      <p>Hi there,</p>
      <p><strong>URGENT:</strong> Your task has passed its deadline and is now overdue!</p>
      <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
        <h3 style="margin: 0 0 10px 0; color: #991b1b;">${taskTitle}</h3>
        <p style="margin: 0; color: #7f1d1d; font-weight: bold;">⚠️ Overdue by ${daysOverdue} day(s)</p>
      </div>
      <p>Please complete this task as soon as possible or update its status.</p>
      <a href="${process.env.CLIENT_URL}/dashboard" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">Complete Task Now</a>
    </div>
  `,

  passwordResetOTP: (otp) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset OTP</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #ff6b35, #f7931e);
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 24px;
          margin-bottom: 16px;
        }
        .otp-code {
          background: #f8f9fa;
          border: 2px dashed #dee2e6;
          padding: 20px;
          text-align: center;
          margin: 30px 0;
          border-radius: 8px;
        }
        .otp-number {
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          color: #2563eb;
          font-family: monospace;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          font-size: 12px;
          color: #666;
        }
        .warning {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          padding: 12px;
          border-radius: 6px;
          margin: 20px 0;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">A</div>
          <h1>Password Reset Request</h1>
          <p>You requested to reset your password for Algonive</p>
        </div>
        
        <p>Hello,</p>
        <p>We received a request to reset your password for your Algonive account. To proceed, please use the following 6-digit verification code:</p>
        
        <div class="otp-code">
          <div class="otp-number">${otp}</div>
        </div>
        
        <div class="warning">
          <strong>Important:</strong> This code will expire in <strong>10 minutes</strong> for security reasons.
        </div>
        
        <p>If you didn't request this password reset, you can safely ignore this email. Your account remains secure.</p>
        
        <p>For your security:</p>
        <ul>
          <li>Never share this code with anyone</li>
          <li>Algonive staff will never ask for this code</li>
          <li>This code can only be used once</li>
        </ul>
        
        <div class="footer">
          <p>This is an automated message from Algonive Project Workspace.</p>
          <p>© 2024 Algonive. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
};

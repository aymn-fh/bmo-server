const nodemailer = require('nodemailer');

// Create transporter with correct SMTP environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mail.neoteam.ly',
  port: process.env.SMTP_PORT || 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verify transporter connection
const verifyTransporter = async () => {
  try {
    await transporter.verify();
    console.log('✅ Email transporter verified successfully');
    return true;
  } catch (error) {
    console.error('❌ Email transporter verification failed:', error.message);
    return false;
  }
};

// Retry function with exponential backoff
const sendWithRetry = async (mailOptions, retries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`📧 Email sent successfully on attempt ${attempt}:`, info.messageId);
      return info;
    } catch (error) {
      console.error(`❌ Email send attempt ${attempt} failed:`, error.message);
      if (attempt === retries) {
        throw new Error(`Failed to send email after ${retries} attempts: ${error.message}`);
      }
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }
};

// Send verification email
const sendVerificationEmail = async (email, code) => {
  const mailOptions = {
    from: `"BMO Support" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Verify Your Email - BMO',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to BMO!</h2>
        <p>Please verify your email address to complete your registration.</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <h3 style="color: #333; margin: 0 0 10px 0;">Your Verification Code</h3>
          <div style="font-size: 32px; font-weight: bold; color: #4CAF50; letter-spacing: 5px;">${code}</div>
        </div>
        <p>Enter this 6-digit code in the app to verify your email address.</p>
        <p>This code will expire in 24 hours.</p>
        <p>If you didn't request this verification, please ignore this email.</p>
        <p>Best regards,<br>BMO Team</p>
      </div>
    `
  };

  await sendWithRetry(mailOptions);
};

// Send password reset email with 6-digit code
const sendPasswordResetEmail = async (email, code) => {
  const mailOptions = {
    from: `"BMO Support" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Password Reset - BMO',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your BMO account.</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <h3 style="color: #333; margin: 0 0 10px 0;">Your Reset Code</h3>
          <div style="font-size: 32px; font-weight: bold; color: #2196F3; letter-spacing: 5px;">${code}</div>
        </div>
        <p>Enter this 6-digit code in the app to reset your password.</p>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this reset, please ignore this email.</p>
        <p>Best regards,<br>BMO Team</p>
      </div>
    `
  };

  await sendWithRetry(mailOptions);
};

// Send child creation notification email
const sendChildCreationEmail = async (parentEmail, childName, specialistName) => {
  const mailOptions = {
    from: `"BMO Support" <${process.env.SMTP_USER}>`,
    to: parentEmail,
    subject: 'New Child Profile Created - BMO',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Child Profile Created</h2>
        <p>Hello,</p>
        <p>A new child profile for <strong>${childName}</strong> has been created and linked to your account by specialist <strong>${specialistName}</strong>.</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;">You can now view this profile in your parent dashboard.</p>
        </div>
        <p>If you have any questions, please contact your specialist.</p>
        <p>Best regards,<br>BMO Team</p>
      </div>
    `
  };

  await sendWithRetry(mailOptions);
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendChildCreationEmail,
  verifyTransporter
};

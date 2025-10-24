const nodemailer = require('nodemailer');
require('dotenv').config();

// Gmail SMTP Configuration
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: 'clutch3.info@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD // App-specific password
  }
});

// Email Templates
const emailTemplates = {
  warning: {
    review: (userName, count) => ({
      subject: '⚠️ Clutch3 Account Warning - Incorrect Video Reviews',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f8f9fa; border-left: 4px solid #ffc107; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #856404; margin: 0 0 10px 0;">⚠️ Account Warning</h2>
            <p style="margin: 0; color: #856404;">You have received a warning for incorrect video reviews.</p>
          </div>
          
          <div style="background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px;">
            <h3 style="color: #333; margin-top: 0;">Hello ${userName},</h3>
            
            <p>We've detected that you have <strong>${count} incorrect video reviews</strong> in the last 30 days.</p>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0; color: #856404;">Please remember to:</h4>
              <ul style="margin: 0; color: #856404;">
                <li>Watch videos completely before reviewing</li>
                <li>Follow the rules and guidelines carefully</li>
                <li>Report violations accurately</li>
              </ul>
            </div>
            
            <p><strong>Important:</strong> If you continue reviewing incorrectly, your account will be suspended.</p>
            
            <p>Thank you for helping maintain the quality of our community.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
              <p style="color: #6c757d; font-size: 14px; margin: 0;">
                Best regards,<br>
                The Clutch3 Team<br>
                <a href="mailto:clutch3.info@gmail.com" style="color: #007bff;">clutch3.info@gmail.com</a>
              </p>
            </div>
          </div>
        </div>
      `
    }),
    
    upload: (userName, count) => ({
      subject: '⚠️ Clutch3 Account Warning - Incorrect Shot Reports',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f8f9fa; border-left: 4px solid #ffc107; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #856404; margin: 0 0 10px 0;">⚠️ Account Warning</h2>
            <p style="margin: 0; color: #856404;">You have received a warning for incorrect shot reports.</p>
          </div>
          
          <div style="background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px;">
            <h3 style="color: #333; margin-top: 0;">Hello ${userName},</h3>
            
            <p>We've detected that you have <strong>${count} incorrect shot reports</strong> in the last 30 days.</p>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0; color: #856404;">Please remember to:</h4>
              <ul style="margin: 0; color: #856404;">
                <li>Report your made shots accurately</li>
                <li>Be honest about your performance</li>
                <li>Follow the scoring guidelines</li>
              </ul>
            </div>
            
            <p><strong>Important:</strong> If you continue reporting incorrectly, your account will be suspended.</p>
            
            <p>Thank you for your honesty and integrity.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
              <p style="color: #6c757d; font-size: 14px; margin: 0;">
                Best regards,<br>
                The Clutch3 Team<br>
                <a href="mailto:clutch3.info@gmail.com" style="color: #007bff;">clutch3.info@gmail.com</a>
              </p>
            </div>
          </div>
        </div>
      `
    })
  },
  
  suspension: (userName, reason) => ({
    subject: '🚫 Clutch3 Account Suspended',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #721c24; margin: 0 0 10px 0;">🚫 Account Suspended</h2>
          <p style="margin: 0; color: #721c24;">Your Clutch3 account has been suspended.</p>
        </div>
        
        <div style="background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px;">
          <h3 style="color: #333; margin-top: 0;">Hello ${userName},</h3>
          
          <p>Your Clutch3 account has been suspended due to: <strong>${reason}</strong></p>
          
          <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; padding: 15px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #721c24;">What this means:</h4>
            <ul style="margin: 0; color: #721c24;">
              <li>You cannot log into your account</li>
              <li>You cannot upload or review videos</li>
              <li>Your account is temporarily disabled</li>
            </ul>
          </div>
          
          <p>If you believe this is an error, please contact our support team immediately.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            <p style="color: #6c757d; font-size: 14px; margin: 0;">
              For support, contact us at:<br>
              <a href="mailto:clutch3.info@gmail.com" style="color: #007bff;">clutch3.info@gmail.com</a>
            </p>
          </div>
        </div>
      </div>
    `
  }),
  
  disabled: (userName, reason) => ({
    subject: '🚫 Clutch3 Account Disabled',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #721c24; margin: 0 0 10px 0;">🚫 Account Disabled</h2>
          <p style="margin: 0; color: #721c24;">Your Clutch3 account has been disabled.</p>
        </div>
        
        <div style="background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px;">
          <h3 style="color: #333; margin-top: 0;">Hello ${userName},</h3>
          
          <p>Your Clutch3 account has been disabled.</p>
          <p><strong>Reason:</strong> ${reason}</p>
          
          <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; padding: 15px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #721c24;">What this means:</h4>
            <ul style="margin: 0; color: #721c24;">
              <li>You cannot log into your account</li>
              <li>You cannot upload or review videos</li>
              <li>Your account is permanently disabled</li>
            </ul>
          </div>
          
          <p>If you believe this is an error, please contact our support team immediately.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            <p style="color: #6c757d; font-size: 14px; margin: 0;">
              For support, contact us at:<br>
              <a href="mailto:clutch3.info@gmail.com" style="color: #007bff;">clutch3.info@gmail.com</a>
            </p>
          </div>
        </div>
      </div>
    `
  })
};

// Email sending functions
async function sendWarningEmail(userEmail, userName, violationType, count) {
  try {
    const template = emailTemplates.warning[violationType](userName, count);
    
    const mailOptions = {
      from: 'Clutch3 Team <clutch3.info@gmail.com>',
      to: userEmail,
      subject: template.subject,
      html: template.html
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log(`✓ Warning email sent to ${userEmail}: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error(`✗ Failed to send warning email to ${userEmail}:`, error);
    throw error;
  }
}

async function sendSuspensionEmail(userEmail, userName, reason) {
  try {
    const template = emailTemplates.suspension(userName, reason);
    
    const mailOptions = {
      from: 'Clutch3 Team <clutch3.info@gmail.com>',
      to: userEmail,
      subject: template.subject,
      html: template.html
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log(`✓ Suspension email sent to ${userEmail}: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error(`✗ Failed to send suspension email to ${userEmail}:`, error);
    throw error;
  }
}

async function sendDisabledEmail(userEmail, userName, reason) {
  try {
    const template = emailTemplates.disabled(userName, reason);
    
    const mailOptions = {
      from: 'Clutch3 Team <clutch3.info@gmail.com>',
      to: userEmail,
      subject: template.subject,
      html: template.html
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log(`✓ Disabled email sent to ${userEmail}: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error(`✗ Failed to send disabled email to ${userEmail}:`, error);
    throw error;
  }
}

module.exports = {
  transporter,
  emailTemplates,
  sendWarningEmail,
  sendSuspensionEmail,
  sendDisabledEmail
};

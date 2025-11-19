import nodemailer from 'nodemailer';

export const createTransporter = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;

  if (!emailUser || !emailPassword) {
    console.warn('⚠️ Email credentials not configured in .env file');
    console.warn('Email notifications will not work. Configure EMAIL_USER and EMAIL_PASSWORD in .env');
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
      user: emailUser,
      pass: emailPassword
    }
  });
};

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    // Check if email is configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn(`⚠️ Email not sent to ${to} - EMAIL_USER or EMAIL_PASSWORD not configured`);
      return false;
    }

    const transporter = createTransporter();
    
    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'MatrixYuvraj <noreply@matrixyuvraj.com>',
      to,
      subject,
      html
    });
    
    console.log(`✅ Email sent to ${to} - Message ID: ${result.messageId}`);
    return true;
  } catch (error: any) {
    console.error('❌ Email sending failed:', error.message);
    return false;
  }
};

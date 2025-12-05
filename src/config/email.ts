import nodemailer from 'nodemailer';

/**
 * Send email using SMTP (Gmail or custom SMTP)
 * Configure your SMTP credentials in .env file
 */
export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    // Create SMTP transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: `${process.env.EMAIL_FROM_NAME || 'RitzYard Support'} <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`✅ Email sent successfully to ${to}`);
    console.log(`📧 Message ID: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error('❌ Email sending failed:', error.message);
    console.log('\n📧 SMTP Configuration Help:');
    console.log('   Add these to your .env file:\n');
    console.log('   For Gmail:');
    console.log('   SMTP_HOST=smtp.gmail.com');
    console.log('   SMTP_PORT=587');
    console.log('   SMTP_USER=your-email@gmail.com');
    console.log('   SMTP_PASS=your-app-password (get from https://myaccount.google.com/apppasswords)');
    console.log('   EMAIL_FROM_NAME=RitzYard Support\n');
    return false;
  }
};

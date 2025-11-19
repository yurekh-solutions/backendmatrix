"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = exports.createTransporter = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const createTransporter = () => {
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;
    if (!emailUser || !emailPassword) {
        console.warn('⚠️ Email credentials not configured in .env file');
        console.warn('Email notifications will not work. Configure EMAIL_USER and EMAIL_PASSWORD in .env');
    }
    return nodemailer_1.default.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false,
        auth: {
            user: emailUser,
            pass: emailPassword
        }
    });
};
exports.createTransporter = createTransporter;
const sendEmail = async (to, subject, html) => {
    try {
        // Check if email is configured
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            console.warn(`⚠️ Email not sent to ${to} - EMAIL_USER or EMAIL_PASSWORD not configured`);
            return false;
        }
        const transporter = (0, exports.createTransporter)();
        const result = await transporter.sendMail({
            from: process.env.EMAIL_FROM || 'MatrixYuvraj <noreply@matrixyuvraj.com>',
            to,
            subject,
            html
        });
        console.log(`✅ Email sent to ${to} - Message ID: ${result.messageId}`);
        return true;
    }
    catch (error) {
        console.error('❌ Email sending failed:', error.message);
        return false;
    }
};
exports.sendEmail = sendEmail;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = exports.createTransporter = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const createTransporter = () => {
    return nodemailer_1.default.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
};
exports.createTransporter = createTransporter;
const sendEmail = async (to, subject, html) => {
    try {
        const transporter = (0, exports.createTransporter)();
        await transporter.sendMail({
            from: process.env.EMAIL_FROM || 'MatrixYuvraj <noreply@matrixyuvraj.com>',
            to,
            subject,
            html
        });
        console.log(`✅ Email sent to ${to}`);
        return true;
    }
    catch (error) {
        console.error('❌ Email sending failed:', error);
        return false;
    }
};
exports.sendEmail = sendEmail;

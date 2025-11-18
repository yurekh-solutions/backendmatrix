"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';
const OLD_JWT_SECRETS = [
    'your_super_secret_jwt_key',
    'matrixyuvraj_secret_key_2025_supplier_onboarding_system'
];
const generateToken = (id, type) => {
    const options = {
        expiresIn: '7d'
    };
    return jsonwebtoken_1.default.sign({ id, type }, JWT_SECRET, options);
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    // Try current secret first
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        console.log('Token verified successfully with current secret:', decoded);
        return decoded;
    }
    catch (error) {
        console.log('Current secret failed, trying old secrets...');
    }
    // Try old secrets for backward compatibility
    for (const oldSecret of OLD_JWT_SECRETS) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, oldSecret);
            console.log('Token verified successfully with old secret:', decoded);
            return decoded;
        }
        catch (error) {
            // Continue to next secret
        }
    }
    console.error('JWT verification failed: All secrets tried');
    return null;
};
exports.verifyToken = verifyToken;

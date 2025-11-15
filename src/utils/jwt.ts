import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';
const OLD_JWT_SECRETS = [
  'your_super_secret_jwt_key',
  'matrixyuvraj_secret_key_2025_supplier_onboarding_system'
];

export const generateToken = (id: string, type: 'admin' | 'supplier'): string => {
  const options: SignOptions = {
    expiresIn: '7d'
  };
  return jwt.sign({ id, type }, JWT_SECRET, options);
};

export const verifyToken = (token: string): any => {
  // Try current secret first
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Token verified successfully with current secret:', decoded);
    return decoded;
  } catch (error: any) {
    console.log('Current secret failed, trying old secrets...');
  }

  // Try old secrets for backward compatibility
  for (const oldSecret of OLD_JWT_SECRETS) {
    try {
      const decoded = jwt.verify(token, oldSecret);
      console.log('Token verified successfully with old secret:', decoded);
      return decoded;
    } catch (error) {
      // Continue to next secret
    }
  }

  console.error('JWT verification failed: All secrets tried');
  return null;
};

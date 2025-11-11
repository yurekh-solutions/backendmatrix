import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';

export const generateToken = (id: string, type: 'admin' | 'supplier'): string => {
  const options: SignOptions = {
    expiresIn: '7d'
  };
  return jwt.sign({ id, type }, JWT_SECRET, options);
};

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

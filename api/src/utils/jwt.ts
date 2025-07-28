import { createRequire } from 'module';
import { ApiError } from '../types/errors.js';
const require = createRequire(import.meta.url);
const jwt = require('jsonwebtoken');

// Environment variables with secure defaults
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'; // Short-lived access token
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'; // Long-lived refresh token

// Validate required secrets
if (!JWT_SECRET || JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
  throw new Error('JWT_SECRET must be set in production');
}

if (!JWT_REFRESH_SECRET) {
  // Use different secret for refresh tokens for better security
  throw new Error('JWT_REFRESH_SECRET must be set in production');
}

export interface JWTPayload {
  staffId: string;
  restaurantId: string | null; // null for SUPER_ADMIN
  role: string;
  email: string;
}

interface TokenPayload extends JWTPayload {
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

/**
 * Generate short-lived access token
 */
export const generateToken = (payload: JWTPayload): string => {
  const tokenPayload: TokenPayload = {
    ...payload,
    type: 'access'
  };

  return jwt.sign(tokenPayload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'qr-ordering-api',
    audience: 'qr-ordering-client'
  });
};

/**
 * Generate long-lived refresh token
 */
export const generateRefreshToken = (payload: JWTPayload): string => {
  const tokenPayload: TokenPayload = {
    ...payload,
    type: 'refresh'
  };

  return jwt.sign(tokenPayload, JWT_REFRESH_SECRET, { 
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'qr-ordering-api',
    audience: 'qr-ordering-client'
  });
};

/**
 * Verify access token
 */
export const verifyToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'qr-ordering-api',
      audience: 'qr-ordering-client'
    }) as TokenPayload;

    // Ensure it's an access token
    if (decoded.type !== 'access') {
      throw new ApiError(401, 'INVALID_TOKEN_TYPE', 'Invalid token type');
    }

    // Return only the payload data
    const { type, iat, exp, ...payload } = decoded;
    return payload;

  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, 'TOKEN_EXPIRED', 'Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError(401, 'INVALID_TOKEN', 'Invalid token');
    }
    throw error;
  }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'qr-ordering-api',
      audience: 'qr-ordering-client'
    }) as TokenPayload;

    // Ensure it's a refresh token
    if (decoded.type !== 'refresh') {
      throw new ApiError(401, 'INVALID_TOKEN_TYPE', 'Invalid token type');
    }

    // Return only the payload data
    const { type, iat, exp, ...payload } = decoded;
    return payload;

  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, 'REFRESH_TOKEN_EXPIRED', 'Refresh token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token');
    }
    throw error;
  }
};

/**
 * Decode token without verification (for debugging)
 */
export const decodeToken = (token: string): TokenPayload | null => {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch (error) {
    return null;
  }
};

/**
 * Get token expiration time
 */
export const getTokenExpiration = (token: string): Date | null => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return null;
  
  return new Date(decoded.exp * 1000);
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  const expiration = getTokenExpiration(token);
  if (!expiration) return true;
  
  return expiration < new Date();
};

/**
 * Generate a token for password reset (different purpose, different secret)
 */
export const generatePasswordResetToken = (staffId: string): string => {
  const resetSecret = process.env.JWT_RESET_SECRET || JWT_SECRET + '-reset';
  
  return jwt.sign(
    { staffId, type: 'password-reset' }, 
    resetSecret, 
    { expiresIn: '1h' }
  );
};

/**
 * Verify password reset token
 */
export const verifyPasswordResetToken = (token: string): { staffId: string } => {
  try {
    const resetSecret = process.env.JWT_RESET_SECRET || JWT_SECRET + '-reset';
    const decoded = jwt.verify(token, resetSecret) as any;
    
    if (decoded.type !== 'password-reset') {
      throw new ApiError(400, 'INVALID_TOKEN_TYPE', 'Invalid reset token');
    }
    
    return { staffId: decoded.staffId };
  } catch (error) {
    throw new ApiError(400, 'INVALID_RESET_TOKEN', 'Invalid or expired reset token');
  }
};
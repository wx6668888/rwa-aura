// ============================================================
// RWA Aura Chat — Wallet Auth Middleware
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import { chatService } from '../services/chat-service';
import { verifyChatSessionToken } from './chat-session';

const AUTH_MESSAGE = 'Sign this message to authenticate with RWA Aura Chat.\n\nThis does not cost any gas fees.';
const GUEST_SIGNATURE = 'guest';

export function getAuthMessage(): string {
  return AUTH_MESSAGE;
}

/**
 * Verify a wallet signature and return the recovered address.
 */
export function verifySignature(signature: string, message?: string): string | null {
  if (signature == null || typeof signature !== 'string') {
    return null;
  }
  try {
    const msg = message || AUTH_MESSAGE;
    const address = ethers.verifyMessage(msg, signature);
    return address.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Guest auth is allowed for development/testing clients.
 * address must use guest_ prefix and signature must be literal "guest".
 */
export function isGuestAuth(address: string, signature: string): boolean {
  return signature === GUEST_SIGNATURE && address.toLowerCase().startsWith('guest_');
}

/**
 * Express middleware:
 * - 优先 `Authorization: Bearer <token>` 或 `x-chat-session`（登录后免签名）
 * - 否则 `x-wallet-address` + `x-wallet-signature`（首次或会话过期）
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const addressHeader = (req.headers['x-wallet-address'] as string | undefined)?.trim();
  const authHdr = req.headers['authorization'] as string | undefined;
  const bearer =
    typeof authHdr === 'string' && authHdr.toLowerCase().startsWith('bearer ')
      ? authHdr.slice(7).trim()
      : '';
  const sessionHeader = (req.headers['x-chat-session'] as string | undefined)?.trim() || bearer;

  if (sessionHeader) {
    const recoveredAddr = verifyChatSessionToken(sessionHeader);
    if (!recoveredAddr) {
      return res.status(401).json({ error: 'Invalid or expired chat session' });
    }
    if (addressHeader && addressHeader.toLowerCase() !== recoveredAddr) {
      return res.status(401).json({ error: 'Session does not match wallet address' });
    }
    const address = (addressHeader || recoveredAddr).toLowerCase();
    const user = chatService.getUserByAddress(address);
    (req as any).walletAddress = address;
    (req as any).userId = user?.id;
    return next();
  }

  const address = addressHeader;
  const signature = req.headers['x-wallet-signature'] as string;

  if (!address || !signature) {
    return res.status(401).json({ error: 'Missing wallet authentication headers' });
  }

  const recovered = verifySignature(signature);
  const validWalletSig = !!recovered && recovered === address.toLowerCase();
  const validGuestSig = isGuestAuth(address, signature);
  if (!validWalletSig && !validGuestSig) {
    return res.status(401).json({ error: 'Invalid wallet signature' });
  }

  // Attach user to request
  const user = chatService.getUserByAddress(address);
  (req as any).walletAddress = address.toLowerCase();
  (req as any).userId = user?.id;

  next();
}

/**
 * Require an authenticated admin user.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).userId as string | undefined;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const user = chatService.getUser(userId);
  if (!user?.isAdmin) {
    return res.status(403).json({ error: 'Admin permission required' });
  }
  next();
}

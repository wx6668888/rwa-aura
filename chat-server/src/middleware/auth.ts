// ============================================================
// RWA Aura Chat — Wallet Auth Middleware
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import { chatService } from '../services/chat-service';

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
 * Express middleware: expects x-wallet-address and x-wallet-signature headers.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const address = req.headers['x-wallet-address'] as string;
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

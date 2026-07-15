import crypto from 'crypto';
import dns from 'dns/promises';
import net from 'net';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { User } from '../src/types.js';

const SESSION_COOKIE = 'trabajolocal_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

interface Session {
  userId: string;
  expiresAt: number;
}

const sessions = new Map<string, Session>();

export interface AuthenticatedRequest extends Request {
  authUser?: User;
}

function parseCookies(header = ''): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

export function createSession(res: Response, userId: string): void {
  const token = crypto.randomBytes(32).toString('base64url');
  sessions.set(token, { userId, expiresAt: Date.now() + SESSION_TTL_MS });
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_MS / 1000}${secure}`,
  );
}

export function destroySession(req: Request, res: Response): void {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (token) sessions.delete(token);
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`,
  );
}

export function requireAuth(getUser: (id: string) => User | undefined): RequestHandler {
  return (req, res, next) => {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    const session = token ? sessions.get(token) : undefined;
    if (!token || !session || session.expiresAt <= Date.now()) {
      if (token) sessions.delete(token);
      return res.status(401).json({ error: 'Debes iniciar sesión.' });
    }

    const user = getUser(session.userId);
    if (!user) {
      sessions.delete(token);
      return res.status(401).json({ error: 'La sesión ya no es válida.' });
    }

    session.expiresAt = Date.now() + SESSION_TTL_MS;
    (req as AuthenticatedRequest).authUser = user;
    next();
  };
}

export function requireRole(role: User['role']): RequestHandler {
  return (req, res, next) => {
    if ((req as AuthenticatedRequest).authUser?.role !== role) {
      return res.status(403).json({ error: 'No tienes permisos para realizar esta acción.' });
    }
    next();
  };
}

export function createRateLimit(
  maxRequests: number,
  windowMs: number,
): RequestHandler {
  const clients = new Map<string, { count: number; resetAt: number }>();
  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const current = clients.get(key);
    const entry = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;
    entry.count += 1;
    clients.set(key, entry);
    if (entry.count > maxRequests) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ error: 'Demasiadas solicitudes. Inténtalo más tarde.' });
    }
    next();
  };
}

export function verifySecret(provided: unknown, expected: string): boolean {
  if (typeof provided !== 'string') return false;
  const providedDigest = crypto.createHash('sha256').update(provided).digest();
  const expectedDigest = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(providedDigest, expectedDigest);
}

export function isPrivateIp(address: string): boolean {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return a === 10
      || a === 127
      || a === 0
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 100 && b >= 64 && b <= 127)
      || a >= 224;
  }
  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    return normalized === '::1'
      || normalized === '::'
      || normalized.startsWith('fc')
      || normalized.startsWith('fd')
      || normalized.startsWith('fe8')
      || normalized.startsWith('fe9')
      || normalized.startsWith('fea')
      || normalized.startsWith('feb');
  }
  return true;
}

export async function validatePublicUrl(
  value: string,
  allowedHosts?: ReadonlySet<string>,
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('La URL no es válida.');
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Solo se permiten URLs HTTP/HTTPS sin credenciales.');
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (allowedHosts && !allowedHosts.has(hostname)) {
    throw new Error('El dominio no pertenece a una fuente de empleo autorizada.');
  }
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new Error('No se permiten direcciones de red locales.');
  }

  const addresses = net.isIP(hostname)
    ? [{ address: hostname }]
    : await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(result => isPrivateIp(result.address))) {
    throw new Error('La URL resuelve a una dirección privada o no permitida.');
  }
  return url;
}

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

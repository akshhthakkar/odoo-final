import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../../shared/errors.js';
import { env } from '../../config/env.js';

const prisma = new PrismaClient();

const sha256 = (value) =>
  crypto.createHash('sha256').update(value).digest('hex');

const toPublicUser = (user) => ({
  id: user.id,
  email: user.email,
  full_name: user.fullName,
  role: user.role,
});

async function issueTokens(user) {
  const jti = crypto.randomUUID();
  const access_token = jwt.sign(
    { sub: user.id, role: user.role, jti },
    env.JWT_ACCESS_SECRET,
    { expiresIn: `${env.JWT_ACCESS_TTL_MIN}m` }
  );
  const refreshToken = crypto.randomBytes(48).toString('hex');
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + env.REFRESH_TTL_DAYS * 86400000),
    },
  });
  return { access_token, refreshToken, expires_in: env.JWT_ACCESS_TTL_MIN * 60 };
}

export async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }
  const tokens = await issueTokens(user);
  return { ...tokens, user: toPublicUser(user) };
}

export async function refresh(token) {
  if (!token) {
    throw new AppError(401, 'TOKEN_INVALID', 'Missing refresh token');
  }
  const row = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });
  if (!row || row.revokedAt || row.expiresAt < new Date()) {
    throw new AppError(401, 'TOKEN_INVALID', 'Refresh token invalid or expired');
  }
  await prisma.refreshToken.update({
    where: { id: row.id },
    data: { revokedAt: new Date() },
  });
  if (!row.user.isActive) {
    throw new AppError(401, 'TOKEN_INVALID', 'User deactivated');
  }
  const tokens = await issueTokens(row.user);
  return { ...tokens, user: toPublicUser(row.user) };
}

export async function logout(token) {
  if (token) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

export async function me(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }
  return toPublicUser(user);
}

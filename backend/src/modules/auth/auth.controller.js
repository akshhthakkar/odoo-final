import { env } from '../../config/env.js';
import * as authService from './auth.service.js';

const REFRESH_COOKIE = 'refresh_token';
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/v1/auth',
  maxAge: env.REFRESH_TTL_DAYS * 86400000,
};

const getRefreshToken = (req) => req.cookies?.[REFRESH_COOKIE] || null;

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);
    res.json({
      success: true,
      data: {
        access_token: result.access_token,
        expires_in: result.expires_in,
        user: result.user,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const token = getRefreshToken(req);
    const result = await authService.refresh(token);
    res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);
    res.json({
      success: true,
      data: {
        access_token: result.access_token,
        expires_in: result.expires_in,
        user: result.user,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    await authService.logout(getRefreshToken(req));
    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const user = await authService.me(req.user.sub);
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

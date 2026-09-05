import * as authService from './auth.service.js';

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    // Regenerate session to prevent session fixation attacks
    req.session.regenerate((err) => {
      if (err) return next(err);

      req.session.userId = result.user.id;
      req.session.role = result.user.role;
      req.session.employeeId = result.user.employee_id;

      req.session.save((saveErr) => {
        if (saveErr) return next(saveErr);
        return res.status(200).json({
          success: true,
          data: result,
        });
      });
    });
  } catch (err) {
    next(err);
  }
}

export function logout(req, res, next) {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('sid');
      return res.status(200).json({ success: true, data: null });
    });
  } else {
    res.clearCookie('sid');
    return res.status(200).json({ success: true, data: null });
  }
}

export async function me(req, res, next) {
  try {
    const userId = req.user?.id || req.session?.userId;
    const result = await authService.me(userId);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}



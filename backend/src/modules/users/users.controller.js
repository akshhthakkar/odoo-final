import * as usersService from './users.service.js';

export async function listUsers(req, res, next) {
  try {
    const { role, is_active, search, page, limit } = req.query;

    let isActiveParsed;
    if (is_active === 'true') isActiveParsed = true;
    if (is_active === 'false') isActiveParsed = false;

    const result = await usersService.listUsers({
      role,
      is_active: isActiveParsed,
      search,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

export async function createUser(req, res, next) {
  try {
    const user = await usersService.createUser(req.body);
    return res.status(201).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const user = await usersService.updateUser(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    await usersService.resetPassword(req.params.id, req.body.new_password);
    return res.status(200).json({
      success: true,
      data: null,
    });
  } catch (err) {
    next(err);
  }
}

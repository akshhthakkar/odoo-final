import * as service from './payroll-config.service.js';

export async function list(req, res, next) {
  try {
    const structures = await service.listStructures();
    res.json({ success: true, data: structures });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const structure = await service.createStructure(req.body, req.user.id);
    res.status(201).json({ success: true, data: structure });
  } catch (err) {
    next(err);
  }
}

export async function get(req, res, next) {
  try {
    const structure = await service.getStructure(req.params.id);
    res.json({ success: true, data: structure });
  } catch (err) {
    next(err);
  }
}

export async function patch(req, res, next) {
  try {
    const structure = await service.patchStructure(req.params.id, req.body, req.user.id);
    res.json({ success: true, data: structure });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const result = await service.deleteStructure(req.params.id, req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function replaceRules(req, res, next) {
  try {
    const structure = await service.replaceRules(req.params.id, req.body, req.user.id);
    res.json({ success: true, data: structure });
  } catch (err) {
    next(err);
  }
}

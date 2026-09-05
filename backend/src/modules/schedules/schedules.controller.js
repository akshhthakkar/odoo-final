import * as schedulesService from './schedules.service.js';

export async function listSchedules(req, res, next) {
  try {
    const { search, page, limit } = req.query;
    const result = await schedulesService.listSchedules({ search, page, limit });
    return res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

export async function getSchedule(req, res, next) {
  try {
    const schedule = await schedulesService.getScheduleById(req.params.id);
    return res.status(200).json({
      success: true,
      data: schedule,
    });
  } catch (err) {
    next(err);
  }
}

export async function createSchedule(req, res, next) {
  try {
    const schedule = await schedulesService.createSchedule(req.body);
    return res.status(201).json({
      success: true,
      data: schedule,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateSchedule(req, res, next) {
  try {
    const schedule = await schedulesService.updateSchedule(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      data: schedule,
    });
  } catch (err) {
    next(err);
  }
}

export async function replaceScheduleLines(req, res, next) {
  try {
    const schedule = await schedulesService.replaceScheduleLines(req.params.id, req.body.lines);
    return res.status(200).json({
      success: true,
      data: schedule,
    });
  } catch (err) {
    next(err);
  }
}

import * as attendanceService from './attendance.service.js';

export async function listAttendance(req, res, next) {
  try {
    const { employee_id, status, department_id, date, from_date, to_date, search, page, limit } = req.query;

    const result = await attendanceService.listAttendance({
      employee_id,
      status,
      department_id,
      date,
      from_date,
      to_date,
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

export async function getAttendance(req, res, next) {
  try {
    const record = await attendanceService.getAttendanceById(req.params.id);
    return res.status(200).json({
      success: true,
      data: record,
    });
  } catch (err) {
    next(err);
  }
}

export async function createAttendance(req, res, next) {
  try {
    const record = await attendanceService.createAttendance(req.body, req.user?.role === 'EMPLOYEE' ? 'SELF' : 'HR');
    return res.status(201).json({
      success: true,
      data: record,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateAttendance(req, res, next) {
  try {
    const record = await attendanceService.updateAttendance(req.params.id, req.body, req.user?.role === 'EMPLOYEE' ? 'SELF' : 'HR');
    return res.status(200).json({
      success: true,
      data: record,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteAttendance(req, res, next) {
  try {
    const result = await attendanceService.deleteAttendance(req.params.id);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getSummary(req, res, next) {
  try {
    const summary = await attendanceService.getAttendanceSummary(req.query.date);
    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (err) {
    next(err);
  }
}

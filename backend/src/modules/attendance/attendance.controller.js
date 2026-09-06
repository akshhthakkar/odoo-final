import { AppError } from '../../shared/errors.js';
import * as attendanceService from './attendance.service.js';

export async function listAttendance(req, res, next) {
  try {
    const { employee_id, start_date, end_date, status, source, search, page, limit } = req.query;

    // Regular EMPLOYEE can only list their own attendance records
    let targetEmployeeId = employee_id;
    if (req.user?.role === 'EMPLOYEE') {
      targetEmployeeId = req.user.employee_id;
    }

    const result = await attendanceService.listAttendance({
      employee_id: targetEmployeeId,
      start_date,
      end_date,
      status,
      source,
      search,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
      meta: result.meta,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAttendance(req, res, next) {
  try {
    const record = await attendanceService.getAttendanceById(req.params.id);

    // Regular EMPLOYEE can only view their own record
    if (req.user?.role === 'EMPLOYEE' && record.employee_id !== req.user.employee_id) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied to this attendance record');
    }

    return res.status(200).json({
      success: true,
      data: record,
    });
  } catch (err) {
    next(err);
  }
}

export async function checkIn(req, res, next) {
  try {
    // Object-level authorization: an EMPLOYEE may only ever target their own
    // attendance. A client-supplied employee_id must NOT override the session.
    let employeeId;
    if (req.user?.role === 'EMPLOYEE') {
      employeeId = req.user.employee_id;
    } else {
      employeeId = req.body.employee_id || req.user?.employee_id;
    }
    if (!employeeId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'No employee associated with this account');
    }

    const source = req.user?.role === 'EMPLOYEE' ? 'SELF' : (req.body.source || 'HR');

    const record = await attendanceService.checkIn({
      employee_id: employeeId,
      check_in_time: req.body.check_in,
      source,
      actorId: req.user.id,
    });

    return res.status(201).json({
      success: true,
      data: record,
    });
  } catch (err) {
    next(err);
  }
}

export async function checkOut(req, res, next) {
  try {
    // Same self-scoping rule as check-in (see above).
    let employeeId;
    if (req.user?.role === 'EMPLOYEE') {
      employeeId = req.user.employee_id;
    } else {
      employeeId = req.body.employee_id || req.user?.employee_id;
    }
    if (!employeeId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'No employee associated with this account');
    }

    const record = await attendanceService.checkOut({
      employee_id: employeeId,
      check_out_time: req.body.check_out,
      actorId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      data: record,
    });
  } catch (err) {
    next(err);
  }
}

export async function createManualAttendance(req, res, next) {
  try {
    const record = await attendanceService.createManualAttendance({
      ...req.body,
      actorId: req.user.id,
    });
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
    const record = await attendanceService.updateAttendance(req.params.id, {
      ...req.body,
      actorId: req.user.id,
    });
    return res.status(200).json({
      success: true,
      data: record,
    });
  } catch (err) {
    next(err);
  }
}

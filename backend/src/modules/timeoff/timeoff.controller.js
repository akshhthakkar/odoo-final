import { AppError } from '../../shared/errors.js';
import * as timeoffService from './timeoff.service.js';

export async function listTypes(req, res, next) {
  try {
    const types = await timeoffService.listTypes();
    return res.status(200).json({ success: true, data: types });
  } catch (err) {
    next(err);
  }
}

export async function createType(req, res, next) {
  try {
    const type = await timeoffService.createType(req.body);
    return res.status(201).json({ success: true, data: type });
  } catch (err) {
    next(err);
  }
}

export async function listAllocations(req, res, next) {
  try {
    const { employee_id, type_id, status } = req.query;

    let targetEmployeeId = employee_id;
    if (req.user?.role === 'EMPLOYEE') {
      targetEmployeeId = req.user.employee_id;
    }

    const allocations = await timeoffService.listAllocations({
      employee_id: targetEmployeeId,
      type_id,
      status,
    });

    return res.status(200).json({ success: true, data: allocations });
  } catch (err) {
    next(err);
  }
}

export async function createAllocation(req, res, next) {
  try {
    const allocation = await timeoffService.createAllocation(req.body);
    return res.status(201).json({ success: true, data: allocation });
  } catch (err) {
    next(err);
  }
}

export async function listRequests(req, res, next) {
  try {
    const { employee_id, type_id, status, date_from, date_to } = req.query;

    let targetEmployeeId = employee_id;
    if (req.user?.role === 'EMPLOYEE') {
      targetEmployeeId = req.user.employee_id;
    }

    const requests = await timeoffService.listRequests({
      employee_id: targetEmployeeId,
      type_id,
      status,
      date_from,
      date_to,
    });

    return res.status(200).json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
}

export async function createRequest(req, res, next) {
  try {
    let employeeId = req.body.employee_id;
    if (req.user?.role === 'EMPLOYEE' || !employeeId) {
      employeeId = req.user.employee_id;
    }

    if (!employeeId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'No employee associated with this account');
    }

    const request = await timeoffService.createRequest({
      ...req.body,
      employee_id: employeeId,
    });

    return res.status(201).json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
}

export async function approveRequest(req, res, next) {
  try {
    const request = await timeoffService.approveRequest(req.params.id, req.user.id);
    return res.status(200).json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
}

export async function refuseRequest(req, res, next) {
  try {
    const request = await timeoffService.refuseRequest(
      req.params.id,
      req.user.id,
      req.body.refusal_reason
    );
    return res.status(200).json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
}

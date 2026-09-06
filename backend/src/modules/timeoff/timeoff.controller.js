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
    const type = await timeoffService.createType(req.body, req.user.id);
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
      targetEmployeeId = req.user.employee_id || '00000000-0000-0000-0000-000000000000';
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
    const allocation = await timeoffService.createAllocation(req.body, req.user.id);
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
      targetEmployeeId = req.user.employee_id || '00000000-0000-0000-0000-000000000000';
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

    const request = await timeoffService.createRequest(
      { ...req.body, employee_id: employeeId },
      req.user
    );

    return res.status(201).json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
}

// Shared handler for both the legacy PATCH routes and the contract's
// POST /requests/:id/status-changes - one canonical service implementation.
export async function approveRequest(req, res, next) {
  try {
    const result = await timeoffService.approveRequest(req.params.id, req.user);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function refuseRequest(req, res, next) {
  try {
    const result = await timeoffService.refuseRequest(
      req.params.id,
      req.user,
      req.body.refusal_reason
    );
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function statusChange(req, res, next) {
  try {
    const result =
      req.body.action === 'APPROVE'
        ? await timeoffService.approveRequest(req.params.id, req.user)
        : await timeoffService.refuseRequest(req.params.id, req.user, null);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function cancelRequest(req, res, next) {
  try {
    const result = await timeoffService.cancelRequest(req.params.id, req.user);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

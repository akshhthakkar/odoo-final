import * as employeeService from './employees.service.js';

export async function listEmployees(req, res, next) {
  try {
    const { department_id, job_id, status, manager_id, search, page, limit } = req.query;

    const result = await employeeService.listEmployees({
      department_id,
      job_id,
      status,
      manager_id,
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

export async function getEmployee(req, res, next) {
  try {
    let targetId = req.params.id;
    if (targetId === 'me') {
      if (!req.user.employee_id) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'No employee profile linked to current user' },
        });
      }
      targetId = req.user.employee_id;
    }

    if (req.user.role === 'EMPLOYEE') {
      if (!req.user.employee_id || req.user.employee_id !== targetId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied: Employees can only view their own profile' },
        });
      }
    } else {
      const HR_ROLES = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'];
      if (!HR_ROLES.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied' },
        });
      }
    }

    const employee = await employeeService.getEmployeeById(targetId);
    return res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (err) {
    next(err);
  }
}

export async function createEmployee(req, res, next) {
  try {
    const employee = await employeeService.createEmployee(req.body, req.user.id);
    return res.status(201).json({
      success: true,
      data: employee,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateEmployee(req, res, next) {
  try {
    let targetId = req.params.id;
    if (targetId === 'me') {
      if (!req.user.employee_id) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'No employee profile linked to current user' },
        });
      }
      targetId = req.user.employee_id;
    }

    let updateData = { ...req.body };

    if (req.user.role === 'EMPLOYEE') {
      if (!req.user.employee_id || req.user.employee_id !== targetId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied: Employees can only edit their own profile' },
        });
      }

      // Whitelist only personal & bank details for EMPLOYEE role
      const ALLOWED_EMPLOYEE_FIELDS = [
        'first_name',
        'last_name',
        'email',
        'phone',
        'date_of_birth',
        'gender',
        'address',
        'bank_account_name',
        'bank_account_number',
        'bank_ifsc',
      ];
      const filtered = {};
      for (const field of ALLOWED_EMPLOYEE_FIELDS) {
        if (updateData[field] !== undefined) {
          filtered[field] = updateData[field];
        }
      }
      updateData = filtered;
    } else {
      const HR_ROLES = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'];
      if (!HR_ROLES.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied' },
        });
      }
    }

    const employee = await employeeService.updateEmployee(targetId, updateData, req.user.id);
    return res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateEmployeeStatus(req, res, next) {
  try {
    const employee = await employeeService.updateEmployeeStatus(req.params.id, req.body, req.user.id);
    return res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (err) {
    next(err);
  }
}

export async function listDepartments(req, res, next) {
  try {
    const departments = await employeeService.listDepartments();
    return res.status(200).json({
      success: true,
      data: departments,
    });
  } catch (err) {
    next(err);
  }
}

export async function listJobs(req, res, next) {
  try {
    const jobs = await employeeService.listJobs();
    return res.status(200).json({
      success: true,
      data: jobs,
    });
  } catch (err) {
    next(err);
  }
}

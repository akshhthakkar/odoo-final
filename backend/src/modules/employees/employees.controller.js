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
    const employee = await employeeService.getEmployeeById(req.params.id);
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
    const employee = await employeeService.updateEmployee(req.params.id, req.body, req.user.id);
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

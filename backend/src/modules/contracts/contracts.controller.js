import * as contractsService from './contracts.service.js';

export async function listContracts(req, res, next) {
  try {
    const { employee_id, status, department_id, contract_type, search, page, limit } = req.query;

    const result = await contractsService.listContracts({
      employee_id,
      status,
      department_id,
      contract_type,
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

export async function getContract(req, res, next) {
  try {
    const contract = await contractsService.getContractById(req.params.id);
    return res.status(200).json({
      success: true,
      data: contract,
    });
  } catch (err) {
    next(err);
  }
}

export async function createContract(req, res, next) {
  try {
    const contract = await contractsService.createContract(req.body, req.user.id);
    return res.status(201).json({
      success: true,
      data: contract,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateContract(req, res, next) {
  try {
    const contract = await contractsService.updateContract(req.params.id, req.body, req.user.id);
    return res.status(200).json({
      success: true,
      data: contract,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateContractStatus(req, res, next) {
  try {
    const contract = await contractsService.updateContractStatus(req.params.id, req.body, req.user.id);
    return res.status(200).json({
      success: true,
      data: contract,
    });
  } catch (err) {
    next(err);
  }
}

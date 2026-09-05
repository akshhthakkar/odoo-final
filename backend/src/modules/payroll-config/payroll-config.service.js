import { AppError } from '../../shared/errors.js';
import { prisma } from '../../shared/prisma.js';
import { validateRules } from '../../engine/index.js';

const toPublicStructure = (structure) => ({
  id: structure.id,
  name: structure.name,
  code: structure.code,
  description: structure.description,
  is_default: structure.isDefault,
  is_active: structure.isActive,
  created_at: structure.createdAt,
  updated_at: structure.updatedAt,
});

const toPublicRule = (rule) => ({
  id: rule.id,
  code: rule.code,
  name: rule.name,
  category: rule.category,
  sequence: rule.sequence,
  computation_type: rule.computationType,
  fixed_amount: rule.fixedAmount == null ? null : Number(rule.fixedAmount),
  percentage: rule.percentage == null ? null : Number(rule.percentage),
  base_code: rule.baseCode,
  formula: rule.formula,
  condition: rule.condition,
  appears_on_payslip: rule.appearsOnPayslip,
  is_active: rule.isActive,
});

async function employeeCountsByStructure(structureIds = null) {
  const rows = await prisma.$queryRaw`
    SELECT salary_structure_id AS structure_id, COUNT(DISTINCT employee_id)::int AS employee_count
    FROM contracts
    WHERE salary_structure_id IS NOT NULL
    GROUP BY salary_structure_id
  `;
  const map = new Map(rows.map((r) => [r.structure_id, r.employee_count]));
  if (!structureIds) return map;
  return new Map(structureIds.map((id) => [id, map.get(id) || 0]));
}

async function setExclusiveDefault(tx, structureId = null) {
  await tx.salaryStructure.updateMany({
    where: { isDefault: true, ...(structureId ? { id: { not: structureId } } : {}) },
    data: { isDefault: false },
  });
}

async function audit(tx, { actorId, action, entityId, payload }) {
  await tx.auditLog.create({
    data: { actorId, action, entity: 'salary_structure', entityId, payload: payload ?? undefined },
  });
}

export async function listStructures() {
  const [structures, counts] = await Promise.all([
    prisma.salaryStructure.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: {
        _count: { select: { rules: true } },
        rules: { orderBy: [{ sequence: 'asc' }, { code: 'asc' }] },
      },
    }),
    employeeCountsByStructure(),
  ]);
  return structures.map((structure) => ({
    ...toPublicStructure(structure),
    rule_count: structure._count.rules,
    employee_count: counts.get(structure.id) || 0,
    rules: (structure.rules || []).map(toPublicRule),
  }));
}

export async function createStructure(data, actorId) {
  try {
    return await prisma.$transaction(async (tx) => {
      if (data.is_default) await setExclusiveDefault(tx);
      const structure = await tx.salaryStructure.create({
        data: {
          name: data.name,
          code: data.code,
          description: data.description ?? null,
          isDefault: data.is_default ?? false,
          isActive: data.is_active ?? true,
        },
      });
      await audit(tx, {
        actorId,
        action: 'SALARY_STRUCTURE_CREATED',
        entityId: structure.id,
        payload: { code: structure.code, name: structure.name },
      });
      return { ...toPublicStructure(structure), rule_count: 0, employee_count: 0 };
    });
  } catch (err) {
    if (err.code === 'P2002') {
      throw new AppError(409, 'DUPLICATE', `Structure code '${data.code}' already exists`);
    }
    throw err;
  }
}

export async function getStructure(id) {
  const structure = await prisma.salaryStructure.findUnique({
    where: { id },
    include: {
      rules: { orderBy: [{ sequence: 'asc' }, { code: 'asc' }] },
    },
  });
  if (!structure) {
    throw new AppError(404, 'NOT_FOUND', 'Salary structure not found');
  }
  const counts = await employeeCountsByStructure([id]);
  return {
    ...toPublicStructure(structure),
    rule_count: structure.rules.length,
    employee_count: counts.get(id) || 0,
    rules: structure.rules.map(toPublicRule),
  };
}

export async function patchStructure(id, data, actorId) {
  const existing = await prisma.salaryStructure.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Salary structure not found');
  }
  return prisma.$transaction(async (tx) => {
    if (data.is_default) await setExclusiveDefault(tx, id);
    const structure = await tx.salaryStructure.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.is_default !== undefined ? { isDefault: data.is_default } : {}),
        ...(data.is_active !== undefined ? { isActive: data.is_active } : {}),
      },
    });
    await audit(tx, {
      actorId,
      action: 'SALARY_STRUCTURE_UPDATED',
      entityId: id,
      payload: data,
    });
    return toPublicStructure(structure);
  });
}

export async function deleteStructure(id, actorId) {
  const existing = await prisma.salaryStructure.findUnique({
    where: { id },
    include: { _count: { select: { contracts: true, payslips: true } } },
  });
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Salary structure not found');
  }
  if (existing._count.contracts > 0 || existing._count.payslips > 0) {
    throw new AppError(
      409,
      'RESOURCE_HAS_DEPENDENCIES',
      'Structure has assigned employees or historical payslips; deactivate it with PATCH instead'
    );
  }
  return prisma.$transaction(async (tx) => {
    await tx.salaryStructure.delete({ where: { id } });
    await audit(tx, {
      actorId,
      action: 'SALARY_STRUCTURE_DELETED',
      entityId: id,
      payload: { code: existing.code },
    });
    return { id };
  });
}

export async function replaceRules(structureId, ruleSet, actorId) {
  const structure = await prisma.salaryStructure.findUnique({ where: { id: structureId } });
  if (!structure) {
    throw new AppError(404, 'NOT_FOUND', 'Salary structure not found');
  }

  const validation = validateRules(ruleSet);
  if (!validation.valid) {
    throw new AppError(422, 'UNPROCESSABLE', 'Invalid rule set', validation.errors);
  }

  const rules = await prisma.$transaction(async (tx) => {
    await tx.salaryRule.deleteMany({ where: { structureId } });
    await tx.salaryRule.createMany({
      data: ruleSet.map((rule) => ({
        structureId,
        code: rule.code,
        name: rule.name,
        category: rule.category,
        sequence: rule.sequence,
        computationType: rule.computation_type,
        fixedAmount: rule.fixed_amount ?? null,
        percentage: rule.percentage ?? null,
        baseCode: rule.base_code ?? null,
        formula: rule.formula ?? null,
        condition: rule.condition ?? null,
        appearsOnPayslip: rule.appears_on_payslip ?? true,
      })),
    });
    await audit(tx, {
      actorId,
      action: 'SALARY_RULES_REPLACED',
      entityId: structureId,
      payload: { structure_code: structure.code, rule_count: ruleSet.length },
    });
    return tx.salaryRule.findMany({
      where: { structureId },
      orderBy: [{ sequence: 'asc' }, { code: 'asc' }],
    });
  });

  return {
    ...toPublicStructure(structure),
    rule_count: rules.length,
    rules: rules.map(toPublicRule),
  };
}

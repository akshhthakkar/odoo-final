import { z } from 'zod';

const CODE_REGEX = /^[A-Z][A-Z0-9_]{0,19}$/;

export const createStructureSchema = z.object({
  name: z.string().min(1).max(120),
  code: z.string().regex(CODE_REGEX),
  description: z.string().max(500).nullable().optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export const patchStructureSchema = createStructureSchema
  .partial()
  .omit({ code: true });

export const replaceRulesSchema = z.array(
  z.object({
    code: z.string().regex(CODE_REGEX),
    name: z.string().min(1).max(120),
    category: z.enum([
      'BASIC',
      'ALLOWANCE',
      'GROSS',
      'DEDUCTION',
      'EMPLOYER_CONTRIB',
      'NET',
    ]),
    sequence: z.number().int().positive(),
    computation_type: z.enum(['FIXED', 'PERCENTAGE', 'FORMULA']),
    fixed_amount: z.number().nonnegative().nullable().optional(),
    percentage: z.number().min(0).max(100).nullable().optional(),
    base_code: z.string().regex(CODE_REGEX).nullable().optional(),
    formula: z.string().max(500).nullable().optional(),
    condition: z.string().max(500).nullable().optional(),
    appears_on_payslip: z.boolean().optional(),
  })
);

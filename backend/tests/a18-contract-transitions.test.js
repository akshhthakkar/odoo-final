import { describe, it, expect, vi } from 'vitest';
import * as contractsService from '../src/modules/contracts/contracts.service.js';
import { prisma } from '../src/shared/prisma.js';

const validId = '11111111-1111-1111-1111-111111111111';
const validEmpId = '22222222-2222-2222-2222-222222222222';

describe('A-18: Contract Status Transition Rules', () => {
  it('allows DRAFT -> ACTIVE transition when no overlap exists', async () => {
    vi.spyOn(prisma.contract, 'findUnique').mockResolvedValueOnce({
      id: validId,
      employeeId: validEmpId,
      status: 'DRAFT',
      startDate: new Date('2026-01-01'),
      endDate: null,
    });
    vi.spyOn(prisma.contract, 'findFirst').mockResolvedValueOnce(null); // No overlap
    vi.spyOn(prisma.contract, 'update').mockImplementationOnce(async ({ data }) => ({
      id: validId,
      employeeId: validEmpId,
      status: data.status,
      startDate: new Date('2026-01-01'),
      endDate: null,
      wage: 50000,
      currency: 'INR',
      contractType: 'FULL_TIME',
    }));

    const result = await contractsService.updateContractStatus(validId, { status: 'ACTIVE' });
    expect(result.status).toBe('ACTIVE');
  });

  it('allows ACTIVE -> EXPIRED transition', async () => {
    vi.spyOn(prisma.contract, 'findUnique').mockResolvedValueOnce({
      id: validId,
      employeeId: validEmpId,
      status: 'ACTIVE',
      startDate: new Date('2026-01-01'),
      endDate: null,
    });
    vi.spyOn(prisma.contract, 'update').mockImplementationOnce(async ({ data }) => ({
      id: validId,
      employeeId: validEmpId,
      status: data.status,
      startDate: new Date('2026-01-01'),
      endDate: null,
      wage: 50000,
      currency: 'INR',
      contractType: 'FULL_TIME',
    }));

    const result = await contractsService.updateContractStatus(validId, { status: 'EXPIRED' });
    expect(result.status).toBe('EXPIRED');
  });

  it('rejects forbidden transition from EXPIRED -> ACTIVE with 409 STATE_ERROR', async () => {
    vi.spyOn(prisma.contract, 'findUnique').mockResolvedValueOnce({
      id: validId,
      employeeId: validEmpId,
      status: 'EXPIRED',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-06-30'),
    });

    await expect(
      contractsService.updateContractStatus(validId, { status: 'ACTIVE' })
    ).rejects.toMatchObject({
      status: 409,
      code: 'STATE_ERROR',
      message: 'Cannot transition contract status from EXPIRED to ACTIVE',
    });
  });

  it('rejects forbidden transition from CANCELLED -> ACTIVE with 409 STATE_ERROR', async () => {
    vi.spyOn(prisma.contract, 'findUnique').mockResolvedValueOnce({
      id: validId,
      employeeId: validEmpId,
      status: 'CANCELLED',
      startDate: new Date('2026-01-01'),
      endDate: null,
    });

    await expect(
      contractsService.updateContractStatus(validId, { status: 'ACTIVE' })
    ).rejects.toMatchObject({
      status: 409,
      code: 'STATE_ERROR',
      message: 'Cannot transition contract status from CANCELLED to ACTIVE',
    });
  });
});

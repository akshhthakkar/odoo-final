import { describe, it, expect, vi } from 'vitest';
import * as timeoffService from '../src/modules/timeoff/timeoff.service.js';
import { prisma } from '../src/shared/prisma.js';

const reqId = '11111111-1111-1111-1111-111111111111';
const empId = '22222222-2222-2222-2222-222222222222';
const typeId = '33333333-3333-3333-3333-333333333333';
const allocId = '44444444-4444-4444-4444-444444444444';
const approverEmpId = '55555555-5555-5555-5555-555555555555';
const approverUserId = '66666666-6666-6666-6666-666666666666';

describe('A-20: Deterministic Allocation Selection & Transactional Approval', () => {
  it('selects the earliest applicable allocation deterministically (orderBy validFrom asc, createdAt asc)', async () => {
    const mockRequest = {
      id: reqId,
      employeeId: empId,
      typeId,
      dateFrom: new Date('2026-06-01'),
      dateTo: new Date('2026-06-03'),
      days: 3,
      status: 'TO_APPROVE',
      type: {
        id: typeId,
        name: 'Casual Leave',
        code: 'CL',
        requiresAllocation: true,
      },
    };

    let selectedOrder = null;

    vi.spyOn(prisma.timeOffRequest, 'findUnique').mockImplementation(async () => mockRequest);

    const mockTx = {
      timeOffRequest: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({
          ...mockRequest,
          status: 'APPROVED',
          approverId: approverUserId,
          decidedAt: new Date(),
          employee: { id: empId, employeeCode: 'EMP-001', firstName: 'Rahul', lastName: 'Verma' },
          type: { id: typeId, name: 'Casual Leave', code: 'CL' },
        }),
      },
      timeOffAllocation: {
        findFirst: vi.fn().mockImplementation(({ orderBy }) => {
          selectedOrder = orderBy;
          return Promise.resolve({
            id: allocId,
            employeeId: empId,
            typeId,
            validFrom: new Date('2026-01-01'),
            validTo: new Date('2026-12-31'),
            allocatedDays: 10,
            takenDays: 2,
          });
        }),
        findUnique: vi.fn().mockResolvedValue({
          allocatedDays: 10,
          takenDays: 5,
        }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
      $executeRaw: vi.fn().mockResolvedValue(1),
    };

    vi.spyOn(prisma, '$transaction').mockImplementationOnce(async (callback) => {
      return await callback(mockTx);
    });

    const approver = { id: approverUserId, employee_id: approverEmpId, role: 'HR_MANAGER' };
    const result = await timeoffService.approveRequest(reqId, approver);
    expect(result.request.status).toBe('APPROVED');
    expect(selectedOrder).toEqual([
      { validFrom: 'asc' },
      { createdAt: 'asc' },
    ]);
  });

  it('rejects self-approval with 403 FORBIDDEN when approver is the requester', async () => {
    const mockRequest = {
      id: reqId,
      employeeId: empId,
      typeId,
      dateFrom: new Date('2026-06-01'),
      dateTo: new Date('2026-06-03'),
      days: 3,
      status: 'TO_APPROVE',
      type: {
        id: typeId,
        requiresAllocation: true,
      },
    };

    vi.spyOn(prisma.timeOffRequest, 'findUnique').mockImplementation(async () => mockRequest);

    const sameUserApprover = { id: approverUserId, employee_id: empId, role: 'HR_MANAGER' };

    await expect(
      timeoffService.approveRequest(reqId, sameUserApprover)
    ).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
      message: 'You cannot approve your own leave request',
    });
  });
});

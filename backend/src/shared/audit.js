// Shared audit helper: one place that writes audit rows without storing any
// credentials or authentication material. `tx` may be a Prisma transaction
// client or the shared prisma instance.
export function writeAudit(tx, { actorId, action, entity, entityId, payload }) {
  return tx.auditLog.create({
    data: {
      actorId: actorId ?? null,
      action,
      entity,
      entityId: entityId ?? null,
      payload: payload ?? undefined,
    },
  });
}

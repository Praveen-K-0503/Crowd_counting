import { db } from "../db/pool.js";

export async function writeAuditLog(input: {
  actorUserId?: string | null;
  entityType: string;
  entityId?: string | null;
  action: string;
  details?: Record<string, unknown>;
}) {
  await db.query(
    `
      INSERT INTO audit_logs (
        actor_user_id,
        entity_type,
        entity_id,
        action,
        details
      )
      VALUES ($1, $2, $3, $4, $5::jsonb)
    `,
    [
      input.actorUserId ?? null,
      input.entityType,
      input.entityId ?? null,
      input.action,
      JSON.stringify(input.details ?? {}),
    ],
  );
}

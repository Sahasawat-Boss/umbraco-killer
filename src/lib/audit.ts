import { db } from "./db";

export type AuditAction =
  | "Create"
  | "Save"
  | "Publish"
  | "Unpublish"
  | "Move"
  | "Copy"
  | "Sort"
  | "Trash"
  | "Restore"
  | "Delete"
  | "Rollback"
  | "Login"
  | "LoginFailed";

export async function audit(
  entityType: string,
  entityId: string,
  action: AuditAction,
  userId: string | null,
  comment = "",
) {
  await db.auditEntry.create({ data: { entityType, entityId, action, userId, comment } });
}

-- name: CreateAuditLog :one
INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetAuditLogs :many
SELECT a.*, u.name as user_name FROM audit_logs a
LEFT JOIN users u ON a.user_id = u.id
ORDER BY a.created_at DESC;

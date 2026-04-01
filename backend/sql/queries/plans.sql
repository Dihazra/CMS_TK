-- name: UpsertPlan :one
-- Manajer only: create or update plan for a given date
INSERT INTO plans (id, pic, pillar, content_id, plan_date, status, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
ON CONFLICT (plan_date) DO UPDATE
    SET pic        = EXCLUDED.pic,
        pillar     = EXCLUDED.pillar,
        content_id = EXCLUDED.content_id,
        status     = EXCLUDED.status,
        updated_at = NOW()
RETURNING id, pic, pillar, content_id, plan_date, status, created_at, updated_at;

-- name: GetPlanByDate :one
SELECT id, pic, pillar, content_id, plan_date, status, created_at, updated_at FROM plans
WHERE plan_date = $1;

-- name: GetPlansByDateRange :many
SELECT id, pic, pillar, content_id, plan_date, status, created_at, updated_at FROM plans
WHERE plan_date >= $1 AND plan_date <= $2
ORDER BY plan_date ASC;

-- name: GetAllPlans :many
SELECT id, pic, pillar, content_id, plan_date, status, created_at, updated_at FROM plans
ORDER BY plan_date ASC;

-- name: GetAvailablePlans :many
-- Plan yang belum punya content_id (tersedia untuk ditautkan Kreator saat submit)
SELECT id, pic, pillar, content_id, plan_date, status, created_at, updated_at FROM plans
WHERE content_id IS NULL AND status = 'Planned'
ORDER BY plan_date ASC;

-- name: AssignContentAndSetReview :one
-- Kreator submit: tautkan content ke plan DAN ubah status plan → Review
UPDATE plans
SET content_id = $2, status = 'Review', updated_at = NOW()
WHERE plan_date = $1
RETURNING id, pic, pillar, content_id, plan_date, status, created_at, updated_at;

-- name: UpdatePlanStatusByContentID :one
-- Update plan status berdasarkan content_id (dipakai saat Approved/Revision)
UPDATE plans
SET status = $2, updated_at = NOW()
WHERE content_id = $1
RETURNING id, pic, pillar, content_id, plan_date, status, created_at, updated_at;

-- name: UpdatePlanStatus :one
UPDATE plans
SET status = $2, updated_at = NOW()
WHERE id = $1
RETURNING id, pic, pillar, content_id, plan_date, status, created_at, updated_at;

-- name: DeletePlan :exec
DELETE FROM plans WHERE plan_date = $1;

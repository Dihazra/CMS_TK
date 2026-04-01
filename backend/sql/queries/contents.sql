-- name: CreateContent :one
INSERT INTO contents (id, title, category, content, feedback, author_id, status, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, 'Draft', NOW(), NOW())
RETURNING id, title, category, content, feedback, author_id, status, created_at, updated_at;

-- name: GetContents :many
SELECT c.id, c.title, c.category, c.content, c.feedback, c.author_id, c.status, c.created_at, c.updated_at,
       u.name as author_name
FROM contents c
JOIN users u ON c.author_id = u.id
ORDER BY c.created_at DESC;

-- name: GetContentByID :one
SELECT c.id, c.title, c.category, c.content, c.feedback, c.author_id, c.status, c.created_at, c.updated_at,
       u.name as author_name
FROM contents c
JOIN users u ON c.author_id = u.id
WHERE c.id = $1;

-- name: UpdateContent :one
UPDATE contents
SET title = $2, category = $3, content = $4, updated_at = NOW()
WHERE id = $1
RETURNING id, title, category, content, feedback, author_id, status, created_at, updated_at;

-- name: UpdateContentStatus :one
UPDATE contents
SET status = $2, updated_at = NOW()
WHERE id = $1
RETURNING id, title, category, content, feedback, author_id, status, created_at, updated_at;

-- name: ReviewContent :one
-- Manajer: approve atau minta revisi (feedback wajib jika Revision)
UPDATE contents
SET status = $2, feedback = $3, updated_at = NOW()
WHERE id = $1
RETURNING id, title, category, content, feedback, author_id, status, created_at, updated_at;

-- name: DeleteContent :exec
DELETE FROM contents WHERE id = $1;

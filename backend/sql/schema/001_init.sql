-- Schema lengkap CMS TK v2 (Bounded Context)
-- Drop dan recreate semua table

DROP TABLE IF EXISTS plans;
DROP TABLE IF EXISTS contents;
DROP TABLE IF EXISTS users;

-- ─── User Management ───────────────────────────────────────────────────────
CREATE TABLE users (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Manajer', 'Kreator')),
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Offline')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Content Management ─────────────────────────────────────────────────────
-- Status lifecycle: Draft → Review → Approved | Revision
CREATE TABLE contents (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,              -- Education, Relatable, Soal UKOM, Product/Promo
    content TEXT NOT NULL,
    feedback TEXT,                               -- Required when status = Revision
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft'
        CHECK (status IN ('Draft', 'Review', 'Revision', 'Approved')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── Planning Management ────────────────────────────────────────────────────
-- Plan terhubung ke Content; setelah Approved plan dikunci
CREATE TABLE plans (
    id UUID PRIMARY KEY,
    pic VARCHAR(255) NOT NULL DEFAULT '-',       -- Person in Charge
    pillar VARCHAR(100) NOT NULL DEFAULT '-',    -- Content Pillar label
    content_id UUID REFERENCES contents(id) ON DELETE SET NULL,
    plan_date DATE NOT NULL UNIQUE,              -- Satu plan per hari
    status VARCHAR(50) NOT NULL DEFAULT 'Planned'
        CHECK (status IN ('Planned', 'In Progress', 'Completed')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

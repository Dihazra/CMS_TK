-- Migration v3: Plan status lifecycle update
-- Plan status: Planned → Review (saat creator submit) → Completed (saat Approved)
-- Jika Revision: status kembali ke Planned

DROP TABLE IF EXISTS plans;
DROP TABLE IF EXISTS contents;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Manajer', 'Kreator')),
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Offline')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE contents (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    feedback TEXT,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft'
        CHECK (status IN ('Draft', 'Review', 'Revision', 'Approved')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Plan status lifecycle: Planned → Review (saat konten disubmit) → Completed (saat Approved)
-- Jika Revision: status kembali ke Planned
CREATE TABLE plans (
    id UUID PRIMARY KEY,
    pic VARCHAR(255) NOT NULL DEFAULT '-',
    pillar VARCHAR(100) NOT NULL DEFAULT '-',
    content_id UUID REFERENCES contents(id) ON DELETE SET NULL,
    plan_date DATE NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'Planned'
        CHECK (status IN ('Planned', 'Review', 'Completed')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

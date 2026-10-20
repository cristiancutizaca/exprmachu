-- ─── Extensiones ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ─── Permisos de esquema ──────────────────────────────────────────────────────
GRANT ALL PRIVILEGES ON DATABASE grael_db TO grael_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO grael_user;

-- Comentario del esquema
COMMENT ON DATABASE grael_db IS 'GRAEL - Sistema de Gestión Logística v1.0';

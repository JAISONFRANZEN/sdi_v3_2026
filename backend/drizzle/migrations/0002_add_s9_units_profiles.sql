-- ═══════════════════════════════════════════════════════════════════════════════
-- SDI v4 — Migração 0002: S9, Units, UserProfiles, Versionamento
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── TABELA: user_profiles ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `user_profiles` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `user_id` int NOT NULL UNIQUE,
  `matricula` varchar(50),
  `cargo` varchar(255),
  `lotacao` varchar(255),
  `comarca` varchar(255),
  `telefone` varchar(20),
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `user_profiles_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- ─── TABELA: units ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `units` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `code` varchar(50),
  `type` enum(
    'GAECO',
    'Isolada',
    'Administrativo',
    'Apoio Técnico',
    'Fórum de Justiça',
    'Fórum de Justiça - Ala',
    'Fórum de Justiça - Sala de apoio',
    'Terreno',
    'Residência',
    'Outro'
  ) NOT NULL,
  `status` enum('ativa', 'inativa', 'em_comissionamento') NOT NULL DEFAULT 'ativa',
  `comarca` varchar(255),
  `endereco` text,
  `latitude` decimal(10, 7),
  `longitude` decimal(10, 7),
  `is_isolated` boolean DEFAULT false,
  `distance_from_sede` decimal(6, 2),
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── ALTERAÇÃO: items — adicionar coluna is_inverted ─────────────────────────

ALTER TABLE `items` ADD COLUMN `is_inverted` boolean DEFAULT false;

-- ─── ALTERAÇÃO: inspections — adicionar campos de versionamento e unit_id ────

ALTER TABLE `inspections` ADD COLUMN `unit_id` int;
ALTER TABLE `inspections` ADD COLUMN `version` int NOT NULL DEFAULT 1;
ALTER TABLE `inspections` ADD COLUMN `previous_inspection_id` int;

ALTER TABLE `inspections` ADD CONSTRAINT `inspections_unit_id_fk`
  FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE SET NULL;

-- ─── ÍNDICES ─────────────────────────────────────────────────────────────────

CREATE INDEX `units_comarca_idx` ON `units`(`comarca`);
CREATE INDEX `units_type_idx` ON `units`(`type`);
CREATE INDEX `units_status_idx` ON `units`(`status`);
CREATE INDEX `inspections_unit_id_idx` ON `inspections`(`unit_id`);
CREATE INDEX `inspections_version_idx` ON `inspections`(`unit_id`, `checklist_id`, `version`);

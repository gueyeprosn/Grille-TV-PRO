-- Script SQL pour supprimer toutes les tables et types
-- À exécuter avec les droits administrateur de la base de données
-- ATTENTION: Ce script supprime TOUTES les données!

-- Désactiver temporairement les contraintes
SET session_replication_role = 'replica';

-- Supprimer les tables dans l'ordre inverse des dépendances
DROP TABLE IF EXISTS "role_permissions" CASCADE;
DROP TABLE IF EXISTS "permissions" CASCADE;
DROP TABLE IF EXISTS "shiftlogs" CASCADE;
DROP TABLE IF EXISTS "adlogs" CASCADE;
DROP TABLE IF EXISTS "deviations" CASCADE;
DROP TABLE IF EXISTS "incidents" CASCADE;
DROP TABLE IF EXISTS "programs" CASCADE;
DROP TABLE IF EXISTS "grids" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;

-- Supprimer les types enum
DROP TYPE IF EXISTS "OpStatus" CASCADE;
DROP TYPE IF EXISTS "ProgramType" CASCADE;
DROP TYPE IF EXISTS "GridStatus" CASCADE;
DROP TYPE IF EXISTS "GridType" CASCADE;
DROP TYPE IF EXISTS "Role" CASCADE;

-- Réactiver les contraintes
SET session_replication_role = 'origin';


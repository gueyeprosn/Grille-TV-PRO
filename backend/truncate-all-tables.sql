-- Script SQL pour vider toutes les tables (sans les supprimer)
-- ATTENTION: Ce script supprime TOUTES les données mais garde les tables!

-- Désactiver temporairement les contraintes
SET session_replication_role = 'replica';

-- Vider les tables dans l'ordre inverse des dépendances
TRUNCATE TABLE "role_permissions" CASCADE;
TRUNCATE TABLE "permissions" CASCADE;
TRUNCATE TABLE "shiftlogs" CASCADE;
TRUNCATE TABLE "adlogs" CASCADE;
TRUNCATE TABLE "deviations" CASCADE;
TRUNCATE TABLE "incidents" CASCADE;
TRUNCATE TABLE "programs" CASCADE;
TRUNCATE TABLE "grids" CASCADE;
TRUNCATE TABLE "users" CASCADE;

-- Réactiver les contraintes
SET session_replication_role = 'origin';


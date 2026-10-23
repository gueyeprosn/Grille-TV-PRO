-- Script SQL pour mettre à jour les types de programmes
-- Note: typeDiffusion n'est pas stocké dans la base de données Prisma
-- Ce script est pour référence si vous avez des données JSON ou autres à migrer

-- Si vous avez une colonne typeDiffusion dans une table temporaire ou de migration:
-- UPDATE programs 
-- SET typeDiffusion = 'Rediffusion' 
-- WHERE typeDiffusion IN ('Replay', 'Rediffusion');

-- UPDATE programs 
-- SET typeDiffusion = 'PAD' 
-- WHERE typeDiffusion = 'Autre';

-- UPDATE programs 
-- SET typeDiffusion = 'Pub' 
-- WHERE typeDiffusion IN ('Publicité', 'Commercial');

-- UPDATE programs 
-- SET typeDiffusion = 'Plateau commercial' 
-- WHERE typeDiffusion = 'Plateau commercial';

-- Note: Dans Prisma, seul le champ "type" (enum) est stocké:
-- - LIVE, REPLAY, PAD, ADS, SPECIAL
-- Le typeDiffusion est géré côté frontend et mappé vers le type Prisma


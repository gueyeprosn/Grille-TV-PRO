// Configuration PM2 de l'API GrilleTV Pro V4.
//
// Extension .cjs volontaire : backend/package.json déclare "type": "module",
// et PM2 (6.0.13) ne sait pas lire une configuration ESM `export default` —
// il échoue sur « No script path ». Le format CommonJS est donc le seul fiable.
//
// L'API est lancée compilée, avec node : plus de tsx ni de rechargement à chaud
// en production, le code est donc contrôlé par le compilateur avant d'être
// servi. Exécuter `npm run build` avant `pm2 start ecosystem.config.cjs`.
//
// Aucun chemin absolu : cwd est déduit de l'emplacement de ce fichier, et les
// journaux vont dans le dossier PM2 par défaut de l'utilisateur (~/.pm2/logs).
module.exports = {
  apps: [{
    name: 'grilletv-backend',
    script: 'dist/server.js',
    cwd: __dirname,
    env: {
      NODE_ENV: 'production'
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    instances: 1,
    exec_mode: 'fork'
  }]
}

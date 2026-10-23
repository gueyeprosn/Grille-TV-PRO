/**
 * Module Telegram Notifier avec throttling et routing
 */

import https from 'https';
import { getNotificationRules } from './store-v3-prisma.js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_DEFAULT_CHAT_ID = process.env.TELEGRAM_DEFAULT_CHAT_ID;

// Cache pour throttling
const throttleCache = new Map();

/**
 * Envoie un message Telegram
 */
export async function sendTelegramMessage(chatId, text, options = {}) {
  if (!TELEGRAM_BOT_TOKEN || !chatId) {
    console.warn('[Telegram] Bot token ou chatId manquant');
    return;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_notification: options.silent || false,
    ...options,
  };

  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const urlObj = new URL(url);

    const req = https.request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(body));
          } else {
            console.error('[Telegram] Erreur:', body);
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Vérifie si un événement doit être throttlé
 */
function shouldThrottle(eventKey, throttlingSec) {
  const now = Date.now();
  const lastSent = throttleCache.get(eventKey);
  
  if (!lastSent) {
    throttleCache.set(eventKey, now);
    return false;
  }
  
  const elapsed = (now - lastSent) / 1000;
  if (elapsed >= throttlingSec) {
    throttleCache.set(eventKey, now);
    return false;
  }
  
  return true;
}

/**
 * Formate un message selon le type d'événement
 */
function formatMessage(event, data) {
  switch (event) {
    case 'GRID_PUBLISHED':
      return `✅ <b>Grille publiée</b>\n\n${data.grid.name}\nType: ${data.grid.type}\nDu ${data.grid.startDate} au ${data.grid.endDate}`;

    case 'PROGRAM_CREATED':
      return `📺 <b>Nouveau programme</b>\n\n${data.program.title}\n${data.program.startTime} - ${data.program.endTime}\nStatut: ${data.program.opStatus}`;

    case 'PROGRAM_UPDATED':
      return `✏️ <b>Programme modifié</b>\n\n${data.program.title}\n${data.program.startTime} - ${data.program.endTime}`;

    case 'PROGRAM_STATUS_CHANGED':
      return `🔄 <b>Changement de statut</b>\n\n${data.program.title}\n${data.oldStatus} → ${data.program.opStatus}`;

    case 'INCIDENT_CRITICAL':
      return `🚨 <b>INCIDENT CRITIQUE</b> (${data.incident.area})\n\n${data.incident.description}\nImpact: ${data.incident.impact}\nAction: ${data.incident.actionTaken || 'En cours'}\n#INC-${data.incident.id.slice(0, 4)}`;

    case 'INCIDENT_CREATED':
      return `⚠️ <b>Incident</b> (${data.incident.severity})\n\n${data.incident.description}\nZone: ${data.incident.area}`;

    case 'AD_MISSED':
      return `❌ <b>PUB MANQUÉE</b>\n\nAnnonceur: ${data.adLog.advertiser}\nSpot: ${data.adLog.spotTitle}\nDurée: ${data.adLog.durationSec}s\n#AD-${data.adLog.id.slice(0, 4)}`;

    case 'AD_PLANNED':
      return `📢 <b>Pub planifiée</b>\n\n${data.adLog.advertiser} - ${data.adLog.spotTitle}\n${new Date(data.adLog.timePlanned).toLocaleString('fr-FR')}`;

    case 'DEVIATION_CREATED':
      return `📋 <b>Écart signalé</b>\n\nType: ${data.deviation.type}\nProgramme: ${data.deviation.planned.title}\nJustification: ${data.deviation.justification}`;

    default:
      return `📢 <b>Notification</b>\n\nÉvénement: ${event}`;
  }
}

/**
 * Route un événement vers les groupes Telegram appropriés
 */
export async function notifyTelegram(event, data) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('[Telegram] Bot token non configuré');
    return;
  }

  try {
    const rules = await getNotificationRules();
    // S'assurer que rules est un tableau
    if (!Array.isArray(rules)) {
      console.warn('[Telegram] getNotificationRules() n\'a pas retourné un tableau, utilisation d\'un tableau vide');
      const message = formatMessage(event, data);
      if (TELEGRAM_DEFAULT_CHAT_ID) {
        await sendTelegramMessage(TELEGRAM_DEFAULT_CHAT_ID, message);
      }
      return;
    }
    const activeRules = rules.filter(
      (r) => r.enabled && ((r.eventType || r.event) === event || (r.eventType || r.event) === '*')
    );

    if (activeRules.length === 0 && TELEGRAM_DEFAULT_CHAT_ID) {
      // Fallback sur chat par défaut
      const message = formatMessage(event, data);
      await sendTelegramMessage(TELEGRAM_DEFAULT_CHAT_ID, message);
      return;
    }

    for (const rule of activeRules) {
      const eventKey = `${event}:${rule.chatId}`;
      const throttlingSec = rule.throttleMin ? rule.throttleMin * 60 : (rule.throttlingSec || 30);
      
      if (shouldThrottle(eventKey, throttlingSec)) {
        console.log(`[Telegram] Événement throttlé: ${eventKey}`);
        continue;
      }

      const message = formatMessage(event, data);
      await sendTelegramMessage(rule.chatId, message);
    }
  } catch (error) {
    console.error('[Telegram] Erreur lors de l\'envoi:', error);
  }
}

/**
 * Nettoie le cache de throttling (appeler périodiquement)
 */
export function clearThrottleCache() {
  throttleCache.clear();
}

// Nettoyage automatique toutes les heures
setInterval(clearThrottleCache, 3600000);


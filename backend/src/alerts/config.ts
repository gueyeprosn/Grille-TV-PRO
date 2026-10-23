/**
 * Configuration du système d'alertes broadcast
 */

export interface AlertConfig {
  telegram: {
    enabled: boolean
    botToken: string | null
    chatId: string | null
  }
  email: {
    enabled: boolean
    smtpHost: string | null
    smtpPort: number | null
    smtpUser: string | null
    smtpPassword: string | null
    fromEmail: string | null
    toEmails: string[] // Liste des destinataires
  }
  schedules: {
    dailyMorning: string // Format HH:MM (ex: "04:30")
    dailyEvening: string // Format HH:MM (ex: "13:30")
  }
  preparationAlerts: {
    direct: number // Minutes avant (ex: 30)
    commercial: number // Minutes avant (ex: 45)
    special: number // Minutes avant (ex: 60)
  }
}

/**
 * Charge la configuration depuis les variables d'environnement
 */
export function loadAlertConfig(): AlertConfig {
  return {
    telegram: {
      enabled: process.env.TELEGRAM_ENABLED === 'true',
      botToken: process.env.TELEGRAM_BOT_TOKEN || null,
      chatId: process.env.TELEGRAM_CHAT_ID || null,
    },
    email: {
      enabled: process.env.EMAIL_ENABLED === 'true',
      smtpHost: process.env.SMTP_HOST || null,
      smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
      smtpUser: process.env.SMTP_USER || null,
      smtpPassword: process.env.SMTP_PASSWORD || null,
      fromEmail: process.env.EMAIL_FROM || null,
      toEmails: (process.env.EMAIL_TO || '').split(',').filter(Boolean),
    },
    schedules: {
      dailyMorning: process.env.ALERT_DAILY_MORNING || '04:30',
      dailyEvening: process.env.ALERT_DAILY_EVENING || '13:30',
    },
    preparationAlerts: {
      direct: parseInt(process.env.ALERT_PREP_DIRECT || '30', 10),
      commercial: parseInt(process.env.ALERT_PREP_COMMERCIAL || '45', 10),
      special: parseInt(process.env.ALERT_PREP_SPECIAL || '60', 10),
    },
  }
}


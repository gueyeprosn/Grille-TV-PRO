/**
 * Messages d'erreur améliorés et informatifs pour l'utilisateur
 */

export interface ErrorContext {
  action?: string
  entity?: string
  details?: any
}

/**
 * Génère un message d'erreur convivial basé sur le type d'erreur
 */
export function getErrorMessage(error: any, context?: ErrorContext): string {
  // Erreur réseau
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return '⏱️ La requête a pris trop de temps. Vérifiez votre connexion internet et réessayez.'
    }
    if (error.message?.includes('Network Error')) {
      return '🌐 Erreur de connexion. Vérifiez votre connexion internet.'
    }
    return '❌ Une erreur inattendue s\'est produite. Veuillez réessayer.'
  }

  const status = error.response?.status
  const data = error.response?.data

  // Messages spécifiques par code HTTP
  switch (status) {
    case 400:
      return data?.error || data?.message || '⚠️ Données invalides. Vérifiez les informations saisies.'
    
    case 401:
      return '🔐 Session expirée. Veuillez vous reconnecter.'
    
    case 403:
      return '🚫 Vous n\'avez pas les permissions nécessaires pour effectuer cette action.'
    
    case 404:
      return `🔍 ${context?.entity || 'Ressource'} introuvable.`
    
    case 409:
      return '⚠️ Conflit détecté. Cette ressource existe déjà ou entre en conflit avec une autre.'
    
    case 422:
      return data?.error || data?.message || '⚠️ Validation échouée. Vérifiez les champs requis.'
    
    case 429:
      return '⏳ Trop de requêtes. Veuillez patienter quelques instants avant de réessayer.'
    
    case 500:
      return '🔧 Erreur serveur. L\'équipe technique a été notifiée. Veuillez réessayer plus tard.'
    
    case 503:
      return '🔧 Service temporairement indisponible. Veuillez réessayer dans quelques instants.'
    
    default:
      return data?.error || data?.message || `❌ Erreur ${status || 'inconnue'}. Veuillez réessayer.`
  }
}

/**
 * Génère un message de succès contextuel
 */
export function getSuccessMessage(action: string, entity?: string): string {
  const messages: Record<string, string> = {
    create: `✅ ${entity || 'Élément'} créé avec succès`,
    update: `✅ ${entity || 'Élément'} modifié avec succès`,
    delete: `✅ ${entity || 'Élément'} supprimé avec succès`,
    save: '✅ Données sauvegardées avec succès',
    load: `✅ ${entity || 'Données'} chargées avec succès`,
    export: '✅ Export réussi',
    import: '✅ Import réussi',
  }

  return messages[action.toLowerCase()] || `✅ ${action} réussi`
}


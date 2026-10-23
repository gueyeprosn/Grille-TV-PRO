import React, { useState } from 'react'
import axios from 'axios'
import { Mail, Lock, Shield, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'

// ----------------------
// 🔐 Composant de connexion moderne (UI/UX Pro Max)
// ----------------------

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [err, setErr] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    
    try {
      const apiBase = import.meta.env.BASE_URL && import.meta.env.BASE_URL !== '/' ? `${import.meta.env.BASE_URL}api` : '/api'
      const response = await axios.post(`${apiBase}/v3/auth/local-login`, { email, password })
      if (!response.data.token) throw new Error('Réponse d’authentification invalide')

      localStorage.setItem('token', response.data.token)
      const localUser = {
        email: response.data.user.email,
        displayName: response.data.user.displayName,
        uid: response.data.user.id,
        role: response.data.user.role,
      }
      localStorage.setItem('localUser', JSON.stringify(localUser))
      // Mise à jour de la session sans rechargement complet de la page
window.dispatchEvent(new CustomEvent('localAuth', { detail: localUser }))
    } catch (error: any) {
      setErr(error.response?.data?.error || 'Connexion locale impossible. Vérifiez vos identifiants et le serveur local.')
    } finally {
      setLoading(false)
    }
  }

  const fillAccount = (accEmail: string, accPass: string) => {
    setEmail(accEmail)
    setPassword(accPass)
    setErr('')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0B1220] text-slate-100 relative overflow-hidden">
      {/* Glow décoratif d'arrière-plan */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header Logo & Badge */}
      <div className="mb-6 text-center z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-3 tracking-wide">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          BROADCAST SN+ • CONSOLE LOCALE
        </div>
        <div className="flex items-center justify-center gap-3 mb-1">
          <img src={`${import.meta.env.BASE_URL || '/'}logo.svg`} alt="" className="w-11 h-11 rounded-xl shadow-lg shadow-amber-500/10" />
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            GrilleTV Pro <span className="text-blue-500">V4</span>
          </h1>
        </div>
        <p className="text-slate-400 text-sm max-w-sm mx-auto">
          Système de gestion et supervision de programmation TV
        </p>
      </div>

      {/* Formulaire Carte Dark Glassmorphism */}
      <form
        onSubmit={submit}
        className="w-full max-w-md bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 backdrop-blur-xl z-10 transition-all"
        autoComplete="on"
      >
        <div className="mb-5 flex items-center justify-between pb-3 border-b border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            Authentification locale
          </span>
          <span className="text-[11px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
            PostgreSQL Connecté
          </span>
        </div>

        {err && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{err}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="login-email">
              Identifiant / E-mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-email"
                className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                placeholder="nom@grilletv.local"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="login-password">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-password"
                className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Connexion en cours...
              </span>
            ) : (
              <>
                <span>Se connecter</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Les identifiants ne sont plus pré-remplis pour des raisons de sécurité. */}
      </form>

      {/* Footer */}
      <footer className="mt-8 text-xs text-slate-500 text-center z-10">
        © 2026 Broadcast SN+ — GrilleTV Pro v4.0.0 — Régie & Diffusion
      </footer>
    </div>
  )
}

export default Login

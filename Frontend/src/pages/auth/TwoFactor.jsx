import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/api'
import Button from '@/components/ui/Button'

export default function TwoFactor() {
  const [code, setCode]     = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const inputs              = useRef([])
  const { pendingUserId, setAuth, setUser } = useAuthStore()
  const navigate            = useNavigate()

  useEffect(() => {
    if (!pendingUserId) {
      toast.error('Session 2FA expirée. Reconnectez-vous.')
      navigate('/login', { replace: true })
    }
  }, [pendingUserId, navigate])

  // Countdown pour le bouton renvoyer
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const handleChange = (i, v) => {
    if (!/^\d?$/.test(v)) return
    const next = [...code]
    next[i] = v
    setCode(next)
    if (v && i < 5) inputs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) inputs.current[i - 1]?.focus()
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('')
    setCode(pasted.concat(Array(6 - pasted.length).fill('')))
    inputs.current[Math.min(pasted.length, 5)]?.focus()
  }

  const handleResend = async () => {
    if (countdown > 0 || resending) return
    setResending(true)
    try {
      await authApi.login({ resend_2fa: true, user_id: pendingUserId })
      toast.success('Nouveau code envoyé par email.')
      setCountdown(60)
      setCode(['', '', '', '', '', ''])
      inputs.current[0]?.focus()
    } catch {
      toast.error('Impossible de renvoyer le code. Reconnectez-vous.')
    } finally {
      setResending(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const fullCode = code.join('')
    if (fullCode.length !== 6) { toast.error('Entrez les 6 chiffres.'); return }
    if (!pendingUserId) {
      toast.error('Session 2FA expirée. Reconnectez-vous.')
      navigate('/login', { replace: true })
      return
    }
    setLoading(true)
    try {
      const res = await authApi.verifyTwoFactor({ user_id: pendingUserId, code: fullCode })
      const data = res.data?.data
      if (!data?.token || !data?.user) {
        throw new Error('Réponse 2FA incomplète')
      }

      setAuth(data.user, data.token)

      try {
        const me = await authApi.me()
        if (me.data?.data) setUser(me.data.data)
      } catch {
        // ignore; user minimal déjà stocké
      }

      toast.success('Authentification réussie !')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message ?? err.message ?? 'Code invalide ou expiré.')
      setCode(['', '', '', '', '', ''])
      inputs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-500 rounded-2xl shadow-lg mb-4">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Vérification en deux étapes</h1>
          <p className="text-gray-500 text-sm mt-2">Un code à 6 chiffres a été envoyé à votre adresse email ou téléphone.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center gap-3" onPaste={handlePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={el => inputs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition"
                />
              ))}
            </div>
            <p className="text-center text-xs text-gray-400">Valable 10 minutes</p>
            <Button type="submit" loading={loading} className="w-full" size="lg">
              Vérifier
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Vous n'avez pas reçu le code ?{' '}
              {countdown > 0 ? (
                <span className="text-gray-400">Renvoyer dans {countdown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-primary-600 font-medium hover:underline disabled:opacity-50"
                >
                  {resending ? 'Envoi…' : 'Renvoyer le code'}
                </button>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { paymentsApi, consultationsApi } from '@/api'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input, { Select } from '@/components/ui/Input'
import { LoadingPage } from '@/components/common/LoadingSpinner'
import { toast } from 'sonner'
import {
  ArrowLeft, CreditCard, Smartphone, Banknote,
  CheckCircle, Copy, Phone
} from 'lucide-react'

const PAYMENT_METHODS = [
  { value: 'orange_money', label: 'Orange Money', icon: Smartphone, color: 'bg-orange-50 border-orange-200 text-orange-700' },
  { value: 'moov_money',   label: 'Moov Money',   icon: Smartphone, color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { value: 'card',         label: 'Carte bancaire', icon: CreditCard, color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { value: 'cash',         label: 'Espèces',      icon: Banknote,   color: 'bg-green-50 border-green-200 text-green-700' },
]

export default function PaymentInitiate() {
  const { consultationId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const prefilledAmount = searchParams.get('amount') || ''

  const [method, setMethod] = useState('')
  const [amount, setAmount] = useState(prefilledAmount)
  const [phone, setPhone] = useState('')
  const [paymentResult, setPaymentResult] = useState(null)

  const { data: consultationData, isLoading } = useQuery({
    queryKey: ['consultation', consultationId],
    queryFn: () => consultationsApi.get(consultationId),
    enabled: !!consultationId,
  })

  const initiateMutation = useMutation({
    mutationFn: (data) => paymentsApi.initiate(consultationId, data),
    onSuccess: (res) => {
      const payment = res.data?.data || res.data
      setPaymentResult(payment)
      toast.success('Paiement initié avec succès')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors du paiement')
    },
  })

  const confirmMutation = useMutation({
    mutationFn: (data) => paymentsApi.confirm(data),
    onSuccess: () => {
      toast.success('Paiement confirmé !')
      navigate('/payments')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la confirmation')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!method) {
      toast.error('Sélectionnez un mode de paiement')
      return
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Entrez un montant valide')
      return
    }

    initiateMutation.mutate({
      amount: parseFloat(amount),
      method,
      phone: phone || undefined,
    })
  }

  const handleConfirm = () => {
    if (!paymentResult?.reference) return
    confirmMutation.mutate({
      reference: paymentResult.reference,
    })
  }

  const consultation = consultationData?.data?.data || consultationData?.data || {}
  const isMobileMoney = method === 'orange_money' || method === 'moov_money'

  if (isLoading) return <LoadingPage />

  // Étape 2 : confirmation après initiation
  if (paymentResult) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => setPaymentResult(null)} />
          <h1 className="text-2xl font-bold text-gray-900">Confirmer le paiement</h1>
        </div>

        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold">Paiement initié</h2>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-gray-500">Référence</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">{paymentResult.reference}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(paymentResult.reference)
                      toast.success('Référence copiée')
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Montant</span>
                <span className="font-semibold">{paymentResult.amount} FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Méthode</span>
                <span className="font-medium">{
                  PAYMENT_METHODS.find(m => m.value === method)?.label || method
                }</span>
              </div>
            </div>

            {isMobileMoney && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 text-left">
                <p className="font-medium mb-1">Instructions :</p>
                <p>1. Vous allez recevoir une notification sur votre téléphone</p>
                <p>2. Saisissez votre code PIN pour confirmer</p>
                <p>3. Cliquez sur « Confirmer » ci-dessous une fois terminé</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => navigate('/payments')}
                className="flex-1"
              >
                Plus tard
              </Button>
              <Button
                variant="primary"
                icon={CheckCircle}
                loading={confirmMutation.isPending}
                onClick={handleConfirm}
                className="flex-1"
              >
                Confirmer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Étape 1 : formulaire
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate(-1)} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paiement</h1>
          {consultation.reason && (
            <p className="text-gray-500 mt-1">Consultation : {consultation.reason}</p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Montant */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Montant</h3>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Input
                type="number"
                min="0"
                step="100"
                placeholder="5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="text-2xl font-bold text-center"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                FCFA
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Mode de paiement */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Mode de paiement</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((pm) => {
                const Icon = pm.icon
                const selected = method === pm.value
                return (
                  <button
                    key={pm.value}
                    type="button"
                    onClick={() => setMethod(pm.value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      selected
                        ? `${pm.color} border-current ring-2 ring-current/20`
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm font-medium">{pm.label}</span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Téléphone (mobile money) */}
        {isMobileMoney && (
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Numéro de téléphone</h3>
            </CardHeader>
            <CardContent>
              <Input
                icon={Phone}
                type="tel"
                placeholder="Ex: 70 12 34 56"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <Button
          type="submit"
          variant="primary"
          icon={CreditCard}
          loading={initiateMutation.isPending}
          disabled={!method || !amount}
          className="w-full"
          size="lg"
        >
          Payer {amount ? `${parseInt(amount).toLocaleString('fr-FR')} FCFA` : ''}
        </Button>
      </form>
    </div>
  )
}

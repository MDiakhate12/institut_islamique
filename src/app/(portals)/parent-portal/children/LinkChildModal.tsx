'use client'

import { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react'
import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSendOtp, useVerifyOtpAndLink } from '@/modules/parents/parents.hooks'
import { toast } from 'sonner'
import { CheckCircle, Clock, Phone, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

type Step = 'phone' | 'verify'

interface LinkChildModalProps {
  children: React.ReactNode
  onLinked?: () => void
}

export function LinkChildModal({ children, onLinked }: LinkChildModalProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const digitRefs = useRef<(HTMLInputElement | null)[]>([])

  const sendOtp = useSendOtp()
  const verifyAndLink = useVerifyOtpAndLink()

  const code = digits.join('')
  const isCodeComplete = code.length === 6

  function resetModal() {
    setStep('phone')
    setPhone('')
    setDigits(['', '', '', '', '', ''])
  }

  function handleOpenChange(o: boolean) {
    setOpen(o)
    if (!o) resetModal()
  }

  async function handleSendCode() {
    if (!phone.trim()) return
    const result = await sendOtp.mutateAsync(phone.trim())
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setStep('verify')
    setTimeout(() => digitRefs.current[0]?.focus(), 100)
  }

  async function handleVerifyAndLink() {
    if (!isCodeComplete) return
    const result = await verifyAndLink.mutateAsync({ phone, code })
    if (!result.success) {
      toast.error(result.error)
      setDigits(['', '', '', '', '', ''])
      setTimeout(() => digitRefs.current[0]?.focus(), 50)
      return
    }
    toast.success(`${result.data.count} élève(s) lié(s) avec succès !`)
    setOpen(false)
    resetModal()
    onLinked?.()
  }

  function handleDigitChange(index: number, value: string) {
    const char = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = char
    setDigits(next)
    if (char && index < 5) {
      digitRefs.current[index + 1]?.focus()
    }
  }

  function handleDigitKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      digitRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const next = [...digits]
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    const lastFilled = Math.min(pasted.length, 5)
    digitRefs.current[lastFilled]?.focus()
  }

  const maskedPhone = phone.length > 4
    ? phone.slice(0, 2) + ' ** ** ** ' + phone.slice(-2)
    : phone

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={React.isValidElement(children) ? children : <span>{children}</span>} />
      <DialogContent className="max-w-md">
        {/* Stepper */}
        <div className="flex items-center gap-0 mb-2">
          {(['phone', 'verify'] as Step[]).map((s, i) => {
            const labels = ['Téléphone', 'Vérifier']
            const isActive = step === s
            const isDone = (step === 'verify' && s === 'phone')
            return (
              <div key={s} className="flex items-center">
                {i > 0 && (
                  <div className={cn('h-px w-8', isDone ? 'bg-[#c2440f]' : 'bg-gray-200')} />
                )}
                <div className="flex flex-col items-center gap-0.5">
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors',
                    isActive ? 'bg-[#c2440f] border-[#c2440f] text-white'
                      : isDone ? 'bg-[#c2440f] border-[#c2440f] text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                  )}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium',
                    isActive ? 'text-[#c2440f]' : isDone ? 'text-[#c2440f]' : 'text-gray-400'
                  )}>
                    {labels[i]}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {step === 'phone' && (
          <>
            <DialogHeader>
              <DialogTitle>Ajouter vos enfants</DialogTitle>
              <DialogDescription>Lier des élèves à votre compte parent</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Numéro de téléphone du parent
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="tel"
                    placeholder="0X XX XX XX XX"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendCode()}
                    className="pl-9"
                    autoFocus
                  />
                </div>
              </div>

              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs text-orange-700">
                Utilisez le numéro de téléphone enregistré dans le compte scolaire de votre enfant.
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
                Nous enverrons un code de vérification pour confirmer votre accès.
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleSendCode}
                disabled={!phone.trim() || sendOtp.isPending}
                className="bg-[#c2440f] hover:bg-[#a33a0d] text-white"
              >
                {sendOtp.isPending ? 'Envoi…' : 'Envoyer le code →'}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'verify' && (
          <>
            <DialogHeader>
              <DialogTitle>Vérifier votre téléphone</DialogTitle>
              <DialogDescription>
                Entrez le code envoyé sur votre téléphone
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-gray-400" />
                  Code de vérification
                </label>

                <div className="flex gap-2 justify-center py-2">
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={el => { digitRefs.current[i] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={e => handleDigitChange(i, e.target.value)}
                      onKeyDown={e => handleDigitKeyDown(i, e)}
                      onPaste={i === 0 ? handlePaste : undefined}
                      className={cn(
                        'w-11 h-13 text-center text-xl font-bold rounded-lg border-2 outline-none',
                        'transition-colors focus:border-[#c2440f] focus:ring-2 focus:ring-[#c2440f]/20',
                        d ? 'border-[#c2440f] bg-orange-50' : 'border-gray-300 bg-white'
                      )}
                    />
                  ))}
                </div>

                <p className="text-xs text-center text-gray-500">
                  Entrez le code à 6 chiffres envoyé au {maskedPhone}
                </p>
              </div>

              <button
                onClick={() => { setStep('phone'); setDigits(['', '', '', '', '', '']) }}
                className="flex items-center gap-1 text-xs text-[#c2440f] hover:underline"
              >
                <ArrowLeft className="h-3 w-3" />
                Changer de numéro
              </button>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleVerifyAndLink}
                disabled={!isCodeComplete || verifyAndLink.isPending}
                className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
              >
                <CheckCircle className="h-4 w-4" />
                {verifyAndLink.isPending ? 'Vérification…' : 'Vérifier et lier'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

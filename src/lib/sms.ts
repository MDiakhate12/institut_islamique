function toE164French(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('33') && digits.length === 11) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 10) return `+33${digits.slice(1)}`
  return phone
}

export async function sendSmsOtp(phone: string, code: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_PHONE_NUMBER

  if (!sid || !token || !from) {
    console.log(`[OTP] Code pour ${phone} : ${code}`)
    return
  }

  const twilio = (await import('twilio')).default
  const client = twilio(sid, token)
  try {
    await client.messages.create({
      body: `Votre code de vérification Qaf School est : ${code}. Valable 10 minutes.`,
      from,
      to: toE164French(phone),
    })
  } catch (err) {
    // SMS échoué (région non activée, etc.) — on logue quand même pour le dev
    console.warn(`[OTP] SMS non envoyé pour ${phone} — code : ${code}`, err)
  }
}

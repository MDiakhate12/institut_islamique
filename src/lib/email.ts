import nodemailer from 'nodemailer'

function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  })
}

export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
}): Promise<boolean> {
  try {
    await createTransporter().sendMail({
      from: `Qaf School <${process.env.SMTP_USER}>`,
      ...opts,
    })
    return true
  } catch (e) {
    console.warn('[sendEmail] SMTP error:', e)
    return false
  }
}

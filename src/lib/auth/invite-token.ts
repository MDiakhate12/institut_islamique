import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Jeton d'invitation signé (HMAC-SHA256), sans état en base.
 *
 * Il remplace les anciens liens `?invite=…&schoolId=…&email=…`, que n'importe qui pouvait fabriquer
 * en connaissant l'école et l'e-mail d'un invité. Le jeton prouve que le lien a bien été envoyé par
 * l'application, à cette adresse : le serveur ne se fie plus qu'à son contenu, jamais aux champs du
 * formulaire. Usage unique : une fois l'invitation consommée (l'enregistrement `school_members`
 * n'est plus au NIL_UUID), le jeton ne retrouve plus rien et ne sert plus.
 */

export type InviteKind = 'admin' | 'teacher'

export interface InvitePayload {
  kind: InviteKind
  schoolId: string
  email: string
}

interface SignedPayload extends InvitePayload {
  exp: number // secondes epoch
}

export const INVITE_TTL_DAYS = 14

function getSecret(): string {
  const secret = process.env.INVITE_TOKEN_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('INVITE_TOKEN_SECRET (ou SUPABASE_SERVICE_ROLE_KEY) manquant')
  return secret
}

function sign(body: string): string {
  return createHmac('sha256', getSecret()).update(body).digest('base64url')
}

export function createInviteToken(payload: InvitePayload): string {
  const signed: SignedPayload = {
    ...payload,
    email: payload.email.toLowerCase().trim(),
    exp: Math.floor(Date.now() / 1000) + INVITE_TTL_DAYS * 24 * 3600,
  }
  const body = Buffer.from(JSON.stringify(signed)).toString('base64url')
  return `${body}.${sign(body)}`
}

/** Renvoie le contenu du jeton, ou `null` s'il est mal formé, falsifié ou expiré. */
export function verifyInviteToken(token: string | undefined | null): InvitePayload | null {
  if (!token) return null
  const [body, signature, ...rest] = token.split('.')
  if (!body || !signature || rest.length > 0) return null

  try {
    const expected = Buffer.from(sign(body))
    const received = Buffer.from(signature)
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null

    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Partial<SignedPayload>
    if (
      (parsed.kind !== 'admin' && parsed.kind !== 'teacher') ||
      typeof parsed.schoolId !== 'string' ||
      typeof parsed.email !== 'string' ||
      typeof parsed.exp !== 'number'
    ) return null
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null

    return { kind: parsed.kind, schoolId: parsed.schoolId, email: parsed.email }
  } catch {
    return null
  }
}

export function buildInviteUrl(appUrl: string, payload: InvitePayload): string {
  return `${appUrl}/auth/signup?token=${encodeURIComponent(createInviteToken(payload))}`
}

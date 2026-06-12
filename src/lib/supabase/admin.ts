import { createClient } from '@supabase/supabase-js'

// Service role — contourne RLS.
// Uniquement pour les opérations admin légitimes (ex: créer un tenant, inviter un utilisateur).
// Ne jamais exposer côté client.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

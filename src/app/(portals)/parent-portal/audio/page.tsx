import { requireSession } from '@/lib/auth/session'
import QuranAudioClient from '@/components/shared/QuranAudioClient'

export default async function ParentAudioPage() {
  await requireSession()
  return <QuranAudioClient />
}

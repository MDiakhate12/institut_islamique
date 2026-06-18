import Link from 'next/link'
import { CheckCircle } from 'lucide-react'

interface Props {
  params: Promise<{ schoolSlug: string }>
}

export default async function RegistrationSuccessPage({ params }: Props) {
  const { schoolSlug } = await params

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#c2440f] py-6 text-center">
        <h1 className="text-2xl font-bold text-white">Inscription soumise</h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-emerald-500" />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">Inscription reçue !</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Votre demande d'inscription a été soumise avec succès.
              L'équipe de l'école examinera votre dossier et vous contactera prochainement.
            </p>
          </div>

          <div className="bg-white border border-border rounded-xl p-4 text-left space-y-2">
            <p className="text-sm font-medium text-foreground">Prochaines étapes :</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-start gap-2"><span className="text-[#c2440f] mt-0.5">•</span>Vous recevrez une confirmation par e-mail</li>
              <li className="flex items-start gap-2"><span className="text-[#c2440f] mt-0.5">•</span>L'école examinera votre demande sous 5-7 jours ouvrables</li>
              <li className="flex items-start gap-2"><span className="text-[#c2440f] mt-0.5">•</span>Vous serez contacté pour finaliser l'inscription</li>
            </ul>
          </div>

          <Link
            href={`/portal/register/${schoolSlug}`}
            className="inline-block px-6 py-3 bg-[#c2440f] hover:bg-[#a33a0d] text-white font-medium rounded-xl transition-colors text-sm"
          >
            Inscrire un autre élève
          </Link>
        </div>
      </div>
    </div>
  )
}

import Link from 'next/link'
import { CheckCircle, Users } from 'lucide-react'

export default function EnrollmentSuccessPage() {
  return (
    <div className="flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-emerald-500" />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-foreground">Inscription reçue !</h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Votre demande d&apos;inscription a été soumise avec succès.
            L&apos;équipe de l&apos;école examinera votre dossier et vous contactera prochainement.
          </p>
        </div>

        <div className="bg-white border border-border rounded-xl p-4 text-left space-y-2">
          <p className="text-sm font-medium text-foreground">Prochaines étapes :</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li className="flex items-start gap-2"><span className="text-[#c2440f] mt-0.5">•</span>Vous recevrez une confirmation par e-mail</li>
            <li className="flex items-start gap-2"><span className="text-[#c2440f] mt-0.5">•</span>L&apos;école examinera votre demande sous 5-7 jours ouvrables</li>
            <li className="flex items-start gap-2"><span className="text-[#c2440f] mt-0.5">•</span>Vous serez contacté pour finaliser l&apos;inscription</li>
          </ul>
        </div>

        <Link
          href="/parent-portal/enrollment"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#c2440f] hover:bg-[#a33a0d] text-white font-medium rounded-xl transition-colors text-sm"
        >
          <Users className="h-4 w-4" />
          Retour à la liste des élèves
        </Link>
      </div>
    </div>
  )
}

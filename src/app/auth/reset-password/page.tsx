import { ResetPasswordForm } from './ResetPasswordForm'

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-nat-cream-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-nat-green-900">Qaf School</h1>
          <p className="text-muted-foreground mt-2">Application de gestion scolaire islamique</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-border p-8">
          <h2 className="text-xl font-semibold text-foreground mb-2">Nouveau mot de passe</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Choisissez un nouveau mot de passe sécurisé pour votre compte.
          </p>
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  )
}

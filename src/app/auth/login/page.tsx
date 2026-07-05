import Link from 'next/link'
import { LoginForm } from './LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-qaf-cream-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-qaf-brown-900">Qaf School</h1>
          <p className="text-muted-foreground mt-2">Application de gestion scolaire islamique</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-border p-8">
          <h2 className="text-xl font-semibold text-foreground mb-6">Connexion</h2>
          <LoginForm />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Pas de compte ?{' '}
            <Link href="/auth/signup" className="text-[#c2440f] hover:underline font-medium">
              S'inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

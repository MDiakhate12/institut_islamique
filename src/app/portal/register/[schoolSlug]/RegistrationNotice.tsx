import Link from 'next/link'
import { Info } from 'lucide-react'

/** Écran affiché à la place du formulaire quand il ne peut pas être utilisé (inscriptions fermées…). */
export function RegistrationNotice({ schoolName, title, message, links = [] }: {
  schoolName: string
  title: string
  message: string
  links?: { href: string; label: string }[]
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-border shadow-sm p-8 text-center space-y-4">
        <p className="text-sm font-medium text-muted-foreground">{schoolName}</p>
        <div className="mx-auto h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center">
          <Info className="h-6 w-6 text-amber-600" />
        </div>
        <h1 className="text-xl font-bold text-[#2d6a4f]">{title}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
        {links.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {links.map(l => (
              <Link key={l.href} href={l.href}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#2d6a4f] hover:bg-[#1b4332] transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

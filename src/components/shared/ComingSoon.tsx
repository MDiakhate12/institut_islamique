import Link from 'next/link'
import { Wrench } from 'lucide-react'

interface Props {
  title: string
  description?: string
}

export function ComingSoon({ title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-8">
      <div className="bg-white rounded-2xl border border-border shadow-sm p-10 max-w-sm w-full text-center space-y-6">

        {/* Icon */}
        <div className="mx-auto h-16 w-16 rounded-2xl bg-[#fdf6f0] border border-[#f0dcc8] flex items-center justify-center">
          <Wrench className="h-7 w-7 text-[#c2440f]" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-[#7a4f30]">{title}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description ?? 'Cette fonctionnalité est en cours de développement et sera disponible prochainement.'}
          </p>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium px-3 py-1.5 rounded-full">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
          En cours de développement
        </div>

        {/* Back */}
        <Link
          href=".."
          className="flex items-center justify-center w-full rounded-lg border border-input bg-background
                     px-4 py-2 text-sm font-medium text-foreground
                     hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          ← Retour
        </Link>
      </div>
    </div>
  )
}

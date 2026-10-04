import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Cairo } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { NavigationProgress } from '@/components/layouts/NavigationProgress/NavigationProgress'

const cairo = Cairo({
  variable: '--font-cairo',
  subsets: ['latin', 'arabic'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Qaf School — Application de gestion scolaire islamique',
  description: 'Gérez votre école islamique : élèves, présences, devoirs, examens, finance et communication.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${cairo.variable} h-full antialiased`}>
      <body className="h-full">
        {/* Suspense : useSearchParams ne doit pas forcer tout l'arbre en rendu client */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

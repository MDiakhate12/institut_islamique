import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Qaf School — Grande Mosquée Lyon Ouest',
    short_name: 'Qaf School',
    description: 'Application de gestion scolaire islamique',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f9f3',
    theme_color: '#2d6a4f',
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}

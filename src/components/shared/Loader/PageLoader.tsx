import { Loader } from './Loader'

/**
 * Loader d'une page entière. Rendu par les `loading.tsx` des portails (chargement serveur)
 * ET par les pages tant que leurs données initiales ne sont pas arrivées : même taille,
 * même place → l'utilisateur voit un seul loader du clic jusqu'à la page complète (§7.23).
 */
export function PageLoader() {
  return <Loader size="lg" className="min-h-[60vh]" />
}

import { Loader } from './Loader'

/**
 * Loader d'une page entière, rendu par chaque page tant que ses données initiales ne sont
 * pas toutes arrivées : un seul loader jusqu'à la page complète (§7.23).
 * Pas de loading.tsx dans l'appli : toute frontière Suspense fait planter les redirect() serveur.
 */
export function PageLoader() {
  return <Loader size="lg" className="min-h-[60vh]" />
}

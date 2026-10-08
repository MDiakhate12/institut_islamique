/**
 * Navigation « dure » (rechargement complet) après tout changement d'identité :
 * connexion, déconnexion, inscription, suppression de compte.
 *
 * Une redirection Next (`redirect()` dans une Server Action) est une navigation côté client :
 * le cache TanStack Query (clés non liées à l'école, ex. ['school', 'detail']) et le cache du
 * routeur Next survivent. Après un changement de compte, la page affichait pendant ~60 s les
 * données de l'école précédente — et « Enregistrer » sur Paramètres de l'école aurait écrit
 * les réglages de l'ancienne école dans la nouvelle. Recharger la page vide toute la mémoire.
 */
export function hardNavigate(path: string): void {
  window.location.assign(path)
}

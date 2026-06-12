# ADR-001 — Conserver Firebase (Firestore + Auth + Storage)

**Date** : Juin 2026
**Statut** : Accepté

## Contexte
La v1 de Qaf School utilisait Firebase. Lors de la refonte, on a évalué le passage
à Supabase (PostgreSQL) ou PlanetScale.

## Décision
On conserve Firebase pour la v2.

## Raisons
- La structure multi-tenant est déjà modélisée dans Firestore (`/schools/{schoolId}/...`)
  et fonctionne bien — migrer vers SQL impliquerait une refonte du modèle de données
- Firebase Auth gère nativement les custom claims pour les multi-rôles
- L'équipe connaît déjà Firebase
- Firestore scale sans config serveur

## Contraintes acceptées
- Pas de JOIN natif → les relations se font par dénormalisation ou plusieurs requêtes
- Pricing à surveiller si l'app passe à 1000+ écoles
- Toutes les requêtes complexes sont dans les services, jamais dans les composants,
  pour faciliter une éventuelle migration future

## Revisiter si
- Le coût Firebase devient problématique (> 500 écoles actives)
- On a besoin de requêtes analytiques complexes (passer à BigQuery ou Supabase Analytics)

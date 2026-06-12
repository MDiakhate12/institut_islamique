# ADR-002 — Supabase + Drizzle ORM (remplace Firebase)

**Date** : Juin 2026
**Statut** : Accepté

## Contexte

La v1 utilisait Firebase (Firestore + Auth + Storage). Lors de la refonte, on a décidé de migrer
vers une solution relationnelle après plusieurs expériences négatives avec Firebase :
- Impossibilité de faire des JOINs → rapports complexes non réalisables proprement
- Absence de transactions ACID → risques d'incohérence sur les paiements
- Schéma implicite → sources de bugs silencieux
- Pricing imprévisible à l'échelle

## Décision

On adopte **Supabase** (PostgreSQL + Auth + Storage) avec **Drizzle ORM**.

## Pourquoi Supabase

| Besoin | Firebase | Supabase |
|--------|----------|----------|
| Auth multi-rôles | ✅ Custom claims | ✅ JWT + metadata |
| Données relationnelles | ❌ NoSQL | ✅ PostgreSQL |
| Isolation multi-tenant | Code (schoolId) | ✅ RLS policies DB |
| Rapports complexes | ❌ Limité | ✅ SQL natif |
| Storage fichiers | ✅ | ✅ |
| Real-time | ✅ | ✅ |
| Open source | ❌ | ✅ Self-hostable |
| Dashboard data | Firebase Console | ✅ Supabase Studio |

## Pourquoi Drizzle ORM (et pas Prisma)

- **Schéma TypeScript pur** : le schéma est du code TypeScript, Claude Code peut le lire/modifier directement
- **Pas de processus externe** : pas de `prisma generate`, les types sont inférés à la compilation
- **SQL-first** : les requêtes complexes restent lisibles et compréhensibles
- **Performance** : requêtes optimisées sans overhead Prisma Client
- **Next.js 15 natif** : fonctionne directement dans Server Actions sans configuration spéciale
- **Drizzle Studio** : interface visuelle intégrée pour explorer la DB en dev

## Architecture multi-tenant avec RLS

Toutes les tables métier ont une colonne `school_id`. Les RLS policies Supabase garantissent
l'isolation au niveau base de données :

```sql
-- Exemple RLS policy pour la table students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "school_isolation" ON students
  USING (school_id = (
    SELECT school_id FROM school_members
    WHERE user_id = auth.uid()
  ));
```

Le code applicatif ne fait jamais confiance au `school_id` passé en paramètre — c'est la DB
qui l'applique.

## Structure des clients Supabase

```typescript
// src/lib/supabase/server.ts — Server Components + Server Actions
import { createServerClient } from '@supabase/ssr'

// src/lib/supabase/client.ts — Client Components (lecture seule principalement)
import { createBrowserClient } from '@supabase/ssr'

// src/lib/supabase/admin.ts — Service role (contourne RLS, admin uniquement)
import { createClient } from '@supabase/supabase-js'
// UNIQUEMENT pour les opérations admin légitimes (ex: créer un tenant)
```

## Résend pour les emails

La page "Envoyer un email" de l'app actuelle dépend d'un OAuth Gmail incomplètement implémenté.
On remplace par **Resend** :
- API simple, templates React Email
- Pas de OAuth à gérer
- Domaine personnalisé configuré une fois
- Logs d'envoi intégrés

## Contraintes acceptées

- Supabase est un service externe (risque de vendor lock-in réduit car PostgreSQL standard)
- Prix Supabase à surveiller si > 500 écoles actives — dans ce cas évaluer self-hosting
- Drizzle est plus jeune que Prisma mais stable et activement maintenu

## Revisiter si

- Besoin de multi-région fort (évaluer Neon + Drizzle pour le branching)
- Self-hosting imposé par contraintes légales (école en pays avec lois sur les données)

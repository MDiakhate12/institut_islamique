# Qaf School — Instructions permanentes pour Claude Code

> Ce fichier est lu par Claude Code à chaque session. Il contient tout le contexte
> nécessaire pour travailler sur ce projet sans briefing verbal. Ne jamais le supprimer.
> Le mettre à jour dès qu'une décision d'architecture change.

---

## 1. Contexte produit

**Qaf School** est une application SaaS de gestion scolaire islamique multi-tenant.
Site actuel de référence : https://www.qaf.app/admin-portal

### Ce que fait l'application
Chaque école (tenant) gère indépendamment :
- Ses élèves, enseignants et classes (Coran / Nuraniyah)
- Les présences, devoirs, notes d'examens et étoiles (système gamifié)
- Sa comptabilité (frais de scolarité, dépenses)
- Ses communications (annonces, emails aux parents)
- Son calendrier académique
- Un catalogue de classes pré-définies (34 modèles disponibles)
- Des inscriptions en ligne via formulaires configurables
- Une TV mode (affichage mural)

### Rôles utilisateur
Un même compte peut cumuler plusieurs rôles simultanément :
- **School Admin** — accès complet au portail d'administration
- **Teacher (Enseignant)** — accès au portail enseignant (ses classes uniquement)
- **Parent** — accès au portail parent (ses enfants uniquement)

### Données de l'école de référence (Grande Mosquée Lyon Ouest / Attawba)
Observées lors de l'audit visuel (juin 2026), utiles pour tester :
- **Admin** : Abdeslam Ouili (salim.ouili@gmail.com, 0625432895, membre depuis April 13 2026)
- **Rôles cumulés** : School Admin + Enseignant + Parent sur le même compte
- **École** : Attawba (identifiant interne), jours de classe : Dimanche + Samedi
- 1 élève : Chahine BENYAHIA (classe QRN-402-1, famille OUILI)
- 3 enseignants : Aliou SY (bénévole), Aliou SYY (payé), assam (bénévole)
- 1 classe active : "Advanced Surahs – From Juz'01 to Juz'24" (QRN-402-1, Room 1)
- Budget : 270€ — 1 paiement Tuition / Annually / Check, statut Vérifié, soumis par Abdeslam Ouili
- Catalogue : **36 classes** disponibles (non 34)
- Permissions : 1 admin (Abdeslam Ouili) + 1 pending (lahbak.inttic@gmail.com)

---

## 2. Stack technique

| Couche | Technologie | Raison |
|---|---|---|
| Framework | **Next.js 15 — App Router** | Server Components natifs, Server Actions, routing moderne |
| Langage | **TypeScript strict** | Types = documentation fiable pour l'IA |
| Base de données | **Supabase (PostgreSQL)** | Relationnel, RLS multi-tenant natif, remplace Firebase |
| ORM | **Drizzle ORM** | Schéma TypeScript pur, AI-friendly, léger, Next.js 15 natif |
| Auth | **Supabase Auth** | JWT, multi-providers, RLS intégré, remplace Firebase Auth |
| Storage | **Supabase Storage** | Fichiers, photos profil, remplace Firebase Storage |
| UI components | **Shadcn/ui** | Composants dans le codebase, modifiables directement |
| Styling | **Tailwind CSS v4** | Vocabulaire de design cohérent et lisible par l'IA |
| Validation | **Zod** | Schémas = source de vérité pour types + validation |
| Formulaires | **React Hook Form + Zod** | Intégration native, pas de logique de form custom |
| State serveur | **Server Actions + TanStack Query** | Pas de Redux, pas de Zustand global |
| Email | **Resend** | API email transactionnel, templates React, remplace Gmail OAuth |
| Déploiement | **Vercel** | Edge functions, intégration Next.js native |

> **ADR** : voir `docs/decisions/ADR-002-supabase-drizzle.md` pour le raisonnement complet.

### Pourquoi Supabase + Drizzle (et pas Firebase)
- PostgreSQL = JOIN, transactions ACID, rapports complexes natifs
- Row Level Security = isolation multi-tenant au niveau base de données (plus sûr que du code)
- Auth + Storage + DB dans un seul service (même DX que Firebase, mais relationnel)
- Drizzle = schéma en TypeScript pur → Claude peut lire et modifier le schéma directement
- Types générés automatiquement depuis le schéma → zéro désynchronisation types/DB

---

## 3. Structure des dossiers

```
src/
├── app/                          # Routes Next.js (App Router uniquement)
│   ├── (auth)/                   # Login, register, reset password
│   │   └── login/page.tsx
│   ├── (portals)/                # Route group — layout avec sidebar
│   │   ├── layout.tsx            # Layout partagé portails
│   │   ├── admin-portal/         # Portail School Admin
│   │   │   ├── page.tsx          # Dashboard d'accueil
│   │   │   ├── students/
│   │   │   ├── teachers/
│   │   │   ├── classes/
│   │   │   ├── track-exams/
│   │   │   ├── attendance/
│   │   │   ├── homework/
│   │   │   ├── track-stars/
│   │   │   ├── class-catalog/
│   │   │   ├── academic-calendar/
│   │   │   ├── reports/
│   │   │   ├── book-tracking/
│   │   │   ├── substitutions/
│   │   │   ├── registrations/
│   │   │   ├── registration-forms/
│   │   │   ├── finance/
│   │   │   │   ├── budget/
│   │   │   │   └── expenses/
│   │   │   ├── communication/
│   │   │   │   └── send-email/
│   │   │   ├── announcements/        # URL directe (pas sous /communication/)
│   │   │   ├── parents/              # URL directe (pas sous /communication/)
│   │   │   ├── sticky-notes/
│   │   │   ├── birthdays/
│   │   │   ├── permissions/          # Gestion admins/trésoriers/gestionnaires
│   │   │   ├── start-new-year/       # Wizard nouvelle année académique
│   │   │   ├── roadmap/              # Demandes de fonctionnalités (votes)
│   │   │   └── school-settings/      # Paramètres école (remplace /settings)
│   │   └── teacher-portal/       # Portail Enseignant
│   │   └── parent-portal/        # Portail Parent
│   └── api/                      # API routes si besoin (webhooks, etc.)
│
├── modules/                      # Logique métier par domaine — CŒUR DU PROJET
│   ├── students/
│   │   ├── students.types.ts
│   │   ├── students.schema.ts
│   │   ├── students.service.ts
│   │   ├── students.actions.ts
│   │   └── students.hooks.ts
│   ├── teachers/
│   ├── classes/
│   ├── attendance/
│   ├── homework/
│   ├── exams/
│   ├── stars/
│   ├── finance/
│   ├── communication/
│   ├── registrations/
│   ├── calendar/
│   └── school/                   # Tenant / paramètres école
│
├── components/
│   ├── ui/                       # Composants Shadcn (générés, ne pas modifier manuellement)
│   ├── shared/                   # Composants réutilisables custom
│   │   ├── DataTable/            # Tableau générique avec tri/filtre/export
│   │   ├── PageHeader/           # En-tête de page standardisé
│   │   ├── StatusBadge/          # Badge coloré statut
│   │   ├── EmptyState/           # État vide avec illustration
│   │   ├── ConfirmDialog/        # Modale de confirmation destructive
│   │   └── ExcelExportButton/    # Bouton export Excel (présent partout)
│   └── layouts/
│       ├── Sidebar/
│       ├── Header/
│       └── PortalLayout/
│
├── lib/
│   ├── firebase/
│   │   ├── config.ts             # Initialisation Firebase client
│   │   ├── admin.ts              # Firebase Admin SDK (server uniquement)
│   │   └── client.ts             # Helpers client (getDoc, etc.)
│   ├── utils.ts                  # Fonctions utilitaires générales
│   ├── constants.ts              # Constantes globales (rôles, statuts, etc.)
│   └── result.ts                 # Pattern Result<T, E>
│
└── types/
    └── index.ts                  # Types globaux (User, School, Role, etc.)
```

---

## 4. Conventions de code — TOUJOURS respecter

### 4.1 Nommage des fichiers
```
Composants React       → PascalCase          StudentCard.tsx
Hooks                  → camelCase + use      useStudents.ts
Server Actions         → camelCase + Action   createStudentAction.ts
Services               → camelCase + Service  studentsService.ts (dans module)
Types/Interfaces       → PascalCase + Type    StudentType ou IStudent
Schémas Zod            → camelCase + Schema   studentSchema
Pages Next.js          → lowercase kebab      /students/[id]/page.tsx
```

### 4.2 Structure obligatoire d'un module
Quand tu crées ou modifies un module, respecter strictement cet ordre :

```typescript
// 1. [module].types.ts — TOUJOURS en premier
export interface StudentType {
  id: string
  schoolId: string          // Toujours présent — isolation tenant
  firstName: string
  lastName: string
  // ...
  createdAt: Timestamp
  updatedAt: Timestamp
}

// 2. [module].schema.ts — Schéma Zod qui infère les types de formulaire
import { z } from 'zod'
export const createStudentSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
  // ...
})
export type CreateStudentInput = z.infer<typeof createStudentSchema>

// 3. [module].service.ts — SEUL endroit pour toucher Firebase
import { adminDb } from '@/lib/firebase/admin'
export const studentsService = {
  async getBySchool(schoolId: string): Promise<StudentType[]> { ... },
  async getById(schoolId: string, studentId: string): Promise<StudentType | null> { ... },
  async create(schoolId: string, data: CreateStudentInput): Promise<StudentType> { ... },
  async update(schoolId: string, id: string, data: Partial<StudentType>): Promise<void> { ... },
  async delete(schoolId: string, id: string): Promise<void> { ... },
}

// 4. [module].actions.ts — Server Actions qui appellent le service
'use server'
import { studentsService } from './students.service'
export async function getStudentsAction(schoolId: string): Promise<ActionResult<StudentType[]>> { ... }

// 5. [module].hooks.ts — React hooks côté client
'use client'
import { useQuery } from '@tanstack/react-query'
export function useStudents(schoolId: string) {
  return useQuery({ queryKey: ['students', schoolId], queryFn: ... })
}
```

### 4.3 Pattern Result — gestion d'erreurs uniformisée
**Ne jamais** faire de try/catch dans un composant React. Toujours utiliser :

```typescript
// src/lib/result.ts
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// Dans une Server Action
export async function createStudentAction(input: CreateStudentInput): Promise<ActionResult<StudentType>> {
  try {
    const student = await studentsService.create(schoolId, input)
    return { success: true, data: student }
  } catch (error) {
    return { success: false, error: 'Erreur lors de la création de l\'élève' }
  }
}

// Dans un composant
const result = await createStudentAction(data)
if (!result.success) {
  toast.error(result.error)
  return
}
// result.data est typé correctement ici
```

### 4.4 Règles Supabase/Drizzle — absolues
- ❌ Ne jamais importer le client Supabase directement dans un composant React
- ❌ Ne jamais appeler la DB dans un hook React (passer par Server Actions)
- ✅ Tout accès DB passe par `src/modules/[module]/[module].service.ts` via Drizzle
- ✅ Le client Supabase Admin (service role) uniquement dans les Server Actions et API routes
- ✅ Toutes les tables ont une colonne `school_id` + RLS policy correspondante
- ✅ Le schéma Drizzle est la source de vérité — jamais de SQL brut en dehors de migrations
- ✅ Les types TypeScript sont inférés depuis le schéma Drizzle (`$inferSelect`, `$inferInsert`)

### 4.5 Composants — règles
- Préférer les **Server Components** par défaut
- Ajouter `'use client'` uniquement si nécessaire (interactivité, hooks, formulaires)
- Un composant = un fichier. Pas de composants inline dans les pages.
- Les pages (`page.tsx`) sont légères : elles importent des composants, n'ont pas de JSX complexe
- Toujours utiliser les composants **Shadcn** pour l'UI de base avant d'en créer un custom

### 4.6 Styling — règles
- ❌ Jamais de style inline (`style={{ color: 'red' }}`)
- ❌ Jamais de fichiers CSS modules custom (sauf exception justifiée)
- ✅ Classes Tailwind exclusivement
- ✅ Utiliser les tokens sémantiques définis dans `tailwind.config.ts` (voir section Design)
- ✅ `cn()` de `lib/utils.ts` pour les classes conditionnelles

---

## 5. Design system

### Palette de couleurs (identité Qaf School — à définir dans tailwind.config.ts)
```typescript
colors: {
  qaf: {
    // Brun chaud — couleur principale sidebar et accents
    brown: {
      50:  '#fdf6f0',
      100: '#f9e8d8',
      500: '#9c6b47',
      700: '#7a4f30',
      900: '#3d2415',
    },
    // Beige/Crème — fond des pages contenu
    cream: {
      50:  '#fefcf8',
      100: '#fdf5e8',
      200: '#f9ead0',
    },
    // Vert succès
    success: '#16a34a',
    // Orange CTA principal
    cta: '#c2440f',
  }
}
```

### Composants de design récurrents observés sur le site

**Layout & Navigation**
- **Sidebar** : fond brun dégradé, sections dépliables (Académique, Finance…), user profile en bas, bouton "Accueil du portail"
- **TopBar** : "Application Scolaire Qaf" + statut Connecté + badge école + badges rôles (School Admin/Enseignant/Parent) colorés
- **CollapseButton** : chevron rond brun pour réduire/étendre la sidebar

**Composants de liste**
- **PageHeader** : titre h1 + sous-titre gris + boutons d'action alignés à droite (Export Excel vert, Créer orange)
- **DataTable** : tableau avec colonnes triables (↕), barre de recherche, filtres dropdowns, export Excel
- **FilterChips** : petits ronds colorés toggle (bleu/rose = genre, vert/rouge = inscrit/actif, jaune = bénévole)
- **KpiCard** : 3 cartes côte à côte — couleurs distinctes par contexte (beige/brun/vert pour budget, vert/orange/bleu pour dépenses, beige/brun/vert pour substitutions)

**Composants de contenu**
- **StatusBadge** : `Vérifié` (vert), `En attente` (orange), `Rejeté` (rouge), `Bénévole` (violet), `Payé` (vert), `School Admin` (gris), `Enseignant` (vert clair), `Parent` (bleu)
- **UserCard** : carte enseignant/admin avec avatar, email, téléphone, rôle, actions edit/delete
- **SplitPanel** : panneau gauche (sélecteur de classe) + panneau droit (contenu) — utilisé dans Livres, Présences
- **TabNav** : onglets horizontaux (Ouvert/Actif/Historique, Par classe/Par élève/Complétion/Type)
- **EmptyState** : icône + message + sous-texte contextuel (ex: "Aucune inscription trouvée")
- **WarningBanner** : bandeau jaune/orange en haut de page (ex: période d'examens fermée)

**Actions**
- **NudgeButton** : bouton cloche "Nudge Teachers" (brun foncé), présent sur Présences et Devoirs
- **ExcelExportButton** : bouton vert "Télécharger en Excel", présent sur toutes les listes
- **CreateButton** : bouton orange "Créer un…", toujours en haut à droite des pages liste
- **DangerZone** : section rouge "Zone de danger" dans les settings (actions irréversibles)

### Couleurs de boutons observées (à respecter)
- Orange `#c2440f` → actions principales (Créer, Enregistrer, CTA)
- Vert `#16a34a` → export Excel, actions secondaires positives
- Brun `#7a4f30` → Nudge Teachers, actions de communication
- Blanc/outline → actions tertiaires (Aperçu, Annuler)

---

## 6. Modèle de données (PostgreSQL / Drizzle)

> Schéma complet dans `src/db/schema/`. Chaque table a sa RLS policy dans Supabase.
> Voir `docs/architecture/data-model.md` pour le diagramme ERD complet.

### Tables principales (toutes ont `school_id` sauf les tables globales)

```
Gestion des utilisateurs (Supabase Auth gère l'identité)
  profiles          — informations profil (lié à auth.users)
  school_members    — membre d'une école avec ses rôles (admin/teacher/parent + sous-rôle admin)

Académique
  schools           — écoles / tenants
  students          — élèves
  parent_students   — lien parent ↔ élève (many-to-many)
  class_catalog     — 36 modèles globaux (pas de school_id)
  classes           — classes actives d'une école
  class_enrollments — inscriptions élève ↔ classe

Suivi quotidien
  attendance        — session de présences (par classe/jour)
  attendance_records — statut par élève dans une session
  homework          — devoirs assignés
  homework_grades   — notation par élève (étoiles 1-5)
  exam_results      — notes d'examens par trimestre

Finance
  payments          — paiements (budget/revenus)
  expenses          — demandes de dépenses

Communication
  announcements     — annonces école (+ annonces globales Qaf)

Autres
  academic_events   — calendrier académique
  registrations     — inscriptions en ligne
  registration_forms — schéma des formulaires configurables
  substitutions     — demandes de remplacement
  sticky_notes      — mémos admin
  book_tracking     — distribution des livres
```

### Types fondamentaux (inférés depuis Drizzle)

```typescript
// Les types viennent du schéma Drizzle — ne pas les définir manuellement
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { students } from '@/db/schema'
type Student = InferSelectModel<typeof students>
type NewStudent = InferInsertModel<typeof students>

// Enums définis dans le schéma Drizzle
type UserPortalRole = 'admin' | 'teacher' | 'parent'  // cumulables
type AdminSubRole = 'admin' | 'treasurer' | 'manager'  // exclusifs
// admin     → accès complet admin portal
// treasurer → Budget, Dépenses, Élèves, Annonces
// manager   → admin complet SAUF Budget & Dépenses

type Gender = 'male' | 'female'
type TeacherType = 'volunteer' | 'paid'
type PaymentStatus = 'verified' | 'pending' | 'rejected'
type PaymentMethod = 'cash' | 'check' | 'paypal' | 'venmo' | 'no_fees' | 'other'
type PaymentCategory = 'tuition' | 'registration' | 'donation' | 'other'
type PaymentPeriod = 'annually' | 'trimester_1' | 'trimester_2' | 'trimester_3'
type ExpenseStatus = 'pending' | 'approved' | 'paid' | 'rejected'
type SubstitutionStatus = 'open' | 'active' | 'completed'
```

---

## 7. Fonctionnalités à reconstruire proprement

Ces features existent dans l'app actuelle mais ont des problèmes identifiés lors de l'audit :

### 7.1 Période d'examens (PRIORITÉ HAUTE)
**Problème actuel** : Un switch global ferme/ouvre les examens pour toute l'école. Les enseignants et parents voient un bandeau "Période d'examens fermée" bloquant tout.
**À refaire** : La période d'examens doit être configurable par trimestre et par classe, pas globalement. Ajouter un état `examPeriod: { trimester: 1|2|3, isOpen: boolean, openedAt: Timestamp, closedAt: Timestamp }` par classe.

### 7.2 Rapports (PRIORITÉ HAUTE)
**Problème actuel** : Les rapports d'historique de présences ne fonctionnent pas car la "date de début d'année" n'est pas définie dans les paramètres.
**À refaire** : Le premier accès aux Rapports doit déclencher un onboarding guidé pour configurer les dates de l'année scolaire. Bloquer l'accès aux rapports avec un message explicatif + CTA vers les paramètres si non configuré.

### 7.3 Intégration email (PRIORITÉ MOYENNE)
**Problème actuel** : La page "Envoyer un email" demande une connexion Gmail OAuth mais l'intégration semble incomplète.
**À refaire** : Flow OAuth Gmail complet avec gestion du token refresh, fallback sur un template d'email si non connecté, confirmation avant envoi groupé.

### 7.4 Tableau de bord présences/devoirs (PRIORITÉ MOYENNE)
**Problème actuel** : Les pages Suivi des présences et Suivi des devoirs affichent "0 classes journées" sans contexte quand rien n'est saisi.
**À refaire** : Ajouter un vrai dashboard d'alerte avec : liste des classes sans saisie du jour, compteur jours consécutifs sans saisie, bouton Nudge Teachers contextuel par classe.

### 7.5 Onboarding école (PRIORITÉ HAUTE pour nouveau tenant)
**Problème actuel** : Plusieurs fonctionnalités ne marchent pas sans config préalable (date d'année, Gmail, etc.).
**À refaire** : Checklist d'onboarding affichée sur le dashboard admin jusqu'à complétion : [ ] Configurer l'année scolaire [ ] Ajouter un enseignant [ ] Créer une classe [ ] Inscrire un premier élève [ ] Connecter l'email.

---

## 8. Modules — ordre de développement

Développer dans cet ordre strict. Ne pas sauter à un module suivant si le précédent n'est pas terminé (types + service + actions + UI).

```
Phase 1 — Fondations ✅ TERMINÉE (Juin 2026)
  [x] Setup Next.js 16 + TypeScript strict + ESLint (src/proxy.ts = middleware Next.js 16)
  [x] Supabase config (lib/supabase/server.ts + client.ts + admin.ts)
  [x] Drizzle ORM + schéma complet (src/db/schema/ — 7 fichiers, 20+ tables)
  [x] Shadcn/ui v4 (Base UI, pas Radix) + Tailwind v4 + design tokens qaf (globals.css)
  [x] Layout admin (Sidebar dépliable + TopBar + PortalLayout)
  [x] Auth (login form + signIn/signOut actions + callback route + proxy.ts guard)
  [x] Types globaux (lib/constants.ts) + Pattern ActionResult (lib/result.ts)
  [x] Scripts DB (db:push, db:migrate, db:studio, db:generate)

  ⚠️ IMPORTANT — Next.js 16 différences vs 15 :
  - middleware.ts → proxy.ts (export default function proxy())
  - Shadcn utilise @base-ui/react (pas Radix) → pas de prop asChild → utiliser render prop
  - Composant <form> n'existe pas dans shadcn v4 → créé manuellement dans src/components/ui/form.tsx

Phase 2 — Module Students (premier module complet, sert de référence)
  [ ] students.types.ts
  [ ] students.schema.ts
  [ ] students.service.ts
  [ ] students.actions.ts
  [ ] students.hooks.ts
  [ ] Page liste /admin-portal/students
  [ ] Page détail /admin-portal/students/[id]
  [ ] Formulaire création/édition

Phase 3 — Module Teachers
Phase 4 — Module Classes
Phase 5 — Module Attendance
Phase 6 — Module Homework
Phase 7 — Module Exams
Phase 8 — Module Stars
Phase 9 — Module Finance (Budget + Expenses)
Phase 10 — Module Communication (Email + Announcements)
Phase 11 — Module Registrations
Phase 12 — Module Calendar
Phase 13 — Reports
Phase 14 — Settings + Onboarding
Phase 15 — Teacher Portal
Phase 16 — Parent Portal
Phase 17 — TV Mode
```

---

## 9. Règles de collaboration (deux développeurs + Claude Code)

- **Une branche par feature** : `feature/module-students`, `feature/auth`, etc.
- **Jamais de push direct sur `main`** — toujours une PR, même petite
- **Répartition des modules** : chaque développeur prend un module de A à Z (types → UI), pas de découpage par layer
- **Mettre à jour ce fichier** dès qu'une décision d'architecture change
- **Documenter les décisions importantes** dans `docs/decisions/` au format ADR
- **Claude Code** : toujours l'ouvrir à la racine du repo pour qu'il lise ce fichier en premier

---

## 10. Observations visuelles page par page (audit juin 2026)

> Screenshots disponibles dans `screenshots/admin_portal/` (future structure : teacher_portal/, parent_portal/).
> Chaque sous-dossier correspond à une section du portail.

### Dashboard (`/admin-portal`)
- Fond beige chaud avec diamants décoratifs en filigrane
- Sidebar brun dégradé, section "Académique" dépliable
- Pas de vraie homepage : redirige vers la première section disponible

### Étudiants (`/admin-portal/students`)
- En-tête : "Élèves" + "1 élève" + Export Excel + "Créer un nouvel élève"
- Filtres dropdowns : Toutes les années, Trimestre 1/2/3 (tous les statuts)
- Filter chips ronds : Genre (bleu/rose), Inscrit (vert/rouge), Age (dropdown)
- Table avec colonnes triables — données réelles : Chahine BENYAHIA

### Enseignants (`/admin-portal/teachers`)
- Vue cartes (pas tableau), 3 enseignants
- Filter chips : Genre, Actif (vert/rouge), Bénévole (vert/jaune)
- Bouton : Export Excel + "Créer un nouvel enseignant"

### Classes (`/admin-portal/classes`)
- "1 classe" — filtres : Tous les types, Tous les enseignants, Toutes les salles
- Groupement par : "Par type de classe", "Par salle de classe"
- Bouton : Export Excel + "Créer une nouvelle offre de classe"

### Suivi des examens (`/admin-portal/track-exams`)
- **⚠️ BANDEAU JAUNE** : "Période d'examens fermée — Les enseignants et les parents ne peuvent pas voir les boutons d'examens et de notes dans leur portail" + CTA "Activer dans les paramètres"
- Titre : "Suivre les notes d'examen — Suivi de Trimestre 1 2026-2027 • 1 Classes • 1 sans soumission"
- Actions : Summary PDF, Rapport par email
- Vues : Par classe / Par élève / Complétion / Type
- Classe affichée : "Advanced Surahs – From Juz'01 to Juz'24" avec stats 0/1/1/0/0

### Suivi des présences (`/admin-portal/attendance`)
- Sélecteur de date + navigation Jour précédent/suivant + bouton "Summary"
- **"Aperçu des présences"** : 0/1 teachers + **"Nudge Teachers"** (cloche, brun foncé)
- 0 classes soumises (cercle vert avec checkmark)
- Section "Statistiques des élèves" (vide si aucune saisie)
- Section "Sélectionner une classe" groupée par salle

### Suivi des devoirs (`/admin-portal/homework`)
- Structure identique aux présences
- "Aperçu des devoirs" + Nudge Teachers
- Section "Vue d'ensemble des classes" groupée par salle
- "Aucun devoir assigné cette semaine" comme message vide de la classe

### Suivi des étoiles (`/admin-portal/track-stars`)
- "Consultation des notations pour [date]" + navigation
- "Aperçu des notations" : 1/1 Enseignants n'ayant pas soumis de devoir
- Recherche par enseignant ou classe
- Vue "Par nom d'enseignant" / "Par classe"
- Carte enseignant : Aliou SYY, 1 classe, stats 0/0/0 + "Aucun devoir assigné cette semaine"

### Catalogue des classes (`/admin-portal/class-catalog`)
- **36 classes** dans le catalogue global
- Bouton "Créer une nouvelle classe"
- Liste chargée avec un skeleton au départ

### Calendrier académique (`/admin-portal/academic-calendar`)
- Vues : Année / Mois / Semaine / Jour (toggle buttons)
- Filtre "Tous les événements"
- Bouton "Créer un événement"
- Calendrier grille avec dates (juin 2026 visible)

### Rapports et analyses (`/admin-portal/reports`)
- **Section 1** : "Historique des présences scolaires" — toggles 4/8/12 semaines + Pourcentage/Nombre
  - **⚠️ ERREUR** : "Aucune donnée de présence disponible — Date de début d'année non définie dans les paramètres de l'école"
- **Section 2** : "Statistiques de remplacement des enseignants" — boutons "Voir les enseignants" et "Voir les remplacements"

### Suivi des livres (`/admin-portal/book-tracking`)
- Layout split : panneau gauche (sélecteur de classe avec recherche) + panneau droit (détail)
- Vue "Par classe" / "Par élève"
- Sous-titre : "Gérer la distribution des livres pour 2025-2026"
- État vide : "Aucune classe sélectionnée — Veuillez sélectionner une classe"

### Substitutions (`/admin-portal/substitutions`)
- 3 KPI cards : "Demandes ouvertes 0" (beige), "En cours 0" (brun), "Terminé 0" (vert)
- Barre de recherche + bouton "Créer une demande"
- Tabs : Ouvert (0) / Actif (0) / Historique (0)

### Inscriptions (`/admin-portal/registrations`)
- Titre "Inscriptions des élèves" avec 2 boutons : "Modifier les formulaires d'inscription" (orange) + "Télécharger en Excel" (vert)
- "Aucune inscription trouvée"

### Formulaires d'inscription (`/admin-portal/registration-forms`)
- **Form builder complet** : drag-and-drop, onglets "Nouvel élève" / "Réinscription"
- "7 éléments" sur le formulaire
- Actions : "Ajouter un bloc d'info", "Ajouter une section", "Réinitialiser", "Aperçu"
- Formulaire avec sections : "Informations de l'étudiant" (Prénom, Nom, Date de naissance…)
- Info : "Ce formulaire est conçu pour l'inscription d'un seul étudiant"

### Budget (`/admin-portal/finance/budget`)
- 3 KPI cards : Budget Total Revenus 270€ (beige), Dépenses payées 0€ (brun), Budget restant 270€ (vert)
- Boutons : "Enregistrer un revenu" (orange pleine largeur), "Rappeler les parents impayés" (brun), "Télécharger en Excel"
- Filter chips : Venmo / Cash / Check / PayPal / No Fees + Scolarité / Inscription / Don / Autre + Trimestre 1/2/3 / Annually + **"I really can't afford"**
- Statuts : En attente / Vérifié / Rejeté
- 1 résultat : OUILI → Chahine BENYAHIA — Tuition / Annually / Check — 270€ — Vérifié

### Dépenses (`/admin-portal/finance/expenses`)
- 3 KPI cards : Approuvé $0.00 (vert bordure), En attente $0.00 (orange bordure), Payé $0.00 (bleu bordure)
- Recherche + filtres "Tous les statuts" / "Toutes les catégories"
- "Demandes (0)" — "Aucune demande de dépense ne correspond à vos filtres"
- Bouton "Nouvelle dépense" (orange)

### Email (`/admin-portal/communication/send-email`)
- "Envoyer un e-mail" avec section "Intégration Email"
- "Connectez votre compte Gmail pour envoyer des e-mails. Disponible dans le futur prochainement."
- Bouton "Se connecter avec Gmail" (grisé/inactif)

### Annonces (`/admin-portal/announcements`)
- URL : `/admin-portal/announcements` (pas sous /communication/)
- "Restez informé des dernières nouvelles et annonces de Grande Mosquée Lyon Ouest"
- Bouton "Créer une annonce"
- Annonce globale de Qaf Admin : "What's New!" (Apr 5, 2026) avec badge "Global" + "Everyone"
  - Features listées pour Parents et Enseignants (Achievements & Stars, Exam Signatures, etc.)

### Parents (`/admin-portal/parents`)
- URL : `/admin-portal/parents` (pas sous /communication/)
- "Chargement des parents..." au chargement

### Sticky Notes (`/admin-portal/sticky-notes`)
- "Mes mémos — Suivez vos tâches et vos idées"
- Fond beige avec diamants décoratifs (même style que dashboard)
- Bouton "Nouvelle note"

### Anniversaires (`/admin-portal/birthdays`)
- "Birthdays — Celebrating our wonderful students" (interface en anglais ici !)
- "No birthdays in June — Check another month for celebrations"

### Permissions (`/admin-portal/permissions`)
- 3 sections : Administrateurs / Trésoriers / Gestionnaires
- **Administrateurs** : Abdeslam Ouili (salim.ouili@gmail.com, 0625432895) — badges School Admin + Teacher — + lahbak.inttic@gmail.com (Pending)
- **Trésoriers** : "Aucun trésorier assigné"  → Budget, Dépenses, Élèves, Annonces
- **Gestionnaires** : "Aucun gestionnaire assigné" → Admin complet sauf Budget & Dépenses
- Boutons : "Ajouter un nouvel administrateur" (orange), "Ajouter un nouveau trésorier" (vert), "Ajouter un nouveau gestionnaire" (bleu)

### Paramètres de l'école (`/admin-portal/school-settings`)
- Section **Opérations scolaires** : Sélecteur année académique + Sélecteur trimestre
  - Checkbox : "Autoriser les nouvelles inscriptions" (coché) + lien "Modifier le formulaire"
  - Checkbox : "Activer l'affichage des examens et notes dans les portails parents et enseignants" (**décoché** → source du bug période d'examens)
- Section **Jours de classe** : 7 jours, Dimanche + Samedi sélectionnés
- Section **Identité de l'école** + **Logo de l'école**
- Bouton "Contacter le support"

### Modifier le profil (`/admin-portal/edit-profile`)
- 2 colonnes : Identité (Nom, Téléphone, École, Rôles, Langue) | Détails du compte (membre depuis, ID enseignant, enfants liés)
- Rôles toggles : Administrateur / Parent / Enseignant (checkboxes)
- Langue : Français (selector)
- Section "Gérer les enfants" avec bouton "Ajouter un enfant"
- Section "Zone de danger" (rouge)

### Nouvelle année (`/admin-portal/start-new-year`)
- Page avec fond beige et diamants (même style dashboard) — wizard de démarrage d'année

### Roadmap (`/admin-portal/roadmap`)
- "Demandes de fonctionnalités — Votez pour ce qui sera développé ensuite"
- Toggles : Populaire / Nouveau
- Bouton "Suggérer une fonctionnalité"
- Message : "Aidez-nous à nous concentrer sur l'essentiel..."

---

## 11. Ce qui ne doit jamais changer

- L'identité visuelle chaude (brun/doré/crème) de Qaf School
- La navigation par modules dépliables dans la sidebar gauche
- Le système multi-rôles cumulables sur un même compte
- L'architecture multi-tenant avec isolation par `schoolId`
- L'export Excel disponible sur toutes les listes
- Le bouton "Nudge Teachers" sur les pages de suivi
- Le système d'étoiles gamifié (Bronze → Mythic, 10 niveaux de trophées)
- Les filtres visuels par chips colorés (genre, statut, inscription)

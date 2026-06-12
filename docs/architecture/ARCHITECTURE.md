# Architecture Complète — Institut Islamique (Qaf School v2)

> Document à valider avant de démarrer le développement.
> Une fois validé, il devient la référence permanente pour Claude Code et l'équipe.
> Dernière mise à jour : Juin 2026

---

## 1. Vue d'ensemble du produit

Application SaaS multi-tenant de gestion scolaire islamique.
Un même service héberge plusieurs écoles (tenants) avec isolation complète des données.

### Portails et accès

```
qaf.school (ou domaine futur)
│
├── /                          → Landing page publique
├── /auth/login                → Connexion (commun à tous les rôles)
├── /auth/register             → Inscription
├── /auth/callback             → Callback OAuth Supabase
│
├── /admin-portal              → Portail administrateur école
├── /teacher-portal            → Portail enseignant
├── /parent-portal             → Portail parent
└── /student-portal            → Portail élève (Phase future)
```

Les rôles ne sont pas exclusifs. Un même utilisateur peut être :
- Admin + Enseignant + Parent sur la même école
- Admin sur une école et Enseignant sur une autre

### Sous-rôles administratifs (dans admin-portal)
- **admin** → accès complet
- **treasurer** (trésorier) → Budget, Dépenses, Élèves, Annonces uniquement
- **manager** (gestionnaire) → accès admin complet SAUF Budget & Dépenses

---

## 2. Stack technique (décisions finales)

```
Framework    : Next.js 15 (App Router, Server Components, Server Actions)
Langage      : TypeScript strict
DB           : Supabase (PostgreSQL)
ORM          : Drizzle ORM
Auth         : Supabase Auth (JWT + RLS)
Storage      : Supabase Storage
UI           : Shadcn/ui + Tailwind CSS v4
Validation   : Zod
Formulaires  : React Hook Form + Zod resolver
State client : TanStack Query v5 (server state) + Zustand (UI state minimal)
Email        : Resend + React Email
Déploiement  : Vercel (Edge Runtime pour middleware auth)
```

---

## 3. Structure des dossiers (complète)

```
qaf-school/
│
├── src/
│   ├── app/                          # Routes Next.js (App Router)
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── callback/route.ts     # Supabase OAuth callback
│   │   │
│   │   ├── (public)/                 # Landing page
│   │   │   └── page.tsx
│   │   │
│   │   ├── (portals)/                # Route group — layout commun avec sidebar
│   │   │   ├── layout.tsx            # Auth guard + layout avec sidebar
│   │   │   │
│   │   │   ├── admin-portal/
│   │   │   │   ├── page.tsx                     # Dashboard
│   │   │   │   ├── students/
│   │   │   │   │   ├── page.tsx                 # Liste
│   │   │   │   │   └── [id]/page.tsx            # Détail
│   │   │   │   ├── teachers/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   ├── classes/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   ├── track-exams/page.tsx
│   │   │   │   ├── attendance/page.tsx
│   │   │   │   ├── homework/page.tsx
│   │   │   │   ├── track-stars/page.tsx
│   │   │   │   ├── class-catalog/page.tsx
│   │   │   │   ├── academic-calendar/page.tsx
│   │   │   │   ├── reports/page.tsx
│   │   │   │   ├── book-tracking/page.tsx
│   │   │   │   ├── substitutions/page.tsx
│   │   │   │   ├── registrations/page.tsx
│   │   │   │   ├── registration-forms/page.tsx
│   │   │   │   ├── finance/
│   │   │   │   │   ├── budget/page.tsx
│   │   │   │   │   └── expenses/page.tsx
│   │   │   │   ├── communication/
│   │   │   │   │   └── send-email/page.tsx
│   │   │   │   ├── announcements/page.tsx
│   │   │   │   ├── parents/page.tsx
│   │   │   │   ├── sticky-notes/page.tsx
│   │   │   │   ├── birthdays/page.tsx
│   │   │   │   ├── permissions/page.tsx
│   │   │   │   ├── start-new-year/page.tsx
│   │   │   │   ├── roadmap/page.tsx
│   │   │   │   └── school-settings/page.tsx
│   │   │   │
│   │   │   ├── teacher-portal/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── my-classes/page.tsx
│   │   │   │   ├── attendance/page.tsx
│   │   │   │   ├── homework/page.tsx
│   │   │   │   └── exams/page.tsx
│   │   │   │
│   │   │   └── parent-portal/
│   │   │       ├── page.tsx
│   │   │       ├── children/page.tsx
│   │   │       ├── attendance/page.tsx
│   │   │       ├── homework/page.tsx
│   │   │       └── payments/page.tsx
│   │   │
│   │   └── api/
│   │       ├── auth/callback/route.ts
│   │       └── webhooks/             # Webhooks Supabase si besoin
│   │
│   ├── modules/                      # Logique métier par domaine
│   │   ├── students/
│   │   │   ├── students.types.ts     # Types inférés de Drizzle + types UI
│   │   │   ├── students.schema.ts    # Schémas Zod pour formulaires
│   │   │   ├── students.service.ts   # Requêtes Drizzle (server-side only)
│   │   │   ├── students.actions.ts   # Server Actions
│   │   │   └── students.hooks.ts     # TanStack Query hooks (client)
│   │   ├── teachers/
│   │   ├── classes/
│   │   ├── attendance/
│   │   ├── homework/
│   │   ├── exams/
│   │   ├── stars/
│   │   ├── finance/
│   │   ├── communication/
│   │   ├── registrations/
│   │   ├── calendar/
│   │   ├── substitutions/
│   │   ├── books/
│   │   └── school/                   # Paramètres école + permissions
│   │
│   ├── components/
│   │   ├── ui/                       # Shadcn/ui (ne pas modifier)
│   │   ├── shared/                   # Composants réutilisables custom
│   │   │   ├── DataTable/
│   │   │   ├── PageHeader/
│   │   │   ├── KpiCard/              # Cartes métriques colorées
│   │   │   ├── FilterChips/          # Filtres ronds toggle
│   │   │   ├── StatusBadge/
│   │   │   ├── EmptyState/
│   │   │   ├── ConfirmDialog/
│   │   │   ├── WarningBanner/        # Bandeau alerte (ex: période examens)
│   │   │   ├── SplitPanel/           # Layout 2 colonnes (livres, présences)
│   │   │   └── ExcelExportButton/
│   │   └── layouts/
│   │       ├── Sidebar/
│   │       ├── TopBar/
│   │       └── PortalLayout/
│   │
│   ├── db/
│   │   ├── index.ts                  # Instance Drizzle + connection Supabase
│   │   ├── schema/                   # Un fichier par domaine
│   │   │   ├── auth.ts               # profiles, school_members
│   │   │   ├── schools.ts            # schools
│   │   │   ├── academic.ts           # students, classes, enrollments, catalog
│   │   │   ├── tracking.ts           # attendance, homework, exams, stars
│   │   │   ├── finance.ts            # payments, expenses
│   │   │   ├── communication.ts      # announcements
│   │   │   ├── operations.ts         # substitutions, books, registrations, events
│   │   │   └── index.ts              # Re-export tout
│   │   └── migrations/               # Générées par Drizzle Kit
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── server.ts             # Client SSR (Server Components + Actions)
│   │   │   ├── client.ts             # Client browser (Client Components)
│   │   │   └── admin.ts              # Service role (opérations admin uniquement)
│   │   ├── auth/
│   │   │   ├── session.ts            # Helpers session (getSession, requireAuth)
│   │   │   └── permissions.ts        # Vérification rôles/sous-rôles
│   │   ├── email/
│   │   │   └── templates/            # React Email templates
│   │   ├── excel/
│   │   │   └── export.ts             # Helpers export Excel (xlsx)
│   │   ├── utils.ts
│   │   ├── constants.ts
│   │   └── result.ts                 # Pattern ActionResult<T>
│   │
│   ├── types/
│   │   └── index.ts                  # Types globaux non-DB (UI, etc.)
│   │
│   └── middleware.ts                 # Auth guard Supabase (Edge Runtime)
│
├── docs/
│   ├── architecture/
│   │   └── ARCHITECTURE.md           # Ce fichier
│   ├── decisions/
│   │   └── ADR-002-supabase-drizzle.md
│   └── claude-old-conversation-examples/  # Fichiers d'exemple Firebase (référence uniquement)
│       ├── ADR-001-firebase.md
│       ├── firebase-service.example.ts
│       ├── form-component.example.tsx
│       └── server-action.example.ts
│
├── screenshots/
│   ├── admin_portal/                 # Audit visuel portail admin (27 pages)
│   ├── teacher_portal/               # À faire après Phase 13
│   └── parent_portal/                # À faire après Phase 14
├── CLAUDE.md                         # Instructions permanentes pour Claude Code
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 4. Architecture d'authentification

### Flux de connexion

```
User → /auth/login
  → Supabase Auth (email/password ou OAuth)
  → Cookie session (httpOnly, géré par @supabase/ssr)
  → Middleware vérifie la session sur chaque requête /portal ou /admin-portal
  → Redirect vers le bon portail selon le rôle principal
```

### Middleware (Edge Runtime)

```typescript
// src/middleware.ts
// Protège toutes les routes /admin-portal, /teacher-portal, /parent-portal
// Refresh automatique du token Supabase
// Redirect vers /auth/login si non authentifié
```

### Récupération du contexte utilisateur

```typescript
// Dans un Server Component ou Server Action :
import { getSession } from '@/lib/auth/session'

const session = await getSession()
// session.user.id, session.schoolId, session.roles, session.adminSubRole
```

### RLS (Row Level Security)

Toutes les tables avec `school_id` ont une RLS policy. Le middleware injecte le `school_id`
via le contexte JWT. Le code applicatif **ne filtre jamais par school_id manuellement** —
c'est la DB qui l'applique automatiquement.

---

## 5. Patterns de code

### Pattern d'un module complet

Chaque module suit strictement cet ordre. Ne jamais sauter une étape.

```
src/modules/students/
├── students.types.ts    → Types UI + types inférés Drizzle
├── students.schema.ts   → Schémas Zod pour formulaires
├── students.service.ts  → Requêtes Drizzle (server only)
├── students.actions.ts  → Server Actions (appellent le service)
└── students.hooks.ts    → TanStack Query hooks (client)
```

**1. types.ts** — Types inférés + types UI supplémentaires
```typescript
import type { InferSelectModel } from 'drizzle-orm'
import { students } from '@/db/schema'

export type Student = InferSelectModel<typeof students>
export type StudentWithClass = Student & { className: string }  // type étendu pour l'UI
```

**2. schema.ts** — Validation Zod pour formulaires
```typescript
import { z } from 'zod'

export const createStudentSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
  gender: z.enum(['male', 'female']),
  birthDate: z.string().optional(),
})
export type CreateStudentInput = z.infer<typeof createStudentSchema>
```

**3. service.ts** — SEUL endroit avec du code Drizzle
```typescript
import { db } from '@/db'
import { students } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const studentsService = {
  async getBySchool(schoolId: string): Promise<Student[]> {
    return db.select().from(students).where(eq(students.schoolId, schoolId))
  },
  // ...
}
```

**4. actions.ts** — Server Actions
```typescript
'use server'
import { studentsService } from './students.service'
import { getSession } from '@/lib/auth/session'
import type { ActionResult } from '@/lib/result'

export async function getStudentsAction(): Promise<ActionResult<Student[]>> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Non authentifié' }
  try {
    const data = await studentsService.getBySchool(session.schoolId)
    return { success: true, data }
  } catch {
    return { success: false, error: 'Erreur lors du chargement' }
  }
}
```

**5. hooks.ts** — TanStack Query (client)
```typescript
'use client'
import { useQuery } from '@tanstack/react-query'
import { getStudentsAction } from './students.actions'

export function useStudents() {
  return useQuery({
    queryKey: ['students'],
    queryFn: () => getStudentsAction().then(r => r.success ? r.data : Promise.reject(r.error)),
  })
}
```

---

## 6. Modèle de données détaillé (Drizzle schema)

### Tables globales (sans school_id)

```typescript
// class_catalog — 36 modèles de classes disponibles pour toutes les écoles
class_catalog {
  id, code, name, type ('quran'|'nuraniyah'), level, description, created_at
}
```

### Tables d'authentification

```typescript
// profiles — informations supplémentaires sur les utilisateurs Supabase Auth
profiles {
  id, user_id (FK auth.users), full_name, phone, avatar_url,
  created_at, updated_at
}

// school_members — appartenance et rôles d'un utilisateur dans une école
school_members {
  id, school_id (FK schools), user_id (FK auth.users),
  portal_roles ('admin'|'teacher'|'parent')[],   -- tableau de rôles cumulables
  admin_sub_role ('admin'|'treasurer'|'manager'|null),
  is_pending (bool),
  created_at, created_by
}
```

### Tables école

```typescript
// schools — un enregistrement par tenant
schools {
  id, name, slug, logo_url,
  settings: {
    school_days: ('sunday'|'monday'|...[]),
    academic_year: string,
    current_trimester: (1|2|3),
    allow_new_registrations: bool,
    exam_period_open: bool,   -- ⚠️ BUG CONNU: remplacer par logique par trimestre/classe
    year_start_date: date,
    year_end_date: date,
  },
  created_at, updated_at
}
```

### Tables académiques

```typescript
students {
  id, school_id, first_name, last_name, birth_date, gender,
  profile_photo_url, notes,
  created_at, updated_at, created_by
}

parent_students {
  parent_user_id (FK auth.users), student_id (FK students), school_id
  -- PK composite: (parent_user_id, student_id)
}

classes {
  id, school_id, catalog_class_id (FK class_catalog), teacher_id (FK school_members),
  room, section, academic_year, is_active,
  exam_period: { trimester_1_open, trimester_2_open, trimester_3_open },  -- fix du bug
  created_at, updated_at
}

class_enrollments {
  id, class_id (FK classes), student_id (FK students), school_id,
  enrolled_at, unenrolled_at (nullable)
}
```

### Tables de suivi quotidien

```typescript
attendance {
  id, school_id, class_id (FK classes), date,
  submitted_by (FK school_members), submitted_at
}

attendance_records {
  id, attendance_id (FK attendance), student_id (FK students),
  status ('present'|'absent'|'late'|'excused'), note
}

homework {
  id, school_id, class_id (FK classes), title, type ('quran'|'nuraniyah'),
  description, assigned_date, due_date,
  created_by (FK school_members), created_at
}

homework_grades {
  id, homework_id (FK homework), student_id (FK students), school_id,
  stars (1-5), note,
  graded_by (FK school_members), graded_at
}

exam_results {
  id, school_id, class_id (FK classes), student_id (FK students),
  trimester (1|2|3), score, max_score, notes,
  submitted_by (FK school_members), submitted_at
}
```

### Tables finance

```typescript
payments {
  id, school_id, student_id (FK students), parent_name,
  amount, currency ('EUR'|'USD'),
  method ('cash'|'check'|'paypal'|'venmo'|'no_fees'|'other'),
  category ('tuition'|'registration'|'donation'|'other'),
  period ('annually'|'trimester_1'|'trimester_2'|'trimester_3'),
  financial_option ('i_really_cant_afford'|null),
  status ('verified'|'pending'|'rejected'),
  notes, payment_date,
  submitted_by (FK school_members), created_at
}

expenses {
  id, school_id, amount, currency,
  description, category,
  status ('pending'|'approved'|'paid'|'rejected'),
  submitted_by (FK school_members),
  approved_by (FK school_members, nullable),
  receipt_url (nullable), created_at, updated_at
}
```

### Tables communication

```typescript
announcements {
  id, school_id (nullable pour les annonces globales Qaf),
  title, content (rich text),
  audience ('everyone'|'parents'|'teachers'|'admins'),
  is_global (bool),  -- annonces de l'équipe Qaf
  created_by (FK school_members|null), created_at
}
```

### Tables opérationnelles

```typescript
substitutions {
  id, school_id, class_id (FK classes),
  requesting_teacher_id (FK school_members),
  substitute_id (FK school_members, nullable),
  date, status ('open'|'active'|'completed'),
  notes, created_at, updated_at
}

book_tracking {
  id, school_id, class_id (FK classes), student_id (FK students),
  book_name, distributed_at (nullable), returned_at (nullable),
  academic_year, notes
}

academic_events {
  id, school_id, title, description,
  type ('holiday'|'exam'|'event'|'other'),
  start_date, end_date, is_all_day,
  created_by, created_at
}

registrations {
  id, school_id, form_id (FK registration_forms),
  form_data (jsonb),  -- données soumises par le parent
  status ('pending'|'approved'|'rejected'),
  submitted_at, reviewed_by, reviewed_at, notes
}

registration_forms {
  id, school_id,
  form_type ('new_student'|'reenrollment'),
  form_schema (jsonb),  -- schéma du form builder
  is_active, version, created_at, updated_at
}

sticky_notes {
  id, school_id, user_id (FK auth.users),
  content, color, position_x, position_y,
  created_at, updated_at
}
```

---

## 7. Architecture des portails

### Portail Admin (`/admin-portal`)

Sidebar avec sections dépliables :
```
Académique
  Étudiants | Enseignants | Classes
  Suivi des examens | Présences | Devoirs | Étoiles
  Catalogue | Calendrier | Rapports | Livres | Substitutions

Finance
  Budget | Dépenses

Communication
  Email | Annonces | Parents

---
Inscriptions | Formulaires
Mémos | Anniversaires | Permissions
Démarrer nouvelle année | Roadmap
Paramètres de l'école | Mon profil
```

### Portail Enseignant (`/teacher-portal`)
Accès limité aux classes de l'enseignant connecté.
```
Mes classes | Présences | Devoirs | Examens | Suivi des étoiles
```

### Portail Parent (`/parent-portal`)
Accès limité aux enfants liés au compte parent.
```
Mes enfants | Présences | Devoirs | Notes | Paiements
```

---

## 8. Gestion de l'isolation multi-tenant

### Règle d'or
> Le `school_id` n'est JAMAIS passé par l'URL ou le body de formulaire.
> Il est toujours récupéré depuis la session authentifiée.

### Flux typique
```typescript
// Server Action
export async function createStudentAction(input: CreateStudentInput) {
  const session = await getSession()        // session contient schoolId
  if (!session) return unauthorized()
  if (!session.roles.includes('admin'))     // vérification rôle
    return forbidden()
  
  return studentsService.create(session.schoolId, input)
  // Le service utilise session.schoolId — jamais un paramètre externe
}
```

---

## 9. Pratiques de développement

### Git
- `main` → production (protégé, jamais de push direct)
- `develop` → intégration
- `feature/[module]-[description]` → features (ex: `feature/students-list`)
- Une PR = un module ou une feature cohérente
- Review obligatoire avant merge

### Variables d'environnement requises
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # Server uniquement — jamais exposé client
DATABASE_URL=                   # Connection directe pour Drizzle migrations
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=
```

### Scripts utiles
```bash
npm run dev                    # Dev server
npm run db:push                # Push schema vers Supabase (dev)
npm run db:migrate             # Créer + appliquer migrations (prod)
npm run db:studio              # Drizzle Studio (explorer la DB visuellement)
npm run db:generate            # Générer les fichiers de migration
```

---

## 10. Ordre de développement — Phase Admin Portal

```
Phase 1 — Fondations
  [ ] next-app avec TypeScript strict + ESLint + Prettier
  [ ] Supabase projet + variables d'environnement
  [ ] Drizzle config + schéma initial (schools, profiles, school_members)
  [ ] Migrations + RLS policies
  [ ] Auth flow (login/logout/callback/middleware)
  [ ] Layout admin (Sidebar + TopBar + PortalLayout)
  [ ] Design tokens Tailwind (palette qaf)
  [ ] Composants shared de base (PageHeader, EmptyState, KpiCard)

Phase 2 — Module Students
  [ ] DB: table students + enrollments + RLS
  [ ] Module complet (types → service → actions → hooks)
  [ ] Page liste avec DataTable, FilterChips, Export Excel
  [ ] Page détail + formulaire création/édition

Phase 3 — Module Teachers
Phase 4 — Module Classes + Catalogue
Phase 5 — Attendance + Homework (suivi quotidien)
Phase 6 — Exams + Stars (évaluations)
Phase 7 — Finance (Budget + Dépenses)
Phase 8 — Communication (Email Resend + Annonces)
Phase 9 — Inscriptions + Form Builder
Phase 10 — Calendrier + Rapports
Phase 11 — Substitutions + Livres + Divers
Phase 12 — Settings + Permissions + Onboarding
Phase 13 — Teacher Portal
Phase 14 — Parent Portal
Phase 15 — Student Portal (future)
```

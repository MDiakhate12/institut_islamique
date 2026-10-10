# Qaf School — Instructions permanentes pour Claude Code

> **Ce fichier est lu par Claude Code à chaque session.**
> Il contient tout le contexte nécessaire pour travailler sur ce projet sans briefing verbal.
> Ne jamais le supprimer. Le mettre à jour dès qu'une décision d'architecture change.
> Plusieurs développeurs travaillent sur ce projet avec leur propre session Claude — ce fichier est le seul briefing commun.

---

## 0. Comment travailler avec Claude Code sur ce projet

### Workflow standard pour coder une nouvelle page

1. **Aller sur le site de référence** : https://www.qaf.app/admin-portal  
   Se connecter et naviguer jusqu'à la page à reproduire.

2. **Prendre des screenshots manuellement** (c'est le développeur qui le fait, pas Claude).  
   Capturer tous les états de la page : liste vide, liste remplie, modal ouvert, états d'erreur, etc.

3. **Créer un dossier de screenshots** avec la convention de nommage suivante :
   ```
   admin_<nom_de_la_page>    → pour les pages du portail admin
   teacher_<nom_de_la_page>  → pour les pages du portail enseignant
   parent_<nom_de_la_page>   → pour les pages du portail parent
   public_<nom>              → pour les pages publiques

   Exemples : admin_students, admin_budget, teacher_attendance, parent_homework
   ```

4. **Dans la session Claude Code**, ajouter le dossier de screenshots au contexte (drag & drop ou "Add to context").

5. **Écrire le prompt** en décrivant la page à construire. Claude dispose alors du visuel exact ET du contexte complet de ce fichier.

### Ce que Claude ne fait jamais dans ce projet
- Ne prend jamais de screenshot de lui-même
- Ne propose jamais d'architecture différente de celle décrite ici sans le signaler explicitement
- Ne touche jamais aux fichiers du schéma Drizzle sans vérifier qu'une migration est nécessaire

### Avant de commencer une tâche
Lire ces sections en priorité :
- **Section 4** — Conventions de code (règles absolues)
- **Section 7** — Décisions d'architecture (pièges connus)
- **Section 9** — État d'avancement (quoi est déjà construit)

---

## 1. Contexte produit

**Qaf School** est une application SaaS de gestion scolaire islamique multi-tenant.
Site de référence : https://www.qaf.app/admin-portal

### Ce que fait l'application
Chaque école (tenant) gère indépendamment :
- Ses élèves, enseignants et classes (Coran / Nuraniyah / Arabe / Islamique)
- Les présences, devoirs, notes d'examens et étoiles (système gamifié)
- Sa comptabilité (frais de scolarité, dépenses)
- Ses communications (annonces, emails aux parents)
- Son calendrier académique
- Un catalogue de classes pré-définies (**36 modèles** disponibles)
- Des inscriptions en ligne via formulaires configurables (form builder)
- Une TV mode (affichage mural)

### Rôles utilisateur
Un même compte peut cumuler plusieurs rôles simultanément :
- **School Admin** — accès complet au portail d'administration
- **Teacher (Enseignant)** — accès au portail enseignant (ses classes uniquement)
- **Parent** — accès au portail parent (ses enfants uniquement)

Sous-rôles admin (exclusifs) :
- `admin` → accès complet
- `treasurer` → Budget, Dépenses, Élèves, Annonces uniquement
- `manager` → admin complet SAUF Budget, Dépenses & Autorisations

### École de référence pour les tests (Attawba / Grande Mosquée Lyon Ouest)
- **Admin** : Abdeslam Ouili — salim.ouili@gmail.com — 0625432895
- **Rôles** : School Admin + Enseignant + Parent (cumulés sur le même compte)
- **Slug** : `attawba`
- **School ID** : `46ab59d0-5078-465d-af56-e9e88db6d71e`
- Jours de classe : Dimanche + Samedi
- 1 élève : Chahine BENYAHIA (classe QRN-402-1, famille OUILI)
- 3 enseignants : Aliou SY (bénévole), Aliou SYY (payé), assam (bénévole)
- 1 classe active : "Advanced Surahs – From Juz'01 to Juz'24" (QRN-402-1, Room 1)
- Budget : 270€ — 1 paiement Tuition / Annually / Check — Vérifié

---

## 2. Stack technique

| Couche | Technologie | Notes |
|---|---|---|
| Framework | **Next.js 16 — App Router** | Server Components, Server Actions, `proxy.ts` (pas `middleware.ts`) |
| Langage | **TypeScript strict** | Types inférés depuis Drizzle — jamais définis manuellement |
| Base de données | **Supabase (PostgreSQL)** | RLS multi-tenant, remplace Firebase |
| ORM | **Drizzle ORM** | Schéma dans `src/db/schema/`, source de vérité absolue |
| Auth | **Supabase Auth** | JWT, session gérée via `src/lib/auth/session.ts` |
| Storage | **Supabase Storage** | Photos profil, logos école |
| UI components | **Shadcn/ui v4** | Basé sur **@base-ui/react** (pas Radix) — voir section 7 |
| Styling | **Tailwind CSS v4** | Pas de CSS modules, pas de style inline |
| Validation | **Zod** | Schémas = source de vérité types + validation formulaires |
| Formulaires | **React Hook Form + Zod** | Intégration native |
| State serveur | **TanStack Query v5 + Server Actions** | Pas de Redux, pas de Zustand |
| IDs client | **nanoid** | Pour générer des IDs dans les composants client |
| Drag & Drop | **@dnd-kit/core + @dnd-kit/sortable** | Utilisé dans le FormBuilder |
| Email | **Resend** | API email transactionnel |
| Déploiement | **Vercel** | |

### Supabase Drizzle — connexion DB
Configurée via la variable d'environnement `DATABASE_URL` dans `.env.local` (jamais commitée dans un fichier suivi par git — voir `.claude/rules/secrets-handling.md`).
Scripts disponibles : `db:push`, `db:migrate`, `db:studio`, `db:generate`

---

## 3. Structure des dossiers

```
src/
├── app/
│   ├── (auth)/                       # Login, reset password
│   │   └── login/page.tsx
│   ├── (portals)/                    # Layout partagé avec sidebar
│   │   ├── layout.tsx
│   │   ├── admin-portal/             # Portail School Admin
│   │   │   ├── page.tsx
│   │   │   ├── students/             # ✅ Construit
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   ├── [id]/page.tsx
│   │   │   │   ├── StudentsClient.tsx
│   │   │   │   ├── StudentForm.tsx
│   │   │   │   └── students.excel.ts
│   │   │   ├── teachers/             # ✅ Construit
│   │   │   ├── classes/              # ✅ Construit
│   │   │   ├── class-catalog/        # ↪ redirige vers /classes (catalogue intégré à la page Classes)
│   │   │   │   ├── ClassCatalogClient.tsx
│   │   │   │   └── ClassCatalogForm.tsx
│   │   │   ├── academic-calendar/    # ✅ Construit
│   │   │   │   ├── AcademicCalendarClient.tsx
│   │   │   │   ├── EventFormDialog.tsx
│   │   │   │   └── EventDetailDialog.tsx
│   │   │   ├── registration-forms/   # ✅ Construit (form builder complet)
│   │   │   │   ├── FormBuilder.tsx
│   │   │   │   ├── RegistrationFormsClient.tsx
│   │   │   │   ├── AddFieldDialog.tsx
│   │   │   │   ├── AddInfoBlockDialog.tsx
│   │   │   │   ├── AddSectionDialog.tsx
│   │   │   │   └── RichTextEditor.tsx
│   │   │   ├── registrations/        # ✅ Construit (liste)
│   │   │   ├── school-settings/      # ✅ Construit
│   │   │   ├── attendance/           # ✅ Construit (AdminAttendanceClient)
│   │   │   ├── homework/             # ✅ Construit (HomeworkTrackingClient — suivi devoirs par classe)
│   │   │   ├── parents/              # ✅ Construit (ParentsClient — liste élèves + parents liés)
│   │   │   ├── announcements/        # ✅ Construit (CRUD + RTE + upload image + audience)
│   │   │   ├── permissions/          # ✅ Construit (3 sections + search + revoke "REVOKE")
│   │   │   ├── track-exams/          # ✅ Construit (suivi des bulletins, §7.20)
│   │   │   ├── track-stars/          # ❌ ComingSoon
│   │   │   ├── reports/              # ❌ ComingSoon
│   │   │   ├── book-tracking/        # ❌ ComingSoon
│   │   │   ├── substitutions/        # ❌ ComingSoon
│   │   │   ├── finance/
│   │   │   │   ├── budget/           # ✅ Construit (§7.13)
│   │   │   │   └── expenses/         # ✅ Construit (§7.13)
│   │   │   ├── communication/
│   │   │   │   └── send-email/       # ❌ ComingSoon
│   │   │   ├── sticky-notes/         # ❌ ComingSoon
│   │   │   ├── birthdays/            # ❌ ComingSoon
│   │   │   ├── start-new-year/       # ❌ ComingSoon
│   │   │   ├── roadmap/              # ❌ ComingSoon
│   │   │   ├── rankings/             # ❌ ComingSoon
│   │   │   └── tv/                   # ❌ ComingSoon
│   │   ├── teacher-portal/           # ✅ Construit sauf remplacements et emploi du temps
│   │   │   ├── layout.tsx            # ✅ Sidebar + gate d'activation
│   │   │   ├── classes/              # ✅ Mes classes (MyClassesClient)
│   │   │   ├── homework/             # ✅ Devoirs (CRUD + Jitsi)
│   │   │   ├── attendance/           # ✅ Présences (AttendanceClient)
│   │   │   ├── announcements/        # ✅ Annonces (feed lecture seule)
│   │   │   ├── audio/                # ✅ Audio Coran (QuranAudioClient)
│   │   │   ├── calendar/             # ✅ Calendrier (readonly, partagé admin)
│   │   │   ├── catalog/              # ↪ redirige vers /classes
│   │   │   ├── profile/              # ✅ Profil (partagé ProfileSettingsClient)
│   │   │   ├── exams/                # ✅ Notation des bulletins (§7.20)
│   │   │   ├── substitutions/        # ❌ ComingSoon
│   │   │   ├── refunds/              # ✅ Remboursements + heures (§7.13)
│   │   │   └── schedule/             # ❌ ComingSoon
│   │   └── parent-portal/            # ✅ Construit sauf étoiles, absences et emploi du temps
│   │       ├── layout.tsx            # ✅ Sidebar + guard rôle 'parent'
│   │       ├── page.tsx              # ✅ Dashboard
│   │       ├── children/             # ✅ Classes de mes enfants (cartes par matière + Présence/Devoirs)
│   │       ├── enrollment/           # ✅ S'inscrire (sélection, [studentId], new, success)
│   │       ├── homework/             # ✅ Devoirs (vue chronologie/classe, lecteur Coran, audio MediaRecorder)
│   │       ├── announcements/        # ✅ Annonces (feed lecture seule)
│   │       ├── attendance/           # ✅ Présences (ParentAttendanceClient)
│   │       ├── audio/                # ✅ Audio Coran (QuranAudioClient partagé)
│   │       ├── calendar/             # ✅ Calendrier (readonly, partagé admin)
│   │       ├── catalog/              # ↪ redirige vers /children
│   │       ├── profile/              # ✅ Profil (partagé ProfileSettingsClient)
│   │       ├── exams/                # ✅ Bulletins + signature (§7.20)
│   │       ├── payments/             # ✅ Statut de paiement + « Marquer comme payé » (§7.13)
│   │       ├── stars/                # ❌ ComingSoon
│   │       ├── absence/              # ❌ ComingSoon
│   │       └── schedule/             # ❌ ComingSoon
│   └── portal/
│       └── register/[schoolSlug]/    # ✅ Portail public d'inscription
│           ├── layout.tsx
│           ├── page.tsx              # Nouvel élève
│           ├── PublicRegistrationForm.tsx
│           ├── reenroll/page.tsx     # Réinscription
│           └── success/page.tsx
│
├── modules/                          # Logique métier — CŒUR DU PROJET
│   ├── students/        ✅ (types, schema, service, actions, hooks)
│   ├── teachers/        ✅
│   ├── classes/         ✅ (inclut class_catalog et class_enrollments)
│   ├── calendar/        ✅
│   ├── registrations/   ✅ (form builder + soumission publique)
│   ├── school/          ✅ (paramètres, settings JSONB)
│   ├── attendance/      ✅ (types+service+actions+hooks — admin + teacher + parent)
│   ├── homework/        ✅ (types+schema+service+actions+hooks — teacher + admin + parent)
│   ├── announcements/   ✅ (types+schema+service+actions+hooks — admin CRUD + teacher/parent feed)
│   ├── permissions/     ✅ (types+service+actions+hooks — admin seulement)
│   ├── parents/         ✅ (types+service+actions+hooks — lien parent-élève + OTP)
│   ├── profile/         ✅ (types+schema+service+actions+hooks — partagé tous portails)
│   ├── teacher-classes/ ✅ (types+service+actions+hooks — classes épinglées enseignant)
│   ├── exams/           ✅ (types+schema+service+actions+hooks — teacher submit + admin tracking + parent view+signature)
│   ├── payments/        ✅ (§7.13 — Budget admin + paiements parent)
│   ├── expenses/        ✅ (§7.13 — dépenses / remboursements)
│   ├── wages/           ✅ (§7.13 — heures des enseignants payés)
│   ├── notifications/   ✅ (notifications in-app, cloche des 3 portails)
│   ├── stars/           ❌
│   ├── substitutions/   ❌
│   ├── communication/   ❌
│   └── books/           ❌
│
├── components/
│   ├── ui/                           # Shadcn/ui (ne pas modifier)
│   ├── shared/                       # Composants réutilisables custom
│   └── layouts/
│       ├── Sidebar/
│       │   ├── Sidebar.tsx           # Sidebar dépliable avec UserProfileDialog
│       │   └── UserProfileDialog.tsx # Dialog profil/déconnexion (clic sur bloc user)
│       ├── Header/
│       └── PortalLayout/
│
├── db/
│   ├── schema/
│   │   ├── index.ts       # Export centralisé
│   │   ├── schools.ts     # Table schools + type SchoolSettings
│   │   ├── auth.ts        # profiles, school_members
│   │   ├── academic.ts    # students, classes, class_catalog, class_enrollments
│   │   ├── tracking.ts    # attendance, homework, exams, stars
│   │   ├── finance.ts     # payments, expenses
│   │   ├── communication.ts # announcements
│   │   └── operations.ts  # registrations, registration_forms, substitutions,
│   │                      # academic_events, book_tracking, sticky_notes, notifications
│   ├── auth-users.ts      # auth.users (Supabase) en lecture seule — hors schema/ exprès (§4.4)
│   └── index.ts           # Client Drizzle
│
└── lib/
    ├── auth/
    │   ├── session.ts      # requireSession() — à appeler dans chaque page protégée
    │   ├── permissions.ts  # Guards par rôle
    │   └── admin.ts        # Supabase Admin SDK
    ├── supabase/
    │   ├── server.ts       # Client server-side
    │   └── client.ts       # Client browser-side
    ├── result.ts           # Pattern ActionResult<T>
    ├── dates.ts            # Dates ISO dans le fuseau de l'école (§7.21)
    ├── email.ts            # Envoi + destinataires (admins, membres par rôle, parents)
    ├── utils.ts            # cn(), helpers
    └── constants.ts        # Constantes globales
```

---

## 4. Conventions de code — TOUJOURS respecter

### 4.1 Nommage des fichiers
```
Composants React        → PascalCase           StudentCard.tsx
Hooks                   → camelCase + use       useStudents.ts
Server Actions          → fichier .actions.ts   students.actions.ts
Services                → fichier .service.ts   students.service.ts
Schémas Zod             → fichier .schema.ts    students.schema.ts
Types                   → fichier .types.ts     students.types.ts
Pages Next.js           → lowercase kebab       /students/[id]/page.tsx
Dossiers de screenshots → admin_<page>          admin_students, parent_homework
```

### 4.2 Structure obligatoire d'un module
Respecter cet ordre dans chaque module :

```typescript
// 1. [module].types.ts
export type Student = {
  id: string
  schoolId: string   // ← TOUJOURS présent — isolation tenant
  firstName: string
  // ...
}

// 2. [module].schema.ts
import { z } from 'zod'
export const createStudentSchema = z.object({ ... })
export type CreateStudentInput = z.infer<typeof createStudentSchema>

// 3. [module].service.ts — SEUL endroit qui touche Drizzle/DB
import { db } from '@/db'
export const studentsService = {
  async getBySchool(schoolId: string): Promise<Student[]> { ... },
  async create(schoolId: string, data: CreateStudentInput): Promise<Student> { ... },
}

// 4. [module].actions.ts — Server Actions qui appellent le service
'use server'
import { requireSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/result'
export async function getStudentsAction(): Promise<ActionResult<Student[]>> {
  const session = await requireSession()
  try {
    const data = await studentsService.getBySchool(session.schoolId)
    return ok(data)
  } catch (e) {
    return err('Erreur lors du chargement')
  }
}

// 5. [module].hooks.ts — React hooks côté client
'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
export function useStudents() {
  return useQuery({ queryKey: ['students'], queryFn: () => getStudentsAction().then(r => r.data) })
}
```

### 4.3 Pattern ActionResult — gestion d'erreurs

```typescript
// src/lib/result.ts
export type ActionResult<T> = { success: true; data: T } | { success: false; error: string }
export const ok  = <T>(data: T): ActionResult<T>  => ({ success: true, data })
export const err = (e: string): ActionResult<never> => ({ success: false, error: e })
export const unauthorized = () => err('Non autorisé')

// Dans un composant client — ne jamais faire de try/catch ici
const result = await someAction()
if (!result.success) { toast.error(result.error); return }
// result.data est typé ici
```

### 4.4 Règles DB / Drizzle — absolues
- ❌ Jamais importer Supabase/Drizzle directement dans un composant React ou un hook
- ❌ Jamais de SQL brut en dehors des migrations
- ✅ Pour lire `auth.users` (e-mails, recherche par e-mail), utiliser la table typée `authUsers` et ses helpers (`getAuthUserIdByEmail`, `getAuthEmailByUserId`) de `src/db/auth-users.ts` — **jamais** `db.execute(sql\`... auth.users ...\`)`. Ce fichier est volontairement hors de `src/db/schema/` pour que drizzle-kit ne touche jamais au schéma `auth`. E-mails de destinataires : helpers de `src/lib/email.ts` (`getAdminEmails`, `getMemberEmails(schoolId, role?)`, `getParentEmailsForClass`, `getParentEmailsForStudent`). Deux requêtes SQL brutes à colonne erronée (`ps.parent_member_id`, `"school_members"."portal_roles"` sous alias) ont empêché pendant des mois l'envoi des e-mails de devoirs et d'annonces sans qu'aucune erreur ne remonte.
- ✅ Tout accès DB passe par `src/modules/[module]/[module].service.ts`
- ✅ Toutes les tables ont une colonne `school_id`
- ✅ Le schéma Drizzle (`src/db/schema/`) est la source de vérité absolue
- ✅ Inférer les types depuis Drizzle : `$inferSelect`, `$inferInsert` (ne pas les réécrire)

### 4.5 Composants — règles
- Server Components par défaut ; `'use client'` uniquement si nécessaire
- Un composant = un fichier
- Les `page.tsx` sont légères : data fetching + passage de props à un composant client
- Toujours Shadcn en premier, composant custom uniquement si Shadcn ne suffit pas

### 4.6 Styling — règles
- ❌ Jamais de style inline `style={{ ... }}`
- ❌ Jamais de fichiers CSS modules (sauf exception justifiée — ex: calendar.css)
- ✅ Tailwind exclusivement
- ✅ `cn()` de `@/lib/utils` pour les classes conditionnelles

---

## 5. Design system

### Couleurs principales (utiliser ces valeurs exactes)
```
#c2440f  → Orange brûlé — CTA principal, boutons "Créer", focus rings, onglet actif
#7a4f30  → Brun chaud    — Sidebar, boutons "Nudge Teachers", sections secondaires
#5c3820  → Brun foncé   — Hover sur brun chaud
#16a34a  → Vert          — Export Excel, actions positives, succès
#fdf6f0  → Beige clair   — Fond des pages, filigrane
```

### Couleurs de boutons (à respecter absolument)
- **Orange `#c2440f` hover `#a33a0d`** → actions principales (Créer, Enregistrer, Soumettre)
- **Vert `#16a34a`** → export Excel
- **Brun `#7a4f30` hover `#5c3820`** → actions de communication, Ajouter une section
- **Outline/blanc** → actions tertiaires (Aperçu, Annuler, Copier le lien)
- **Rouge destructif** → Supprimer, Zone de danger

### Composants récurrents

**Layout**
- **Sidebar** : fond brun dégradé, sections dépliables, bloc user cliquable en bas (ouvre `UserProfileDialog`)
- **UserProfileDialog** : dialog avec avatar, rôles, infos compte, lien "Modifier le profil", bouton "Se déconnecter"
- **TopBar** : "Application Scolaire Qaf" + statut + badge école + badges rôles colorés

**Listes**
- **PageHeader** : `h1` + sous-titre gris + boutons action à droite (Export vert + Créer orange)
- **DataTable** : colonnes triables, recherche, filtres dropdowns, export Excel
- **FilterChips** : pills ronds toggle colorés (genre bleu/rose, actif vert/rouge, bénévole jaune)
- **KpiCard** : 3 cartes côte à côte, couleurs distinctes par contexte

**UI**
- **StatusBadge** : Vérifié (vert), En attente (orange), Rejeté (rouge), Système (ambre), Bénévole (violet)
- **SplitPanel** : gauche sélecteur de classe, droite contenu — Livres, Présences
- **EmptyState** : icône + titre + sous-texte contextuel
- **WarningBanner** : bandeau ambre en haut (ex: période d'examens fermée)
- **NudgeButton** : cloche brun foncé, présent sur Présences et Devoirs

---

## 6. Modèle de données (PostgreSQL / Drizzle)

Schéma complet dans `src/db/schema/`. Fichiers :
- `schools.ts`     → schools (+ type SchoolSettings en JSONB)
- `auth.ts`        → profiles, school_members
- `academic.ts`    → students, classes, class_catalog, class_enrollments
- `tracking.ts`    → attendance, attendance_records, homework, homework_grades, exam_results
- `finance.ts`     → payments, expenses
- `communication.ts` → announcements
- `operations.ts`  → registrations, registration_forms, substitutions, academic_events, book_tracking, sticky_notes

### Tables clés

```
schools           — tenants (slug unique, settings JSONB)
profiles          — infos utilisateur (lié à auth.users)
school_members    — membre d'une école + rôles + sous-rôle admin
students          — élèves (school_id obligatoire)
parent_students   — lien parent ↔ élève (many-to-many)
class_catalog     — 36 modèles globaux (pas de school_id, nextClassId self-ref)
classes           — classes actives d'une école
class_enrollments — inscriptions élève ↔ classe (paidT1/T2/T3)
registration_forms — schéma JSONB du form builder (getOrCreate à la 1ère visite)
registrations     — soumissions parents (formData JSONB, status pending/approved/rejected)
academic_events   — calendrier (createdBy → school_members.id)
```

### Enums Drizzle (ne pas redéfinir)
```typescript
gender                → 'male' | 'female'
registration_status   → 'pending' | 'approved' | 'rejected'
substitution_status   → 'open' | 'active' | 'completed'
academic_event_type   → 'exam' | 'meeting' | 'fun_event' | 'holiday' | ...
```

### Type SchoolSettings (JSONB dans schools.settings)
Contient : `schoolDays`, `academicYear`, `currentTrimester`, `allowNewRegistrations`,
`gradeLevels`, `rooms`, `classPeriods`, `financialOptions`, `paymentModes`, etc.
Voir `src/db/schema/schools.ts` pour la définition complète.

---

## 7. Décisions d'architecture — LIRE AVANT DE CODER

### 7.1 @base-ui/react : `render` prop, pas `asChild`
Shadcn v4 utilise **@base-ui/react** (pas Radix). La prop `asChild` n'existe pas.
Pour passer un élément custom à un trigger, utiliser la prop `render` :

```tsx
// ❌ FAUX — crée un <button> imbriqué dans un <button> → erreur hydration
<DialogTrigger>
  <Button>Ouvrir</Button>
</DialogTrigger>

// ✅ CORRECT
<DialogTrigger render={<Button variant="outline">Ouvrir</Button>} />

// ✅ CORRECT avec props dynamiques
const trigger = <Button className="...">Ouvrir</Button>
<DialogTrigger render={trigger} />
```

### 7.2 FK vers school_members.id ≠ auth.users UUID
`session.userId` = UUID de `auth.users`.  
Toutes les FK en base (ex: `created_by`, `teacher_id`, `reviewed_by`) pointent vers **`school_members.id`**, qui est un UUID différent.

```typescript
// Pattern obligatoire avant toute insertion avec FK school_members
async function getMemberId(userId: string, schoolId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: schoolMembers.id })
    .from(schoolMembers)
    .where(and(eq(schoolMembers.userId, userId), eq(schoolMembers.schoolId, schoolId)))
    .limit(1)
  return row?.id ?? null
}
```

### 7.3 IDs côté client
Pour générer des IDs dans les composants React (pas de serveur) :
```typescript
import { nanoid } from 'nanoid'
const id = `section-${nanoid(8)}`   // ex: 'section-aB3xKp9m'
const id = `cf-${nanoid(8)}`         // custom field
const id = `ib-${nanoid(8)}`         // info block
```

### 7.4 Formulaire d'inscription — architecture
- La table `registration_forms` stocke le schéma JSONB du form builder (un formulaire par `(schoolId, formType)`, `formType` = `'new_student' | 'reenrollment'`)
- `registrationsService.getOrCreateForm(schoolId, formType)` crée le formulaire par défaut à la 1ère visite
- À la soumission d'un formulaire `new_student`, `submitRegistrationAction`, dans l'ordre :
  1. Refuse si l'école a décoché « Autoriser les nouvelles inscriptions » (`settings.allowNewRegistrations === false`) — la réinscription reste possible. Les pages du formulaire affichent alors `RegistrationNotice` au lieu du formulaire. Le réglage se change dans Paramètres de l'école **et** directement en haut des pages Inscriptions et Formulaires d'inscription (`RegistrationsOpenToggle`, `src/components/shared/`, avec l'année scolaire et une confirmation) — ce composant n'envoie que `allowNewRegistrations`.
  2. Revérifie les champs requis, puis **refuse les doublons** : même prénom + nom + date de naissance dans l'école (accents/casse ignorés, `findDuplicateStudent`) — message différent si l'enfant est déjà lié au parent connecté.
  3. Crée l'élève **inactif** (`is_active = false`, affiché « En attente » dans Élèves) + ses `guardians`. **Convention des tuteurs (partout dans l'app) : nom complet dans `first_name`, `last_name` vide** — l'éditeur de tuteurs du tableau Élèves n'affiche et ne modifie que ce champ.
  4. **Bloc « Tuteurs »** : les 6 champs système père/mère/e-mails/téléphones (`GUARDIAN_FIELD_KEYS`) ne sont plus affichés un par un — ni dans le constructeur admin, ni au formulaire public, ni au portail parent. Un seul composant les remplace partout : `GuardiansInput` (`src/components/shared/GuardiansInput/`, design de l'éditeur de tuteurs du tableau Élèves), tuteur 1 obligatoire + tuteur 2 optionnel, relation Père/Mère/Tuteur légal/Autre. Les 6 champs restent dans le schéma JSONB (aucune migration) : ils fixent la **position** du bloc (à la place du premier) et reçoivent une **recopie** des tuteurs saisis (liste admin, e-mails de décision, replis du tableau Élèves). Leurs libellés et leur caractère obligatoire ne sont plus utilisés.
     - **Portail parent** (`initialGuardians`) : tuteur 1 = le parent connecté (nom/téléphone du profil, e-mail du compte verrouillé et imposé par le serveur, relation « Tuteur légal » par défaut, modifiable), rattaché à son compte (`linked_member_id`).
     - **Formulaire public** : tuteur 1 = « Tuteur principal » saisi par la famille, e-mail obligatoire.
     - **Constructeur admin** : un bloc verrouillé « Tuteurs », déplaçable d'un seul tenant (les 6 champs bougent ensemble), avec l'aperçu réel du composant.
     - **Réglage par école** « Second tuteur obligatoire » (+ son e-mail / son téléphone) : cases dans la ligne « Tuteurs » du constructeur, stockées sur la section (`FormSection.guardianOptions`, lu par `getGuardianOptions(schema)`). Activé : la carte du second tuteur est affichée d'office et ne peut pas être retirée.
     - Règles communes client/serveur : `getGuardianErrors(guardians, { accountHolder, options })` — relation obligatoire, un seul père et une seule mère, nom + téléphone du tuteur 1 (+ e-mail au public), nom du tuteur 2 s'il est ajouté. Le serveur accepte encore les anciens envois sans bloc (champs père/mère historiques).
  5. Crée la `registration` `pending` (`student_id`, `submitted_by_member_id`) et prévient les admins (`notifyAdmins` : in-app + e-mail).
- **Tableau Élèves (admin)** : un enfant n'y apparaît qu'une fois son inscription approuvée — `studentsService.getBySchool` calcule `awaitingApproval` (`officialStudentFilter` : l'élève a une inscription **`new_student`** non approuvée et aucune `new_student` approuvée) et `StudentsClient` filtre. La règle ne dépend **pas** de `isActive` : elle s'applique aussi aux élèves créés actifs par l'ancien code (avant la validation obligatoire). Une réinscription en attente ne masque pas un élève déjà inscrit. Seul ce tableau est filtré (les sélecteurs du Budget, qui partagent `useStudents`, ne le sont pas). Les élèves créés à la main ou importés (sans inscription) restent visibles. La colonne/filtre « Statut » du tableau affiche **Actif / Inactif** (`students.is_active`), pas « Inscrit ».
- **Panneau d'une inscription** : un clic sur une ligne d'Inscriptions ouvre **le même panneau que le tableau Élèves** (`StudentFormDialog`, prop `topSlot` = statut + section « Décision »), clé `${studentId}-${status}` pour repartir des valeurs à jour après une décision. Repli sur l'ancien `RegistrationDetailPanel` seulement pour une inscription sans élève lié. Les hooks de décision invalident aussi `studentsKeys.all`.
- **Approbation groupée** (`/admin-portal/registrations`) : case à cocher sur chaque inscription non approuvée (+ « tout cocher » sur le filtre courant), même rendu que les cases d'Élèves (vert `#2d6a4f`, couleur principale) → barre flottante sombre « N inscriptions sélectionnées · Approuver · × » (même forme que la sélection groupée d'Élèves) → dialog de confirmation → `bulkApproveRegistrationsAction(ids)` (même garde et mêmes effets que `reviewRegistrationAction` pour chaque id ; les déjà approuvées sont ignorées). Les notifications familles partent ensuite **en série** hors du chemin critique — approuver 100 inscriptions = 100 notifications + e-mails.
- **Décision admin** (`reviewRegistrationAction` → `applyReviewToStudent`) : approbation d'un nouvel élève → élève activé + inscrit dans les classes choisies dans la section « Choix des classes » (`class_<matière>` dans `formData`, classes actives de l'école uniquement) ; rejet → élève désactivé. Une réinscription refusée ne désactive jamais un élève déjà scolarisé.
- Le form builder utilise `@dnd-kit` pour le drag & drop
- **Un seul formulaire, deux consommateurs** : le portail public (`/portal/register/[schoolSlug]`) et le portail parent authentifié (`/parent-portal/enrollment`) appellent tous les deux `getPublicRegistrationFormAction` + rendent `PublicRegistrationForm` sans variante — toute modification du formulaire par l'admin (`/admin-portal/registration-forms`) se répercute automatiquement des deux côtés, sans déploiement de code.
- `submitRegistrationAction(schoolSlug, formType, formData, knownStudentId?)` — **le parent soumetteur vient de la session** (`getSession()` : parent connecté à cette école), jamais d'un paramètre : l'action est publique, un `submitterMemberId` passé par le client permettait de lier l'élève à n'importe quel compte. `knownStudentId` (réinscription) n'est accepté que si l'élève est lié à ce parent. **Pas de réinscription anonyme** : `/portal/register/[slug]/reenroll` renvoie vers le portail parent (hors aperçu admin) — l'élève n'y était pas identifié et l'envoi créait une inscription sans élève.
- **Champs requis (`*`)** : une seule règle, `getMissingRequiredFields(schema, formData, { gradeOptions, financialOptions })` (`registrations.schema.ts`), appliquée côté client par `PublicRegistrationForm` (message « Ce champ est requis » sous chaque champ + toast + scroll vers le premier) **et** côté serveur au début de `submitRegistrationAction`, avant toute création d'élève/tuteur. Ignorés volontairement : champs `readOnly`, `yes_no` (non coché = « non »), section `class_selection`, et tout champ à choix (`select`/`radio`/`multiple`) sans option configurée par l'école (ex. « Niveau scolaire » si `gradeLevels` est vide) — sinon le parent serait bloqué sans pouvoir répondre.
- Le sélecteur `/parent-portal/enrollment` rend un élève non cliquable dès qu'une ligne existe dans `registrations` pour son `studentId` (année scolaire courante), avec un badge qui reflète le statut de la **dernière** soumission (`getRegistrationStatuses`) : « En attente de validation » / « Inscrit » / « Inscription refusée ».
- **Validation admin** (`/admin-portal/registrations`, panneau de détail → section « Décision ») : Approuver / Rejeter (motif facultatif, transmis à la famille). **Une approbation est définitive** : plus de rejet ni de nouvelle décision ensuite (condition `status <> 'approved'` dans l'UPDATE de `registrationsService.review`) ; une inscription rejetée peut encore être approuvée. `reviewRegistrationAction` (garde `canAccess(session, 'registrations')`) enregistre `status`, `reviewedBy` (school_members.id), `reviewedAt`, `notes`, puis prévient la famille hors du chemin critique : notification in-app (`registration_approved` / `registration_rejected`) aux parents liés à l'élève + au parent soumetteur (`registrations.submitted_by_member_id`, désormais renseigné par le flux parent-portal), et e-mail à l'adresse saisie dans le formulaire (`primaryEmail` — le formulaire public ne demande pas de compte) + aux comptes des parents liés, dédoublonnés. Effets sur l'élève : voir « Décision admin » ci-dessus (activation / désactivation, classes).
- **Champs form_data exposés dans le drawer élève** : `studentsService.getBySchool` joint la dernière `registration` par élève et extrait `sf-school-grade` → `schoolGrade` et `sf-sponsorship` → `regSponsorship` ainsi que `sf-father-name`/`sf-mother-name`/`sf-primary-email`/`sf-primary-phone` en fallback si `guardians` ne contient pas le lien père/mère. Règle de priorité : données structurées (`guardians`, `class_enrollments`) > form_data JSONB. `paymentFrequency` vient de `enrollments[0].paymentPlan`, pas de `sf-payment-freq` (redondant).

### 7.5 Éditeur de texte riche (admin)
Utiliser `contentEditable` + `document.execCommand` (voir `RichTextEditor.tsx`).
Ne pas installer TipTap, Quill ou autre — la solution en place est suffisante pour l'admin.

### 7.6 Classe précédente dans le catalogue
La relation "classe précédente/suivante" est gérée via une seule colonne `nextClassId` (self-ref sur `class_catalog`).
La classe précédente est calculée par inversion dans `classesService.getAll()`.
Quand l'utilisateur choisit une classe précédente dans le formulaire, le service met à jour le `nextClassId` de cette classe précédente pour pointer vers la classe courante.

### 7.7 Sidebar UserProfileDialog
Le bloc utilisateur en bas de la sidebar (nom + email) est cliquable et ouvre `UserProfileDialog`.
Ce dialog affiche : rôles, infos compte, lien "Modifier le profil" et bouton "Se déconnecter".
`schoolName` est passé du `PortalLayout` → `Sidebar` → `UserProfileDialog`.

### 7.8 Activation enseignant — NIL_UUID sentinel
Quand un admin crée un enseignant, le record `school_members` est créé avec `userId = '00000000-0000-0000-0000-000000000000'` (NIL_UUID) + `pendingEmail = email` + `isPending = true`.
Quand l'enseignant s'inscrit sur `/auth/signup`, `signUpAction` cherche ce record et met à jour `userId` avec le vrai `auth.users.id`.
L'enseignant voit une gate de vérification (`TeacherActivationGate`) tant que `isPending = true`.
Il entre son code d'activation (= `session.memberId` = UUID du record `school_members`) → `activateTeacherAction` → `isPending = false`.

**`getSession()`** : suppression du filtre `.eq('is_pending', false)` → retourne maintenant `isPending: boolean` + `memberId: string` dans la session. Filtrage NIL_UUID : `.neq('user_id', NIL_UUID)`.

### 7.9 Select onValueChange — valeur null
`@base-ui/react/select` peut envoyer `null` dans `onValueChange`. Toujours filtrer :
```tsx
onValueChange={(v) => { if (v) setFoo(v) }}
// ou
onValueChange={(v) => v && setValue('field', v)}
```

### 7.10 Dialogs — ne pas importer depuis @base-ui-components
Toujours utiliser `@/components/ui/dialog` (wrapper Shadcn). Ne jamais importer directement depuis `@base-ui-components/react/dialog`.

### 7.11 Select — valeur affichée vide/brute au premier rendu
`@base-ui/react/select` n'affiche pas automatiquement le label correspondant à la `value` initiale tant que le contenu du dropdown n'a jamais été monté (le `Popup` est en portal, monté à la demande) : `<SelectValue />` seul affiche la valeur brute (ex. `"fr"` au lieu de `"Français"`). Toujours passer une render-prop à `SelectValue` pour mapper explicitement valeur → label :

```tsx
<SelectValue>{(v: string) => LABELS[v] ?? v}</SelectValue>
```

### 7.12 Page "Modifier le profil" — un composant, plusieurs portails

`ProfileSettingsClient` (`src/components/shared/ProfileSettingsClient.tsx`) est le composant unique rendu par `/admin-portal/profile`, `/teacher-portal/profile` et `/parent-portal/profile` (même pattern "un composant, plusieurs consommateurs" que le form-builder d'inscription, voir §7.4). Il n'a pas de prop `portal` — tout est piloté par `session.roles` : la checkbox "Administrateur" est toujours désactivée (le rôle admin ne se retire/s'ajoute que via `/admin-portal/permissions`), les blocs "ID Enseignant" et "Enfants liés"/"Gérer les enfants" ne s'affichent que si l'utilisateur a le rôle correspondant. Le module `src/modules/profile/` gère nom/téléphone/rôles/langue via Drizzle ; changement d'e-mail, mot de passe et suppression de compte appellent directement `supabase.auth.updateUser()`/`supabaseAdmin.auth.admin.deleteUser()` depuis les server actions (pas de service Drizzle pour ces opérations, elles ne touchent pas nos tables). Chaque action sensible (email, mot de passe, suppression) ré-authentifie d'abord via `signInWithPassword` avant d'agir. Le lien "Edit Profile" de `UserProfileDialog` prend une prop `profileHref` (passée par chaque sidebar : admin/parent/teacher) — avant §7.12 il pointait toujours vers `/admin-portal/profile` en dur, quel que soit le portail d'où il était ouvert. Le "Délier l'enfant" vit dans `parentsService.unlinkChild` / `unlinkChildAction` (module `parents`, pas `profile`, car il opère sur `parent_students`). Le bouton "+ Ajouter un enfant" réutilise `LinkChildModal` déjà construit pour `/parent-portal/children`.

---

### 7.13 Finance — `payments`/`expenses`/`wage_entries`, un seul flux admin+enseignant+parent

Trois modules (`src/modules/payments/`, `src/modules/expenses/`, `src/modules/wages/`) alimentent 4 pages sur 3 portails, tous branchés sur les tables Drizzle `payments`/`expenses`/`wage_entries` (`src/db/schema/finance.ts`).

- **`payments.source`** (`'admin' | 'parent'`) distingue un paiement saisi par l'admin (`Budget` → statut par défaut `verified`) d'un paiement auto-déclaré par un parent (`/parent-portal/payments` → "Marquer comme payé", statut forcé `pending`). Côté Budget, une ligne `source='parent' AND status='pending'` affiche "En attente de vérification" + actions rapides Vérifier/Rejeter au lieu de Modifier/Supprimer, et fait apparaître une 4ᵉ KPI card conditionnelle. `payments.parentName` est un champ texte libre (saisi par l'admin ou auto-rempli avec le nom du parent soumetteur) — ne pas le confondre avec `guardians`.
- Le formulaire de paiement (admin et parent) permet de sélectionner **plusieurs étudiants** (`StudentMultiSelect`, `src/components/shared/StudentMultiSelect/`) : une ligne `payments` est insérée **par étudiant sélectionné**, pas une ligne partagée.
- `wage_entries` (nouvelle table, aucun équivalent avant ce chantier) modélise la feuille de temps des enseignants payés : `hourlyRateCents` est un instantané de `school.settings.teacherHourlyRate` au moment de la saisie, éditable ensuite par l'admin (recalcule `amountCents`). Un admin peut saisir les heures de n'importe quel enseignant (`WageFormDialog`, sélecteur Enseignant) ; un enseignant ne peut saisir que les siennes (`LogMyHoursDialog`, `teacher-portal/refunds`, pas de sélecteur).
- `ExpenseFormDialog` (`src/components/shared/ExpenseFormDialog/`) est partagé entre `/admin-portal/finance/expenses` ("Nouvelle dépense") et `/teacher-portal/refunds` ("Nouveau remboursement") — même pattern "un composant, plusieurs consommateurs" que §7.4/§7.12. Upload de reçu (JPG/PNG/PDF) en base64 côté client → Server Action → bucket Supabase Storage public `expense-receipts`.
- **Année scolaire** : chaque paiement porte `payments.academic_year` ; statuts T1/T2/T3 et rappels d'impayés ne lisent que l'année en cours (§7.24). La liste et les KPI du Budget couvrent toutes les années.
- L'onglet "Paiements" de Dépenses est un placeholder statique (pas de vraie intégration Stripe) — décision assumée, la référence elle-même ne l'a pas connecté.
- Les libellés (méthode/catégorie/période) vivent dans `src/modules/payments/payments.labels.ts`, partagés entre Budget (admin) et Statut de paiement (parent) — ne pas les redéfinir localement dans un composant.
- Bug corrigé (2026-08-15) : `paymentsService.getAll()` construisait `WHERE sm.id = ANY(${array})` en SQL brut — Drizzle envoie un tableau JS interpolé comme paramètre scalaire, pas comme littéral array Postgres, ce qui fait planter la requête (`malformed array literal`) dès qu'une école a un paiement `source='parent'`. Le `catch` de la Server Action avalait l'erreur et `usePayments()` retombait sur `[]` sans toast — symptôme observé : liste Budget vide sans erreur visible. Toujours construire les `IN (...)` dynamiques avec `sql.join(ids.map(id => sql\`${id}\`), sql\`, \`)`, jamais `= ANY(${array})`.
- **Paramètres financiers** (`/admin-portal/school-settings`, section droite `FinancialSection`) : en plus du taux horaire, lien d'infos paiement, modes de paiement et options financières (déjà existants), la section inclut désormais les toggles "Options de période de paiement" (`paymentPeriodShowTrimesters/Annually/Monthly/CantAfford`, tous `true` par défaut) et le sélecteur "Mois de paiement" (`paymentMonths: string[]`, vide = les 12 mois) — nouveaux champs JSONB dans `SchoolSettings` (`src/db/schema/schools.ts`), aucune migration nécessaire. **Ces toggles ne sont pas encore branchés** sur le sélecteur de période du formulaire de paiement (`PaymentFormDialog`) — `trimester_1/2/3` et `annually` existent déjà dans l'enum `payment_period` (`src/db/schema/finance.ts`) et pourraient être filtrés par ces réglages, mais `monthly` et `cant_afford` n'existent pas encore comme valeurs d'enum (nécessiterait une migration + évolution du flux de paiement mensuel — hors scope de ce chantier, juste les réglages ont été posés). La carte Stripe est un placeholder statique désactivé, même décision que ci-dessus (pas de vraie intégration).
- `financialOptions` a désormais 5 valeurs par défaut dans `DEFAULT_SETTINGS` (`'No, thank you!'`, `'Supply 100% waived'`, `'Tuition 100% waived'`, `'Tuition and Supply fees 50% waived'`, `'Tuition and Supply fees 100% waived'`, alignées sur la référence) au lieu de `[]`. Le champ "Option financière" dans `PaymentFormDialog` (admin) et `MarkAsPaidDialog` (parent) est conditionnel — `financialOptions.length > 0 && (...)` — donc il reste invisible tant que la liste est vide. Backfill effectué (2026-08-15) sur les 3 écoles existantes en base (leur JSONB avait déjà `financialOptions: []` enregistré explicitement, donc le nouveau défaut seul ne les touchait pas) : `UPDATE schools SET settings = jsonb_set(settings, '{financialOptions}', ...) WHERE settings->'financialOptions' = '[]'::jsonb`. Toute école déjà personnalisée (liste non vide) n'est pas affectée par ce backfill.

### 7.14 School Settings — un seul formulaire, une seule barre de sauvegarde collée en bas

`SchoolSettingsClient.tsx` a été entièrement refactoré (2026-08-15) pour matcher la référence : **plus aucune section n'a son propre bouton "Sauvegarder"**. Toute la page (Identité, Contact, Jours de classe, Salles, Emploi du temps, Niveaux, Staff, Liens rapides, Soumissions, Règles TV, Calendrier, Paramètres financiers) partage un seul `useForm<SchoolSettingsFormValues>()` au niveau de `SchoolSettingsForm`, distribué aux sous-composants via `FormProvider` + `useFormContext()`. Une seule `StickySaveBar` (`position: sticky; bottom: 0`, dans le conteneur scrollable de `PortalLayout`) reste visible en bas quel que soit le scroll, désactivée tant que `formState.isDirty` est `false`, activée dès qu'un champ change.

- **Pas de `<form>` DOM** : `FormProvider` est juste un context provider (aucun élément `<form>` réel). Le bouton de sauvegarde appelle `handleSubmit(onSubmit)` directement en `onClick`. Décision volontaire — envelopper la page dans un vrai `<form>` aurait fait planter tous les boutons "+Ajouter"/"×" sans `type="button"` explicite en submit intempestif (comportement HTML natif par défaut dès qu'un `<button>` est dans un `<form>`), ainsi que tout `onKeyDown` "Entrée pour ajouter" sans `preventDefault()`. Sans `<form>`, aucun de ces pièges n'existe.
- **Seuls les champs modifiés sont envoyés** (comparaison avec `formState.defaultValues`, remis à jour par `reset` après chaque sauvegarde) : avant, toute la page était renvoyée, et un admin dont la page était ouverte depuis longtemps écrasait les réglages changés entre-temps par un autre (constaté 2026-10-10 : inscriptions de Noune rouvertes sans que personne ne coche la case, une inscription reçue). Le serveur fusionne le patch (`schoolService.updateSettings`).
- `onSubmit` appelle `updateSchoolInfoAction` (nom/langue/fuseau/contact) et `updateSchoolSettingsAction` (tout le reste, JSONB) en parallèle (`Promise.all`), puis `reset(values)` seulement si les deux réussissent — ça réinitialise la baseline "dirty" ET affiche les 2 toasts existants des hooks (`useUpdateSchoolInfo`/`useUpdateSchoolSettings`), pas de toast consolidé custom.
- Les champs listes (rooms, gradeLevels, classPeriods, staff, quickLinks, tvRules, paymentModes, financialOptions, paymentMonths, schoolDays) utilisent `Controller` avec le composant Section entier dans le `render` — le state d'édition ponctuelle (texte du nouvel item avant "Entrée"/"+") reste en `useState` local, mais la liste persistée vit uniquement dans `field.value`/`field.onChange` du form partagé.
- `LogoSection` reste **hors du formulaire** (upload de fichier immédiat via `useUploadSchoolLogo`, comme avant) — pas de notion de "dirty" pour un upload, il s'auto-sauvegarde au clic comme dans la référence.
- Toute nouvelle section ajoutée à cette page doit suivre ce pattern (`useFormContext` + `setValue(..., { shouldDirty: true })`/`Controller`, **jamais** de mutation locale `useUpdateSchoolSettings().mutate(...)` déclenchée au clic) — sinon elle casse la promesse "un seul bouton, tout ou rien".
- Bug corrigé (2026-08-15) : la grille 2 colonnes (`grid-cols-[1fr_360px]`) utilisait `items-start`, donc chaque colonne ne prenait que sa propre hauteur de contenu au lieu de la hauteur de ligne. La colonne gauche (13 sections) est bien plus haute que la droite (3 sections) — résultat : la colonne droite s'arrêtait ~500px avant la gauche, laissant un grand vide crème au-dessus de la `StickySaveBar`. Fix : `items-stretch` sur la grille (la cellule droite est étirée à la hauteur de la ligne) + `sticky top-6` sur le wrapper de la colonne droite lui-même — son contenu top-aligné reste alors ancré en haut de la cellule étirée pendant que la gauche défile plus loin, sans jamais laisser de vide. Pattern standard "sidebar sticky à hauteur inégale" : `items-stretch` + `sticky`, jamais `items-start` + `sticky` (ce dernier n'a aucune marge de manœuvre puisque la cellule fait déjà exactement la hauteur du contenu).
- Bug corrigé au passage (2026-08-15) : la `nav` de la Sidebar (`src/components/layouts/Sidebar/Sidebar.tsx`) porte `overflow-y-auto scrollbar-hide` depuis le début, mais `scrollbar-hide` n'était défini nulle part (ni Tailwind core, ni config, ni CSS custom) — classe fantôme, donc la barre de défilement interne de la sidebar restait visible malgré l'intention du nom. Ajouté dans `globals.css` via `@utility scrollbar-hide { scrollbar-width: none; -ms-overflow-style: none; &::-webkit-scrollbar { display: none } }` (syntaxe Tailwind v4 CSS-first, pas de `tailwind.config.js` dans ce projet).

### 7.15 React portal event bubbling dans les `<tr>` cliquables

Les événements React (click, keydown…) remontent via l'arbre **React**, pas via le DOM. Un `Sheet` ou `Dialog` monté dans un portal reste quand même enfant React du composant qui le déclare. Conséquence : si un `<Sheet>` est rendu à l'intérieur d'un `<tr onClick={() => open()}>`, un clic sur le bouton × de fermeture du Sheet déclenche : X → Sheet → composant → `<tr>` → `open()` → le drawer se rouvre immédiatement.

**Règle** : ne jamais rendre un `Sheet` ou `Dialog` à l'intérieur d'un `<tr>` (ou d'un autre élément cliquable qui l'entoure).

**Pattern correct** pour un tableau avec drawer d'édition :
```tsx
// Au niveau du composant parent de la table
const [editingItem, setEditingItem] = useState<Item | null>(null)

// Dans la ligne — pas de dialog ici
<tr onClick={() => setEditingItem(item)}>...</tr>

// En dehors du tableau — montage conditionnel + key
{editingItem && (
  <ItemFormDialog
    key={editingItem.id}       // force remontage à chaque item différent
    item={editingItem}
    open={true}
    onOpenChange={v => { if (!v) setEditingItem(null) }}
  />
)}
```

### 7.16 `useForm` — les `defaultValues` sont figées au montage

React Hook Form initialise les `defaultValues` **une seule fois**, au montage du composant. Si un même composant formulaire reçoit un `item` différent (ex : l'utilisateur clique sur un autre élève dans le tableau), les champs affichent encore les valeurs de l'élève précédent car le composant n'a pas remonté.

**Règle** : toujours passer `key={item.id}` sur tout composant qui contient un `useForm` et peut être réutilisé pour des objets différents. Le `key` force un remontage complet → `useForm` repart avec les bonnes `defaultValues`.

```tsx
// ❌ FAUX — le form garde les valeurs de l'item précédent
<StudentFormDialog item={editingItem} open={!!editingItem} />

// ✅ CORRECT
{editingItem && (
  <StudentFormDialog key={editingItem.id} item={editingItem} open={true} />
)}
```

### 7.17 Sous-rôles admin — trésorier / gestionnaire

Source unique : `src/lib/auth/permissions.ts`. Une « ressource » = le segment d'URL de la page admin (`students`, `track-exams`, `budget` pour `/finance/budget`…).
- `admin` → tout ; `treasurer` → liste blanche `budget`, `expenses`, `students`, `announcements` ; `manager` → tout **sauf** `budget`, `expenses`, `permissions` (sinon il pourrait se promouvoir admin). Accueil (`/admin-portal`) et `profile` toujours accessibles.
- Enforcé à 3 niveaux : `proxy.ts` (redirige vers `/admin-portal` toute URL non autorisée — pas dans le layout admin, qui ne se ré-exécute pas à la navigation client), Sidebar + tuiles du dashboard (`canAccessAdminPath`), et chaque Server Action admin (`canAccess(session, '<ressource>')`, **jamais** `session.roles.includes('admin')` seul).
- Toute nouvelle page/action admin : la garde vient gratuitement côté page (proxy), mais l'action doit appeler `canAccess` avec le segment d'URL de sa page.

### 7.18 Responsive mobile — `MobileNavShell`

Les 3 layouts de portail (`PortalLayout` admin, `parent-portal/layout.tsx`, `teacher-portal/layout.tsx`) passent par `src/components/layouts/MobileNavShell/MobileNavShell.tsx`. ≥ `lg` : sidebar en colonne (inchangé). < `lg` : sidebar en tiroir off-canvas + barre mobile verte avec hamburger ; le tiroir se ferme à la navigation (état lié au `pathname` d'ouverture), au clic sur le fond et sur Échap. Ne jamais remettre une sidebar en colonne fixe directement dans un layout.
Règles pour toute nouvelle page : padding racine `p-4 sm:p-6`, en-têtes titre + actions en `flex flex-wrap`, grilles KPI `grid-cols-2 sm:grid-cols-N` (jamais `grid-cols-4/5` nu), tableaux dans un conteneur `overflow-x-auto`, panneaux latéraux `w-full lg:w-[Npx]` empilés en `flex-col lg:flex-row`.

### 7.19 Tests E2E — Playwright sur Supabase LOCAL uniquement

La base de `.env.local` est partagée et sert aussi à la prod (`.claude/rules/shared-remote-db.md`) : les tests E2E tournent **exclusivement** sur un Supabase local (Docker, `supabase/config.toml`). `e2e/support/env.ts` (`loadE2EEnv`) charge `.env.test` et **lève une erreur** si `DATABASE_URL` ou `NEXT_PUBLIC_SUPABASE_URL` ne pointent pas sur `localhost`/`127.0.0.1` — il est appelé par `playwright.config.ts`, `e2e/seed.ts` et `e2e/drizzle.e2e.config.ts`. Ne jamais contourner ce garde-fou.

```bash
# Une fois (Docker Desktop lancé)
npm run e2e:db:start      # supabase start (ports 54321 API / 54322 DB / 54323 Studio)
npm run e2e:env           # écrit .env.test (clés locales + E2E_PASSWORD aléatoire, gitignoré)
npm run e2e:db:reset      # reset DB locale → drizzle-kit push du schéma → seed e2e/seed.ts
# Ensuite
npm run test:e2e          # build Next dans .next-e2e puis next start :3100 + tests
npm run test:e2e:ui       # mode UI interactif
```

- **Seed** (`e2e/seed.ts`, idempotent) : école `e2e-school` + 6 comptes (`admin`, `treasurer`, `manager`, `teacher`, `parent`, `family` `@e2e.qaf.test`, définis dans `e2e/support/users.ts` — `family` est un second parent réservé aux tests qui ajoutent des enfants/inscriptions, pour que `parent` garde un seul enfant), 1 classe (déjà épinglée par l'enseignant dans Présences et Devoirs), 1 élève inscrit lié au parent, buckets Storage ; `schoolDays` = les 7 jours (la chronologie de présence parent n'affiche que les jours de classe) ; `timezone` = `Europe/Paris` (serveur E2E en UTC, navigateur à Paris : reproduit la prod, §7.21). Toute donnée nécessaire à un nouveau test s'ajoute ici. **Relancé automatiquement avant chaque run** (`e2e/global-setup.ts`) : un test qui écrit (paiement, inscription…) part toujours de l'état initial — mais les tests d'un même run partagent la base, donc un test qui écrit doit cibler ses propres lignes (montant/nom unique) et ne pas dépendre de ce qu'un autre test écrit.
- **CI** : `.github/workflows/e2e.yml` (PR + push sur `main`) — `supabase start` dans le runner, push du schéma, tests, rapport HTML en artefact.
- **Parcours métier couverts** : sous-rôles (`e2e/admin/sub-roles.spec.ts`), smoke de toutes les pages construites (`e2e/smoke.spec.ts`), paiement parent → vérification admin (`e2e/finance/parent-payment.spec.ts`), inscription publique → visible dans Inscriptions + Étudiants (`e2e/registrations/public-registration.spec.ts`), création/validation/modification/suppression d'un élève par l'admin (`e2e/admin/students.spec.ts`), appel enseignant → classe « Soumis » côté admin → statut dans la chronologie parent (`e2e/teacher/attendance.spec.ts`), navigation jour précédent/suivant du suivi des devoirs admin (`e2e/admin/homework-tracking.spec.ts`), devoir Hifz enseignant → visible par le parent (`e2e/teacher/homework.spec.ts`), réinscription d'un enfant lié → « Inscrit » + nouvel élève lié immédiatement au parent (`e2e/parent/enrollment.spec.ts`), annonces par public cible Tous/Parents/Personnel + suppression (`e2e/communication/announcements.spec.ts`), remboursement enseignant → approuvé/payé ou rejeté par l'admin (`e2e/finance/teacher-refund.spec.ts`), création d'un enseignant par l'admin → inscription → gate d'activation avec le code copié via « Copier l'ID » (`e2e/admin/teacher-activation.spec.ts`, presse-papier lu avec la permission `clipboard-read`), bulletin d'examen : saisie ouverte + publication retenue → notation enseignant → invisible pour le parent → publication → signature parent → saisie refermée, formulaire inaccessible même par URL et bulletin toujours visible en lecture seule (`e2e/exams/exam-grades.spec.ts`, seul test qui modifie des réglages d'école). Helper `field()` (champ de `PublicRegistrationForm` par libellé) dans `e2e/support/registration-form.ts`.
- Intégrité des inscriptions : élève « En attente » puis activé et inscrit dans la classe choisie, doublons refusés (parent et public), réinscription publique renvoyée vers le portail parent, inscriptions fermées, retour à la page demandée après connexion (`e2e/registrations/integrity.spec.ts`). Le seed ajoute la section « Choix des classes » au formulaire de `e2e-school` et une seconde école `e2e-closed` (inscriptions fermées, sans compte). Les noms d'élèves créés par les tests sont uniques (`uniqueSuffix()`) : une relance ne doit pas être refusée comme doublon.
- Validation des inscriptions : approbation et rejet avec motif → statut dans le sélecteur parent + notification (`e2e/registrations/review.spec.ts`).
- Modification d'un paiement dans le Budget (formulaire pré-rempli, puis formulaire de création qui repart vide) : `e2e/finance/budget-edit.spec.ts`.
- **`test.fixme`** = comportement attendu mais pas encore implémenté (le test est listé, pas exécuté) — à retirer dès que la fonctionnalité existe.
- **Timeouts** : 10 s par assertion (`expect.timeout`) — sous charge parallèle, certaines Server Actions dépassent les 5 s par défaut ; 60 s par test (`timeout`) — les parcours multi-portails dépassent les 30 s par défaut sous charge.
- **Auth** : `e2e/auth.setup.ts` se connecte via le vrai formulaire pour chaque rôle et sauve `e2e/.auth/<role>.json` ; un test choisit son rôle avec `test.use({ storageState: storageStatePath('treasurer') })`.
- **Fixtures** : importer `test`/`expect` depuis `e2e/support/fixtures.ts` (et non `@playwright/test`) — fait échouer le test sur toute exception JS de la page (erreurs d'hydratation, etc.).
- **Mobile** : le projet `mobile` (Pixel 7) ne rejoue que les tests dont le titre contient `@mobile`.
- **Env serveur** : les variables de `.env.test` sont passées au `webServer` et priment sur `.env.local` ; `SMTP_*`/`RESEND_API_KEY` y sont vides exprès pour ne jamais envoyer de vrai e-mail. `next.config.ts` lit `NEXT_DIST_DIR` (`.next-e2e`) pour ne pas écraser le `.next` du `npm run dev`.
- **Sélecteurs** : `getByLabel` ne fonctionne pas sur les formulaires `Form` Shadcn — `FormControl` (`src/components/ui/form.tsx`) pose l'`id` sur un `<div>` wrapper et non sur l'`<input>`, donc le `<label htmlFor>` ne cible aucun champ (défaut d'accessibilité connu). Utiliser `getByPlaceholder`, `getByRole` ou `input[name="..."]`.

### 7.20 Examens — deux réglages par trimestre, appliqués côté serveur

Paramètres de l'école → Opérations scolaires, pour le trimestre sélectionné (JSONB `school.settings`, aucune migration) :
- **« Ouvrir les examens pour Trimestre N »** (`examPeriodT{1,2,3}Open`, défaut `false`) = période de **saisie** : l'enseignant peut noter, le parent peut signer.
- **« Bulletins publiés pour Trimestre N »** (`examResultsPublishedT{1,2,3}`, défaut `true`, absent des écoles existantes → lire avec `?? true`) = **visibilité** des bulletins pour les parents. Décocher permet de publier tous les bulletins d'un coup une fois la saisie terminée.

Règles (source unique : `examsService.getExamFlags`) :
- **Enseignant** : `submitExamResultAction` exige période ouverte **et** `canTeacherGrade` (titulaire/assistant de la classe, élève inscrit) ; la page `/teacher-portal/exams/[classId]/[studentId]` redirige vers la liste si la période est fermée.
- **Parent** : `getParentExamView` renvoie `{ periodOpen, published, children }` — `grades` vides si non publiés (bandeau « Bulletins pas encore publiés ») ; publiés mais période fermée → bulletins en lecture seule (« signature indisponible »). Fermer la saisie ne fait **jamais** disparaître un bulletin déjà publié.
- `signGrade` exige élève lié au parent (`parent_students`) + publiés + période ouverte + bulletin de l'année en cours.
- **Année scolaire** : toutes les lectures et l'écriture des bulletins filtrent sur l'année en cours ; l'année d'un bulletin vient du serveur, jamais du client (§7.24).
- Ne jamais se contenter de masquer un lien/bouton côté UI : toute Server Action d'examens revérifie rôle + lien + réglages.
- Après une soumission, passer par les hooks de `exams.hooks.ts` (ils invalident le cache TanStack) plutôt que par l'action directe.
- **Historique parent** : `getChildrenGrades` part des bulletins (pas des inscriptions en cours) — un bulletin reste visible après que l'enfant a quitté la classe (badge « Classe quittée ») ; filtre par année (`getParentExamYears` : années ayant des bulletins + année en cours). Une autre année que l'année en cours est toujours visible, en lecture seule (pas de signature). Décision produit : aucune information n'est perdue, on ajoute des filtres.
- Libellés des critères en étoiles : `EXAM_CRITERIA` (`src/modules/exams/exams.labels.ts`), partagés formulaire enseignant / bulletin parent — ne pas les redéfinir localement.
- Modifier le contenu d'un bulletin signé (étoiles, commentaires, note) remet `parentSignature` à `null` dans `submitExamResult` : le parent doit re-signer ; le formulaire enseignant l'avertit avant, et les parents liés reçoivent une notification in-app (type `exam_signature_reset`, cloche) + un e-mail (`notifyParentsSignatureReset`, `getParentEmailsForStudent`).

### 7.21 Dates — « aujourd'hui » dans le fuseau de l'école

Le serveur (Vercel) tourne en UTC, les écoles sont en Europe/Paris : `new Date().toISOString().slice(0, 10)` donne **la veille** entre minuit et 1-2 h. Et `new Date('YYYY-MM-DDT00:00:00')` (minuit local) relu en `toISOString()` décale d'un jour dans tout fuseau en avance sur UTC — c'est ce qui cassait « Jour suivant / précédent » du suivi des devoirs.
- Tout passe par `src/lib/dates.ts` : `todayInTimeZone(school.timezone)` côté serveur, `addDaysISO` / `dayOfWeekISO` / `isSchoolDayISO` / `latestSchoolDayISO` pour l'arithmétique (UTC pur), `localTodayISO()` seulement pour une valeur par défaut de formulaire côté client.
- Une date affichée pendant le rendu d'un composant client (« Aujourd'hui », « Hier ») vient du serveur en prop (`today`), sinon le rendu SSR (UTC) et le navigateur (Paris) divergent → erreur d'hydratation.
- Ne plus jamais écrire `toISOString().split('T')[0]` / `.slice(0, 10)` pour obtenir une date du jour.
- Le fuseau se règle dans Paramètres de l'école → Identité (`schools.timezone`, défaut `UTC`).

### 7.22 Notifications admin et e-mails

- **Prévenir les admins = `notifyAdmins(schoolId, notification, email, context)`** (`src/modules/notifications/notify-admins.ts`) : notification in-app (cloche) **et** e-mail, toujours les deux, à tous les admins et gestionnaires de l'école (trésoriers exclus : ils n'ont accès ni aux Inscriptions ni aux Examens, §7.17). Ne lève jamais — à appeler avec `void` hors du chemin critique.
- **SMTP** : `sendEmail` réutilise un seul transporteur Gmail en pool (1 connexion), les envois partent l'un après l'autre. Avant, chaque e-mail ouvrait sa propre connexion, toutes en parallèle : Gmail en refusait une partie (constat : un seul admin recevait les e-mails d'inscription), sans erreur visible. Pour plusieurs destinataires, `sendEmailToAll` journalise le bilan (`console.error` si échecs).
- Destinataires : `getAdminEmails` / `getAdminMemberIds`, `getMemberEmails(schoolId, role?)`, `getParentEmailsForClass`, `getParentEmailsForStudent`, `getEmailsForMembers` (`src/lib/email.ts`).
- Connexion : `?redirect=` est respecté après login (chemins internes uniquement, `safeRedirectPath`).

### 7.23 Chargement — un seul loader par page, navigation instantanée, barre de progression

Composants dans `src/components/shared/Loader/`. Choix produit : **un seul indicateur, le loader** (le logo de la barre du haut dans un cercle qui tourne) — **aucun squelette** dans l'appli, y compris pour les tableaux.
- **⚠️ Aucun `loading.tsx` ni `<Suspense>` dans l'appli.** Bug Next.js (16.2) : dès qu'une frontière Suspense existe, le serveur commence à envoyer la page avant le `redirect()` de la page ; la redirection se fait alors côté client et le `Router` interne de Next plante (React #310 « Rendered more hooks », [vercel/next.js#78396](https://github.com/vercel/next.js/issues/78396)). Constaté sur les 13 pages qui appellent `redirect()` (alias `catalog`, période d'examens fermée, droits trésorier…) — les E2E échouent. Sans Suspense, `redirect()` reste une vraie redirection HTTP. C'est aussi pourquoi la navigation instantanée ne lit pas `useSearchParams` (qui impose un Suspense).
- **Un seul loader visible par page, jusqu'à la page complète.** Chaque page rend `PageLoader` tant que ses données initiales ne sont pas toutes arrivées : `if (isLoading || autreIsLoading) return <PageLoader />` juste avant le `return` principal (après tous les hooks) — jamais un titre de page + un loader dans le contenu, jamais un loader par section (Autorisations charge ses 3 sections dans le composant principal, Formulaires d'inscription ses 2 onglets). Si la page charge selon une sélection (classe, enfant), `useInitialLoading(...)` : page entière au premier chargement, puis loader de la seule zone concernée quand l'utilisateur change de sélection.
- **`Loader`** (`sm`/`md`/`lg`) : seulement pour un rechargement secondaire (après une action de l'utilisateur) et dans les dialogs / la cloche. Pas de spinner ad hoc, pas de « Chargement... » en texte brut.
- **Navigation instantanée** (`src/components/layouts/NavigationProgress/`) : au clic sur un lien interne vers un autre pathname (écouteur `click` en phase de capture, car `next/link` appelle `preventDefault`), `navigation-store.ts` mémorise la page demandée. Sans attendre le serveur : les menus (3 sidebars, `TopBar`, tiroir mobile) utilisent `useDisplayedPathname()` → l'entrée cliquée devient active ; `PortalContent` (zone de contenu des 3 portails) masque l'ancienne page et affiche `PageLoader`. Fin de la navigation : quand Next met à jour l'historique (`pushState`/`replaceState` interceptés — couvre aussi une redirection vers la page courante) ou quand le pathname change ; sécurité 15 s. `router.push()` programmatique : appeler `startNavigation(pathname)` avant pour le même effet. Un nouveau menu doit lire `useDisplayedPathname()`, jamais `usePathname()`.
- **Barre dorée** (`NavigationProgress`, monté dans `providers.tsx`) : 3 px en haut, visible pendant **chaque requête serveur** — navigation en cours, requêtes et mutations TanStack Query (`useIsFetching` / `useIsMutating`). Une requête en polling se déclare `meta: { silent: true }` (cloche) pour ne pas faire clignoter la barre. Les Server Actions appelées hors TanStack ne la déclenchent pas.
- **Changement de période (jour, trimestre, filtre)** : `placeholderData: keepPreviousData` dans le hook + `<PendingContent pending={isPlaceholderData}>` — l'affichage précédent reste visible, atténué. Pour une autre entité (autre classe, autre enfant) : `Loader`.
- **Données serveur `initial*`** : en `initialData` du hook **uniquement pour la valeur initiale du paramètre** ; jamais `data ?? initialX` pour une autre valeur (le suivi des devoirs admin et les examens affichaient ainsi les données du jour / trimestre initial).
- **Toujours tester `isLoading` avant l'état vide**, sinon « Aucun … » s'affiche le temps de la requête.

### 7.24 Année scolaire — tout ce qui en dépend

Source unique : `settings.academicYear` (Paramètres de l'école → Opérations scolaires), lue côté serveur par `schoolService.getAcademicYear(schoolId)` (`examsService.getAcademicYear` en est une copie, à fusionner). **Jamais** l'année envoyée par le client, **jamais** une année calculée sur la date du calendrier ni codée en dur.

| Donnée | Colonne | Règle |
|---|---|---|
| Inscriptions | `registrations.academic_year` | Renseignée à la soumission ; « Inscrit » / statut du sélecteur parent filtrés par année |
| Bulletins | `exam_results.academic_year` | Lectures (enseignant, admin, parent) et écriture filtrées sur l'année en cours — sinon le T1 de l'année N+1 écrasait celui de l'année N |
| Paiements | `payments.academic_year` (ajoutée le 2026-10-10, backfill = année de l'école) | Renseignée à la saisie (Budget, « Marquer comme payé », cases T1/T2/T3) ; statuts et rappels d'impayés filtrés par année |
| Élèves | `students.enrollment_year` | Année en cours si non précisée (inscription en ligne, import, option « Année scolaire en cours » du formulaire) — backfill 2026-10-10 depuis la dernière inscription |
| Classes | `classes.academic_year` | Année en cours à la création (étiquette, non utilisée fonctionnellement) |

Changer l'année dans les Paramètres = passer à l'année suivante : statuts payés, bulletins et « Inscrit » repartent de zéro, l'historique reste en base. Présences et devoirs sont datés, donc non concernés.

### 7.25 Changement de compte — rechargement complet

Connexion, déconnexion, inscription et suppression de compte se terminent par `hardNavigate(path)` (`src/lib/auth/hard-navigate.ts`, `window.location.assign`) : les Server Actions renvoient la destination au lieu d'appeler `redirect()`. Une redirection Next est une navigation côté client — le cache TanStack Query (clés non liées à l'école, ex. `['school', 'detail']`) et le cache du routeur survivaient : après un changement de compte, Paramètres de l'école affichait les réglages de l'école précédente (et « Enregistrer » les aurait écrits dans la nouvelle). Toute nouvelle action qui change l'identité doit suivre ce modèle.

En dev, `logging.serverFunctions: false` (`next.config.ts`) : Next journalisait les arguments des Server Actions, dont les mots de passe en clair.

---

## 8. État d'avancement des modules

### ✅ Complètement construit (tous portails concernés)

| Module | Pages |
|---|---|
| **Auth** | Login, callback, signOut, session guard + `/auth/signup` (parent + enseignant) |
| **Layout** | Sidebar admin (UserProfileDialog), TeacherSidebar (gate activation), ParentSidebar, Header, PortalLayout |
| **School** | `/admin-portal/school-settings` |
| **Students** | `/admin-portal/students` (liste + détail + création/édition + export Excel : **toutes** les colonnes du tableau, affichées ou non, + tuteurs, paiements T1/T2/T3, présences, notes et une colonne par question du formulaire d'inscription — lignes = liste filtrée et triée à l'écran, `students.excel.ts`) — sélecteur de colonnes persisté en localStorage (`qaf:students:columns`), colonnes optionnelles : téléphone/email/père/mère depuis `guardians` + présences + date d'inscription (`students.created_at`) ; tri ET filtre « à la Excel » sur toutes les colonnes (`SORT_VALUE` / `FILTER_VALUES` + `ColumnFilter.tsx` : on coche les valeurs à afficher, « (Vide) » inclus, masquer une colonne retire son filtre) ; filtre par classe (+ « Sans classe ») ; drawer avec popup détail tuteur (clic sur carte), `schoolGrade` et `regSponsorship` depuis `form_data` JSONB de la dernière inscription |
| **Teachers** | `/admin-portal/teachers` (liste + détail + flow activation NIL_UUID) — email modifiable par l'admin uniquement tant que `userId = NIL_UUID` (met à jour `pendingEmail` + renvoie l'invitation) ; une fois le compte créé, l'email est l'identifiant de connexion, modifiable seulement par l'enseignant depuis son profil |
| **Classes** | `/admin-portal/classes` |
| **Class Catalog** | Intégré à `/admin-portal/classes` (DnD, classe précédente/suivante) — `/admin-portal/class-catalog`, `/teacher-portal/catalog` et `/parent-portal/catalog` redirigent respectivement vers `/admin-portal/classes`, `/teacher-portal/classes` et `/parent-portal/children` |
| **Calendar** | `/admin-portal/academic-calendar` (vues Année/Mois/Semaine/Jour) + `/teacher-portal/calendar` + `/parent-portal/calendar` (readonly partagé) |
| **Registration Forms** | `/admin-portal/registration-forms` (form builder DnD complet) |
| **Registrations** | `/admin-portal/registrations` (liste + filtres par statut + export Excel + Approuver/Rejeter avec motif, famille notifiée — §7.4) |
| **Public Portal** | `/portal/register/[schoolSlug]` (nouvel élève + réinscription + succès) |
| **Enrollment Parent** | `/parent-portal/enrollment` (sélection élève, réinscription, nouvel élève, succès) |
| **Homework** | `/admin-portal/homework` (HomeworkTrackingClient) + `/teacher-portal/homework` (CRUD + Jitsi) + `/parent-portal/homework` (lecteur Coran, audio MediaRecorder) |
| **Attendance** | `/admin-portal/attendance` (vue jour, aperçu, stats salle, toggles élève) + `/teacher-portal/attendance` (AttendanceClient) + `/parent-portal/attendance` (ParentAttendanceClient) |
| **Announcements** | `/admin-portal/announcements` (CRUD + RTE + image Supabase) + `/teacher-portal/announcements` + `/parent-portal/announcements` (feed partagé `AnnouncementFeed`) |
| **Permissions** | `/admin-portal/permissions` (3 sections admin/trésorier/gestionnaire, search email, pré-accès, revoke "REVOKE") |
| **Parents admin** | `/admin-portal/parents` (liste élèves avec parents liés) |
| **Profile** | `/admin-portal/profile` + `/teacher-portal/profile` + `/parent-portal/profile` (composant partagé `ProfileSettingsClient`) |
| **Audio Coran** | `/teacher-portal/audio` + `/parent-portal/audio` (QuranAudioClient partagé, 6 récitateurs) |
| **Teacher Classes** | `/teacher-portal/classes` (MyClassesClient — mes classes avec devoirs/présences) |
| **Children** | `/parent-portal/children` (cartes par matière, badge subjectCode/level, Présence/Devoirs, Voir le programme) |
| **Exams** | `/admin-portal/track-exams` (4 tabs, search, sort, email rapport, bandeau période) + `/teacher-portal/exams` (liste classes/élèves, star rating form) + `/parent-portal/exams` (bulletins + signature parent) — réglages « saisie ouverte » / « bulletins publiés » par trimestre, voir §7.20 |
| **Finance** | `/admin-portal/finance/budget` (paiements, KPI, rappels impayés) + `/admin-portal/finance/expenses` (3 onglets Remboursements/Salaires/Paiements) + `/teacher-portal/refunds` (auto-soumission remboursements + heures) + `/parent-portal/payments` (statut par trimestre + auto-déclaration "Marquer comme payé") — voir §7.13 |

### ❌ ComingSoon (stub page existe, UI à construire, module backend absent)

| Module | Pages concernées |
|---|---|
| **Stars** | `/admin-portal/track-stars`, `/parent-portal/stars` |
| **Communication** | `/admin-portal/communication/send-email` |
| **Substitutions** | `/admin-portal/substitutions`, `/teacher-portal/substitutions` |
| **Book Tracking** | `/admin-portal/book-tracking` |
| **Reports** | `/admin-portal/reports` |
| **Absence** | `/parent-portal/absence` |
| **Schedule** | `/teacher-portal/schedule`, `/parent-portal/schedule` |
| **Sticky Notes** | `/admin-portal/sticky-notes` |
| **Birthdays** | `/admin-portal/birthdays` |
| **Start New Year** | `/admin-portal/start-new-year` |
| **Roadmap** | `/admin-portal/roadmap` |
| **Rankings / TV** | `/admin-portal/rankings`, `/admin-portal/tv` |

---

## 9. Problèmes connus à corriger (backlog)

### 9.1 Période d'examens — par classe
**État (2026-10)** : deux réglages **par trimestre au niveau de l'école** — saisie ouverte (`examPeriodT{N}Open`) et bulletins publiés (`examResultsPublishedT{N}`), appliqués côté serveur (§7.20).
**Reste à faire** : les colonnes `examPeriodT1Open/T2Open/T3Open` du schéma `classes` existent mais ne sont lues nulle part. Si l'école veut ouvrir la saisie classe par classe, les brancher dans `examsService.getExamFlags` (classe ouverte **et/ou** école ouverte — règle à décider) et ajouter le réglage dans `/admin-portal/classes`.

### 9.2 Rapports
**Problème** : "Date de début d'année non définie" — rapports inopérants si non configuré.  
**Solution** : Bloquer l'accès avec un message + CTA vers school-settings si `yearStartDate` est null.

### 9.3 Intégration email
**Problème** : Page Gmail OAuth incomplète.  
**Solution** : Passer à Resend (déjà dans la stack). La page `send-email` doit utiliser l'API Resend, pas OAuth Gmail.

### 9.4 Dashboard présences/devoirs
**Problème** : Affiche "0 classes" sans contexte.  
**Solution** : Liste des classes sans saisie du jour + compteur jours consécutifs + Nudge contextuel par classe.

---

## 10. Règles de collaboration (équipe + Claude Code)

### Git
- **Une branche par feature** : `feature/module-attendance`, `fix/exams-period`, etc.
- **Jamais de push direct sur `main`** — toujours une PR
- **Lint et types à zéro** : `npm run lint` (ESLint, **aucun avertissement toléré** — `--max-warnings=0`) et `npm run typecheck` doivent passer avant toute PR ; le workflow `.github/workflows/ci.yml` les exécute sur chaque PR et bloque sinon. Un `eslint-disable` n'est accepté que pour une vraie synchronisation avec un système externe, sur une ligne précise et avec la raison en commentaire (`-- …`). Pour `react-hooks/set-state-in-effect` : état dérivé, ajustement pendant le rendu (clé précédente mémorisée) ou remontage par `key`, plutôt qu'un `useEffect` qui recopie une prop dans l'état. Avec React Hook Form, `useWatch({ control, name })` plutôt que `watch()` (qui désactive le React Compiler sur tout le composant).
- **Une PR cible toujours `main`** — jamais une autre branche de feature (pas de PR « empilées »). Chaque branche part de `main` à jour (`git checkout main && git pull && git checkout -b ...`). Si un travail dépend d'une PR pas encore mergée, attendre son merge (ou intégrer `main` une fois qu'elle y est) plutôt que de cibler sa branche. Raison : deux PR empilées (#21, #23) ont été mergées dans la branche parente *après* que celle-ci avait déjà rejoint `main` — leur contenu n'est jamais arrivé dans `main` et a dû être repris dans de nouvelles PR.
- **Chaque dev prend un module de A à Z** (types → service → actions → hooks → UI), pas de découpage par layer

### Mettre à jour ce fichier
**Après chaque session de développement significative** mettre à jour :
- La checklist de la Section 8 (✅/❌)
- La Section 7 si une nouvelle décision d'architecture a été prise
- La Section 9 si un bug est découvert ou corrigé

### Claude Code — spécificités multi-session
- Chaque développeur a sa propre session Claude Code → ce fichier est le seul briefing commun
- **Ne pas supposer** que Claude connaît ce qui a été fait dans une autre session
- Si une décision technique est prise en session, la documenter ici immédiatement
- Toujours lancer Claude Code depuis la racine du repo (`/institut-islamique/`)

---

## 11. Observations visuelles page par page (audit juin 2026)

> Le site de référence https://www.qaf.app/admin-portal est la source de vérité visuelle.
> Toujours prendre des screenshots à jour avant de construire une page.
> Les notes ci-dessous datent de l'audit de juin 2026 : une partie de ces pages est construite depuis (voir §8) — elles restent utiles pour celles marquées ❌.

### Pages à construire — détails visuels clés

**Suivi des présences** (`/attendance`)
- Sélecteur de date + navigation Jour précédent/suivant + bouton "Summary"
- "Aperçu des présences" : ratio teachers ayant soumis + **Nudge Teachers** (cloche, brun `#7a4f30`)
- Section "Statistiques des élèves" (vide si aucune saisie)
- Section "Sélectionner une classe" groupée par salle

**Suivi des devoirs** (`/homework`)
- Structure identique aux présences
- "Aperçu des devoirs" + Nudge Teachers
- "Vue d'ensemble des classes" groupée par salle

**Suivi des étoiles** (`/track-stars`)
- Navigation date + "Aperçu des notations" (ratio enseignants)
- Recherche par enseignant ou classe
- Toggle : "Par nom d'enseignant" / "Par classe"

**Suivi des examens** (`/track-exams`)
- Bandeau jaune si période fermée
- Titre : "Suivi de Trimestre X 2025-2026 • N Classes • N sans soumission"
- Vues : Par classe / Par élève / Complétion / Type
- Actions : Summary PDF, Rapport par email

**Budget** (`/finance/budget`)
- 3 KPI cards : Total Revenus (beige), Dépenses payées (brun), Budget restant (vert)
- Boutons : "Enregistrer un revenu" (orange), "Rappeler les parents impayés" (brun)
- Filter chips : mode paiement + catégorie + période + statut
- Table avec lignes : parent → élève — type — montant — statut (Vérifié/En attente/Rejeté)

**Dépenses** (`/finance/expenses`)
- 3 KPI cards : Approuvé (vert), En attente (orange), Payé (bleu)
- Filtres statut + catégorie, bouton "Nouvelle dépense" (orange)

**Annonces** (`/announcements`)
- URL directe (pas sous /communication/)
- Bouton "Créer une annonce"
- Annonces globales Qaf avec badge "Global"

**Permissions** (`/permissions`)
- 3 sections : Administrateurs / Trésoriers / Gestionnaires
- Boutons "Ajouter" distincts par rôle (orange/vert/bleu)
- Affiche : nom, email, téléphone, badges rôles, statut pending

**Substitutions** (`/substitutions`)
- 3 KPI cards : Ouvertes (beige), En cours (brun), Terminées (vert)
- Tabs : Ouvert / Actif / Historique
- Bouton "Créer une demande"

**Suivi des livres** (`/book-tracking`)
- Layout SplitPanel : sélecteur classe (gauche) + détail (droite)
- Toggle : "Par classe" / "Par élève"

**Rapports** (`/reports`)
- Historique présences : toggles 4/8/12 semaines + Pourcentage/Nombre
- Statistiques substitutions : "Voir les enseignants" / "Voir les remplacements"
- Bloqué si `yearStartDate` null → afficher message + CTA settings

**Sticky Notes** (`/sticky-notes`)
- Fond beige avec diamants en filigrane (même style que le dashboard)
- Bouton "Nouvelle note"
- Notes repositionnables (drag)

**Anniversaires** (`/birthdays`)
- Navigation par mois
- Affiche les élèves dont l'anniversaire est dans le mois sélectionné

---

## 12. Ce qui ne doit jamais changer

- L'identité visuelle chaude (brun `#7a4f30` / orange `#c2440f` / beige `#fdf6f0`)
- La navigation par modules dépliables dans la sidebar gauche
- Le système multi-rôles cumulables sur un même compte
- L'architecture multi-tenant avec isolation par `schoolId`
- L'export Excel disponible sur toutes les listes
- Le bouton "Nudge Teachers" sur les pages de suivi (présences, devoirs, étoiles)
- Le système d'étoiles gamifié
- Les filtres visuels par chips colorés (genre, statut, inscription)
- Le pattern ActionResult pour toutes les Server Actions
- La convention de nommage des dossiers de screenshots (`admin_<page>`)

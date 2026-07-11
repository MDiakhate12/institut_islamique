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
- `manager` → admin complet SAUF Budget & Dépenses

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
```
postgresql://postgres:2qZWrDUaQrHYzZRL@db.nlsltdzoqustykrldaxh.supabase.co:5432/postgres
```
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
│   │   │   ├── class-catalog/        # ✅ Construit (avec DnD, classe précédente/suivante)
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
│   │   │   ├── track-exams/          # ❌ À construire
│   │   │   ├── attendance/           # ❌ À construire
│   │   │   ├── homework/             # ❌ À construire
│   │   │   ├── track-stars/          # ❌ À construire
│   │   │   ├── reports/              # ❌ À construire
│   │   │   ├── book-tracking/        # ❌ À construire
│   │   │   ├── substitutions/        # ❌ À construire
│   │   │   ├── finance/
│   │   │   │   ├── budget/           # ❌ À construire
│   │   │   │   └── expenses/         # ❌ À construire
│   │   │   ├── communication/
│   │   │   │   └── send-email/       # ❌ À construire
│   │   │   ├── announcements/        # ❌ À construire
│   │   │   ├── parents/              # ❌ À construire
│   │   │   ├── sticky-notes/         # ❌ À construire
│   │   │   ├── birthdays/            # ❌ À construire
│   │   │   ├── permissions/          # ❌ À construire
│   │   │   ├── start-new-year/       # ❌ À construire
│   │   │   └── roadmap/              # ❌ À construire
│   │   ├── teacher-portal/           # ❌ À construire
│   │   └── parent-portal/            # 🟡 Partiellement construit
│   │       ├── layout.tsx            # ✅ Sidebar + guard rôle 'parent'
│   │       ├── page.tsx / ParentDashboard.tsx  # ✅ Dashboard
│   │       ├── children/             # ✅ Mes enfants + liaison OTP (LinkChildModal)
│   │       ├── enrollment/           # ✅ S'inscrire maintenant (sélection élève,
│   │       │                         #    [studentId] réinscription, new, success)
│   │       └── (devoirs, présences, annonces, etc.) # ❌ À construire
│   └── portal/
│       └── register/[schoolSlug]/    # ✅ Portail public d'inscription
│           ├── layout.tsx
│           ├── page.tsx              # Nouvel élève
│           ├── PublicRegistrationForm.tsx
│           ├── reenroll/page.tsx     # Réinscription
│           └── success/page.tsx
│
├── modules/                          # Logique métier — CŒUR DU PROJET
│   ├── students/     ✅ (types, schema, service, actions, hooks)
│   ├── teachers/     ✅
│   ├── classes/      ✅ (inclut class_catalog et class_enrollments)
│   ├── calendar/     ✅
│   ├── registrations/ ✅ (form builder + soumission publique)
│   ├── school/       ✅ (paramètres, settings JSONB)
│   ├── attendance/   ❌
│   ├── exams/        ❌
│   ├── finance/      ❌
│   ├── homework/     ❌
│   ├── stars/        ❌
│   ├── substitutions/ ❌
│   ├── communication/ ❌
│   └── books/        ❌
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
│   │                      # academic_events, book_tracking, sticky_notes
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
- À la soumission d'un formulaire `new_student`, `submitRegistrationAction` :
  1. Crée immédiatement un enregistrement dans `students` (+ `guardians` depuis les champs père/mère)
  2. Passe le `studentId` créé à `registrationsService.submit(...)` (colonne `registrations.student_id`, pas dans `formData`)
  3. Crée la `registration` en statut `pending`
- Le form builder utilise `@dnd-kit` pour le drag & drop
- **Un seul formulaire, deux consommateurs** : le portail public (`/portal/register/[schoolSlug]`) et le portail parent authentifié (`/parent-portal/enrollment`) appellent tous les deux `getPublicRegistrationFormAction` + rendent `PublicRegistrationForm` sans variante — toute modification du formulaire par l'admin (`/admin-portal/registration-forms`) se répercute automatiquement des deux côtés, sans déploiement de code.
- `submitRegistrationAction(schoolSlug, formType, formData, knownStudentId?, submitterMemberId?)` — les 2 derniers paramètres sont optionnels et réservés au flux parent-portal authentifié : `knownStudentId` évite de re-matcher l'élève pour une réinscription (on le connaît déjà, on a cliqué dessus dans le sélecteur), `submitterMemberId` déclenche l'auto-liaison (`parentStudents`) du nouvel élève au parent qui vient de le créer, pour qu'il apparaisse immédiatement dans "Mes enfants" sans passer par le flux OTP (décision produit : ne pas attendre l'approbation admin).
- Le sélecteur `/parent-portal/enrollment` marque un élève « Inscrit » (non cliquable) dès qu'une ligne existe dans `registrations` pour son `studentId` — il n'y a pas de notion d'année scolaire sur `registrations`, donc « déjà inscrit » = « a déjà une soumission », peu importe son statut.

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

`ProfileSettingsClient` (`src/components/shared/ProfileSettingsClient.tsx`) est le composant unique rendu par `/admin-portal/profile` et `/parent-portal/profile` (même pattern "un composant, plusieurs consommateurs" que le form-builder d'inscription, voir §7.4). Il n'a pas de prop `portal` — tout est piloté par `session.roles` : la checkbox "Administrateur" est toujours désactivée (le rôle admin ne se retire/s'ajoute que via `/admin-portal/permissions`, pas encore construit), les blocs "ID Enseignant" et "Enfants liés"/"Gérer les enfants" ne s'affichent que si l'utilisateur a le rôle correspondant. Le module `src/modules/profile/` gère nom/téléphone/rôles/langue via Drizzle ; changement d'e-mail, mot de passe et suppression de compte appellent directement `supabase.auth.updateUser()`/`supabaseAdmin.auth.admin.deleteUser()` depuis les server actions (pas de service Drizzle pour ces opérations, elles ne touchent pas nos tables). Chaque action sensible (email, mot de passe, suppression) ré-authentifie d'abord via `signInWithPassword` avant d'agir. Le lien "Edit Profile" de `UserProfileDialog` prend une prop `profileHref` (passée par chaque sidebar : admin/parent/teacher) — avant §7.12 il pointait toujours vers `/admin-portal/profile` en dur, quel que soit le portail d'où il était ouvert. Le "Délier l'enfant" vit dans `parentsService.unlinkChild` / `unlinkChildAction` (module `parents`, pas `profile`, car il opère sur `parent_students`). Le bouton "+ Ajouter un enfant" réutilise `LinkChildModal` déjà construit pour `/parent-portal/children`.

---

## 8. État d'avancement des modules

### ✅ Complètement construit (types + service + actions + hooks + UI)

| Module | Pages |
|---|---|
| **Auth** | Login, callback, signOut, session guard + `/auth/signup` (parent + enseignant) |
| **Layout** | Sidebar (avec UserProfileDialog), Header, PortalLayout, TeacherSidebar, TeacherActivationGate |
| **School** | `/admin-portal/school-settings` |
| **Students** | `/admin-portal/students` (liste + détail + création/édition) |
| **Teachers** | `/admin-portal/teachers` (avec flow création + code d'activation) |
| **Classes** | `/admin-portal/classes` |
| **Class Catalog** | `/admin-portal/class-catalog` (DnD, classe précédente/suivante, curriculum riche) |
| **Calendar** | `/admin-portal/academic-calendar` (vues Année/Mois/Semaine/Jour) |
| **Registration Forms** | `/admin-portal/registration-forms` (form builder DnD complet) |
| **Registrations** | `/admin-portal/registrations` (liste, décodée depuis `formData` + filtres + export Excel) |
| **Public Portal** | `/portal/register/[schoolSlug]` (nouvel élève + réinscription + succès) |
| **Parent Portal — Enrollment** | `/parent-portal/enrollment` (sélection élève, réinscription, nouvel élève, succès — réutilise le même form-builder que le portail public, voir §7.8) |
| **Homework** | `/teacher-portal/homework` (CRUD devoirs Coran + sessions virtuelles Jitsi) |
| **Profile** | `/admin-portal/profile` + `/parent-portal/profile` (composant partagé `ProfileSettingsClient`, voir §7.12 — identité, rôles, langue, e-mail, mot de passe, gestion des enfants, suppression de compte) |

### 🔄 Partiellement construit

| Module | État |
|---|---|
| **Teacher Portal** | Layout + sidebar + gate d'activation ✅ — Seule page devoirs construite (pas encore de `/teacher-portal/profile`, le lien sidebar existe mais 404) |
| **Parent Portal** | Dashboard, sidebar, Mes enfants + liaison OTP, Enrollment (sélection élève, réinscription, nouvel élève), Paramètres du profil ✅ — Devoirs, Présences, Annonces, Audio Coran, Demande d'absence, Étoiles & Trophées, Calendrier, Catalogue des classes, Notes d'examen, Statut de paiement, Emploi du temps restent à construire |

### ❌ À construire (aucun fichier de module)

| Module | Pages à créer |
|---|---|
| **Attendance** | `/admin-portal/attendance`, `/teacher-portal/attendance` |
| **Exams** | `/admin-portal/track-exams`, `/teacher-portal/exams` |
| **Stars** | `/admin-portal/track-stars`, portail enseignant |
| **Finance** | `/admin-portal/finance/budget`, `/admin-portal/finance/expenses` |
| **Communication** | `/admin-portal/communication/send-email`, `/admin-portal/announcements` |
| **Substitutions** | `/admin-portal/substitutions` |
| **Book Tracking** | `/admin-portal/book-tracking` |
| **Reports** | `/admin-portal/reports` |
| **Parents** | `/admin-portal/parents` |
| **Permissions** | `/admin-portal/permissions` |
| **Sticky Notes** | `/admin-portal/sticky-notes` |
| **Birthdays** | `/admin-portal/birthdays` |
| **Start New Year** | `/admin-portal/start-new-year` |
| **Roadmap** | `/admin-portal/roadmap` |
| **TV Mode** | Affichage mural |

---

## 9. Problèmes connus à corriger (backlog)

### 9.1 Période d'examens
**Problème** : Switch global dans school-settings. Les enseignants et parents voient "Période d'examens fermée".  
**Solution** : Configurable par trimestre et par classe (colonnes `examPeriodT1Open/T2Open/T3Open` déjà dans le schéma `classes`). Retirer le switch global.

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
> Les notes ci-dessous sont un complément pour les pages pas encore construites.

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

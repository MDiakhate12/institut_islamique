# Spec — Formulaires d'inscription (`/admin-portal/registration-forms`)

> Basé sur l'audit visuel du 15 juin 2026 (23 screenshots dans `some_screenshots_qaf_app_by_user/admin_formulaire_inscription/`).
> Cette page couvre deux surfaces : le **builder admin** (construction du formulaire) et le **portail parent** (remplissage du formulaire).

---

## 1. Vue d'ensemble

La page `/admin-portal/registration-forms` est un **form builder drag-and-drop** permettant à l'admin de configurer les formulaires d'inscription de l'école. Il existe deux formulaires distincts, sélectionnables via des onglets : **Nouvel élève** et **Réinscription**. Chaque formulaire est rendu publiquement sur une URL dédiée du portail parent (`/portal/register/:schoolSlug` et `/portal/register/:schoolSlug/reenroll`).

### En-tête du builder
- Titre h1 : "Créateur de formulaires d'inscription"
- Sous-titre : "Faites glisser pour réorganiser, cliquez pour modifier"
- Onglets : **Nouvel élève** | **Réinscription** — avec un compteur d'éléments (ex: "7 éléments", "5 éléments")
- Boutons d'action (barre supérieure droite) :
  - `+ Ajouter un bloc d'info` (blanc/outline)
  - `+ Ajouter une section` (brun foncé `#7a4f30`, fond plein)
  - `Réinitialiser` (orange outline avec icône reload)
  - `Aperçu` (outline avec icône externe)
- Barre d'outils flottante en bas : undo / redo / `Copier le lien` (icône chaîne)

---

## 2. Structure du formulaire — Onglet "Nouvel élève"

Le formulaire est organisé en **sections** dépliables/repliables (chevron gauche). Chaque section a un badge coloré, un label "Système" si verrouillée, et un bouton crayon d'édition.

### Section 1 — Informations de l'étudiant *(Système, 13 champs)*

Tous les champs de cette section portent le badge **Système** (non supprimables). Chaque champ affiche : label, astérisque si obligatoire, icône cadenas si verrouillé, placeholder en gris, et poignée de déplacement `:::` à gauche.

| Champ | Type | Obligatoire | Notes |
|---|---|---|---|
| Prénom de l'étudiant | Text input | Oui | Placeholder: "Entrez le prénom" |
| Nom de famille de l'étudiant | Text input | Oui | Placeholder: "Entrez le nom de famille" |
| Date de naissance | Date picker | Oui | Placeholder: "Sélectionnez la date de naissance" |
| Genre | Radio buttons | Oui | Options: Masculin / Féminin (boutons pills) |
| Nom du père ou du tuteur | Text input | Oui | |
| Nom de la mère ou du tuteur | Text input | Oui | |
| E-mail principal | Email input | Oui | Placeholder: "votre.email@example.com" |
| E-mail secondaire | Email input | Non | Label "(Optionnel)" — champ personnalisable (icônes crayon/poubelle visibles) |
| Téléphone principal | Tel input | Oui | Note en italique : "Ce numéro de téléphone sera utilisé pour accéder au portail de votre étudiant(e) sur l'application de l'école !" |
| Téléphone secondaire | Tel input | Non | Label "(Optionnel)" |
| Niveau scolaire actuel | Select dropdown | Oui | Info bleue : "Les options de niveau sont gérées dans les paramètres de l'école" + lien "Configurer les niveaux scolaires" |
| Nom de l'école régulière actuelle | Text input | Oui | |

Bouton **"+ Ajouter une question à la section"** en bas de chaque section.

### Section 2 — Sélection de la classe *(Système)*

Précédée d'un **bloc d'avertissement** (fond beige/orange, icône triangle) :
> "Veuillez vérifier les prérequis du cours avant de choisir une classe !"
> "Le parent est entièrement responsable du choix de la classe appropriée pour son étudiant."
> "Une demande de changement ultérieure devra être discutée avec la direction de l'école."

Lien : "Bouton : voir le catalogue des classes"

La section affiche un **aperçu du catalogue de classes** directement dans le builder, groupé par type :

- **QRN CLASS** (Coran) — Selector "Select QRN Class" + liste de toutes les classes QRN disponibles avec badges colorés (vert "actives", orange "inactives")
- **AAA CLASS** (Arabe) — Selector "Select AAA Class" + liste des classes arabes
- **NUR CLASS** (Nuraniyah) — Selector "Select NUR Class" + liste des niveaux 1 à 5, Radfors High School, Contemporary Islam for Teenage Boys/Girls

Chaque classe dans la liste : nom + code entre parenthèses + badge statut.

### Bloc d'information — "Informations sur les frais (Exemple)"

Bloc de type **INFORMATION** (fond bleu clair, icône ℹ️ bleu). Contenu riche éditable :

> "Les frais d'admission de l'école sont composés de frais de fournitures + frais de scolarité."
> 1. Les frais de fournitures sont de X€/an par étudiant (frais uniques).
> 2. Les frais de scolarité peuvent être payés semestriellement OU annuellement :
>
> Semestriellement :
> - X€ pour un étudiant / X€ pour deux étudiants / X€ pour trois étudiants ou plus
>
> Annuellement :
> - X€ pour un étudiant / X€ pour deux étudiants / X€ pour trois étudiants ou plus
>
> "Si vous avez des questions, veuillez nous contacter à school@example.com"

### Bloc d'avertissement — "Reconnaissance de la Politique"

Bloc de type **AVERTISSEMENT** (fond jaune/orange, icône triangle ⚠️). Contenu :
> "Avant d'envoyer le formulaire, veuillez vous assurer que vous avez examiné et accepté les règlements énoncés sur https://example.com"
> - Politique de l'école
> - Libération de responsabilité (Attawba)
> - Règles de la classe

### Section 3 — Paiement, Parrainage et Accord de Politique *(Système, 3+ champs)*

| Champ | Type | Obligatoire | Notes |
|---|---|---|---|
| Préférez-vous payer les frais semestriellement ou annuellement ? | Radio pills | Oui | Options: Annuellement / Semestriellement |
| Si vous avez besoin d'une aide financière, quelle est la meilleure option pour vous ? | Select dropdown | Non | Info bleue : "Les options financières sont gérées dans les paramètres de l'école" + lien "Configurer les options financières" |
| Aimeriez-vous parrainer les frais de scolarité et/ou de fournitures d'un étudiant ? | Radio | Non | Note en italique : "Parrainage : certains de nos étudiants bénéficient d'une exemption…" Options: "Non, merci." / "Oui, bien sûr. Nous vous contacterons pour l'organiser." |
| [Bloc consentement photo/vidéo] | Checkbox | Non | Texte long : "Le personnel de [école] peut prendre et utiliser les photographies et vidéos de mon enfant publiquement dans les publications imprimées, les publications en ligne, les présentations, le site web de [école] et les réseaux sociaux, sur le bulletin d'information (entre les enseignants et les parents). Je comprends également qu'aucun droit d'auteur, frais ou autre rémunération ne m'est dû en raison de cet usage." |
| Questions ou Commentaires | Textarea | Non | Placeholder: "Entrez toute question ou commentaire que vous avez…" |
| J'acknowledge que j'ai lu et accepte les politiques et les directives ci-dessus | Checkbox | Oui | Note : "Avant d'envoyer le formulaire, veuillez vous assurer que vous avez examiné et accepté les règlements énoncés sur le site web de l'école." |

---

## 3. Structure du formulaire — Onglet "Réinscription"

Le formulaire de réinscription est différent car l'élève est **déjà connu du système**. Les champs identitaires sont pré-remplis et en lecture seule.

### Section 1 — Informations de l'étudiant *(Système, pré-rempli)*

Sous-titre affiché : "Pré-rempli à partir du dossier d'étudiant existant / Pré-rempli = 2 champs"

**Auto-populated Fields (Read-only)** — affichés en liste avec badge "Auto-filled" :
Student Name, Student ID, Gender, Date of Birth, Father's Name, Mother's Name, Email, Phone

Champs éditables supplémentaires :
- Niveau scolaire actuel (dropdown)
- Nom de l'école régulière actuelle (text input)

### Section 2 — Sélection de la classe *(Système, automatique)*

Remplace le sélecteur manuel par un message d'information :
> "Le placement en classe est géré automatiquement par le système."
> "Nous vous déplacerons automatiquement ou enregistrerons les classes en fonction de vos antécédents académiques précédents. Aucune sélection manuelle n'est requise."

Icône ✅ vert (cercle avec checkmark) en tête de section, pas de chevron de déploiement.

### Sections suivantes — Réinscription

Identiques au formulaire "Nouvel élève" :
- Bloc "Informations sur les frais (Exemple)"
- Bloc "Reconnaissance de la Politique"
- Section "Paiement, Parrainage et Accord de Politique" avec champs identiques + champ supplémentaire : **"Comment évaluez-vous l'école l'année dernière ?"** (rating 5 étoiles, exemple "Rating Example")

---

## 4. Interactions du builder (drag-and-drop)

- **Réorganisation** : chaque champ possède une poignée `:::` permettant le glisser-déposer pour réordonner les questions au sein d'une section
- **Edition d'un champ** : icône crayon ✏️ à droite
- **Suppression** : icône poubelle 🗑️ à droite (uniquement sur les champs non-Système)
- **Badge Système** : champs verrouillés (non supprimables, non déplaçables en dehors de leur section) — affichent "Système" en label orange à droite
- **Badge cadenas** 🔒 : à côté du label du champ, indique qu'il est système
- **Undo/Redo** : barres flottantes ↩️ ↪️ persistantes en bas de page

---

## 5. Modales du builder

### Modal "Ajouter un bloc d'information"
- **Titre** : "Ajouter un bloc d'information" / sous-titre : "Ajoutez une section informative à votre formulaire (frais, politiques, avis, etc.)"
- Champ : Titre (facultatif), placeholder "ex. : Informations sur les frais"
- **Style d'affichage** (4 options avec icône + label) :
  - 🟤 INFORMATION (sélectionné par défaut — fond brun/orange)
  - 🟡 AVERTISSEMENT (icône cercle orange)
  - 🟢 SUCCÈS (icône cercle vert)
  - 🔴 ERREUR (icône cercle rouge)
  - Lien : "Thème de couleur"
- **Éditeur de contenu** (rich text) : B / I / S / liste non ordonnée / liste ordonnée / lien / undo / redo
- Boutons : Annuler | **Ajouter le bloc d'info** (orange)

### Modal "Ajouter une nouvelle section"
- **Titre** : "Ajouter une nouvelle section" / sous-titre : "Créez une nouvelle section pour regrouper les champs associés"
- Champ Titre de la section (obligatoire, *), placeholder "ex. : Informations médicales"
- Champ Description (facultatif), textarea placeholder "Brève description de cette section…"
- Boutons : Annuler | **Ajouter la section** (brun)

### Modal "Modifier la section"
- **Titre** : "Modifier la section" / sous-titre : "Mettre à jour le titre et la description de cette section"
- Champ Titre (obligatoire, *) — pré-rempli avec le titre existant (ex: "Informations de l'étudiant")
- Champ Description — éditeur rich text (B/I/S/liste/lien/undo/redo), pré-rempli (ex: "Pré-rempli à partir du dossier d'étudiant existant")
- Boutons : Annuler | **Enregistrer les modifications** (brun)

---

## 6. Portail parent — Aperçu du formulaire de réinscription

URL : `/portal/register/:schoolSlug/reenroll?preview=true`

### Design général (côté parent)
- **Fond blanc** — pas de sidebar, pas de header admin
- **Barre orange** en haut de page (couleur CTA `#c2440f`) : titre "Inscription à [Nom de l'école]" centré en blanc + sous-titre "Année scolaire 2026-2027"
- Lien "← Sélectionner un autre élève" en haut à gauche

### Carte élève sélectionné
- Icône avatar + "Réinscription : Mock Student (Preview)" + "Numéro d'élève : 12345"
- Fond beige clair, arrondi

### Rendu des sections côté parent

Chaque section est une **carte blanche** avec bordure subtile, padding généreux, titre de section en gras coloré.

**Section Informations de l'étudiant** : champs en lecture seule (Élève, ID), puis champs éditables (Niveau scolaire — dropdown, Nom de l'école régulière — text input)

**Section Sélection de la classe** : icône ✅ + texte "Le placement en classe est géré automatiquement par le système." + explication en gris

**Bloc Informations sur les frais** : texte bleu avec icône ℹ️, liste à puces, mise en forme héritée du rich text de l'admin

**Bloc Reconnaissance de la Politique** : icône triangle ⚠️ orange, texte + lien hypertexte, liste à puces des documents

**Section Paiement, Parrainage et Accord de Politique** :
- Question fréquence : dropdown (non sélectionné par défaut)
- Question aide financière : dropdown "Sélectionner une option"
- Question parrainage : radio buttons avec texte explicatif en italique gris + options "Non, merci." (cercle orange sélectionné par défaut) / "Oui, bien sûr…"
- Consentement photo : checkbox avec long texte

**Rating école** : 5 étoiles vides cliquables (★★★★★)

**Questions ou Commentaires** : textarea libre

**Checkbox finale** : "J'acknowledge que j'ai lu et accepte les politiques et les directives ci-dessus" + texte en gris sous la checkbox

**Bouton de soumission** : `Soumettre l'inscription` — bouton orange large, pleine largeur, arrondi
Sous le bouton : lien en petit texte "En cliquant sur 'Soumettre l'inscription', vous acceptez nos Conditions d'utilisation et Politique de confidentialité"

---

## 7. Logique métier à implémenter

### Deux formulaires distincts avec comportements différents

| | Nouvel élève | Réinscription |
|---|---|---|
| Sélection de classe | Manuelle (catalogue affiché) | Automatique (lecture seule) |
| Champs identitaires | Tous à saisir | Pré-remplis depuis le profil existant |
| Lien parent | Contexte inconnu | Lié à un `parentId` + liste de ses élèves |
| Question rating | Non | Oui ("Comment évaluez-vous l'école l'année dernière ?") |

### Champs "Système" vs champs personnalisés
- Les champs **Système** sont définis une fois en dur dans le schéma (non modifiables par l'admin) mais leur visibilité ou leur caractère obligatoire peut être configurable.
- Les champs **personnalisés** (e-mail secondaire, téléphone secondaire, consentement photo, questions/commentaires, rating) peuvent être ajoutés, supprimés et réordonnés par l'admin.

### Blocs d'information
Les blocs ne collectent pas de données — ce sont des éléments de présentation (texte riche + style). Ils sont persistés dans la config du formulaire sous forme de `{ type: 'info_block', style: 'info'|'warning'|'success'|'error', title?: string, content: string }`.

### Sélection de classe (Nouvel élève)
- Affiche le catalogue de classes de l'école, groupé par type (QRN / AAA / NUR)
- Chaque type a un dropdown "Select [TYPE] Class" + liste complète
- Le parent choisit une classe par type ; la validation côté serveur vérifie les prérequis

### URL du formulaire public
- Nouvel élève : `/portal/register/:schoolSlug`
- Réinscription : `/portal/register/:schoolSlug/reenroll`
- L'admin peut copier ces liens via le bouton "Copier le lien" persistant dans le builder

### Soumission côté parent
- Validation : tous les champs obligatoires + checkbox d'acknowledgement obligatoire
- Après soumission : création d'une `registration` en base avec statut `pending`
- Accessible dans `/admin-portal/registrations`

---

## 8. Schéma de données (Drizzle)

```typescript
// registration_forms — config du formulaire (1 par type par école)
{
  id: uuid
  school_id: uuid
  type: 'new_student' | 'reenrollment'
  fields: JsonB  // liste ordonnée de FieldConfig[]
  created_at: timestamp
  updated_at: timestamp
}

// FieldConfig (stocké en JSON dans registration_forms.fields)
type FieldConfig =
  | { kind: 'system_field'; field_key: string; required: boolean }
  | { kind: 'custom_field'; id: string; label: string; type: 'text'|'email'|'tel'|'textarea'|'select'|'radio'|'checkbox'|'rating'|'date'; required: boolean; options?: string[] }
  | { kind: 'info_block'; id: string; style: 'info'|'warning'|'success'|'error'; title?: string; content: string }  // rich text HTML
  | { kind: 'section'; id: string; title: string; description?: string; fields: FieldConfig[] }

// registrations — soumissions des parents
{
  id: uuid
  school_id: uuid
  form_type: 'new_student' | 'reenrollment'
  student_id: uuid | null   // null pour nouveau
  parent_id: uuid
  data: JsonB               // réponses du parent
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: timestamp
  reviewed_at: timestamp | null
  reviewed_by: uuid | null
}
```

---

## 9. Routes à créer

```
/admin-portal/registration-forms              → RegistrationFormsBuilderPage (builder)
/portal/register/[schoolSlug]                 → NewStudentRegistrationPage (formulaire public)
/portal/register/[schoolSlug]/reenroll        → ReenrollmentPage (formulaire public, auth requise)
/portal/register/[schoolSlug]/success         → RegistrationSuccessPage (confirmation)
```

Les pages `/portal/register/...` sont des pages **publiques sans sidebar**, avec uniquement la barre orange en header et un layout centré (max-width ~700px).

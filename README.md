# SZ Dev Hub

Application interne de gestion commerciale et comptable pour une micro-entreprise :
pré-devis → devis → factures → encaissements → comptabilité micro-entrepreneur.

Mono-utilisateur aujourd'hui, conçue pour accueillir d'autres membres plus tard
(toutes les données sont rattachées à une organisation, avec des rôles).

## Stack

| Rôle | Choix |
|---|---|
| Framework | Next.js 16 (App Router, Cache Components), TypeScript strict |
| UI | Tailwind CSS 4, shadcn/ui (Radix), Recharts |
| Données | Prisma 7 (client généré dans `generated/prisma`), `@prisma/adapter-neon`, Neon |
| Authentification | Better Auth (e-mail / mot de passe) |
| Fichiers | Vercel Blob (store privé) |
| PDF | `@react-pdf/renderer`, côté serveur |
| Validation | Zod, partagé entre formulaires et Server Actions |

## Démarrage

Prérequis : Node.js 22+, pnpm, une base Neon.

```bash
pnpm install
```

```bash
cp .env.example .env
```

Renseignez `.env` (voir [Variables d'environnement](#variables-denvironnement)), puis créez le schéma :

```bash
pnpm db:deploy
```

Lancez l'application :

```bash
pnpm dev
```

Ouvrez http://localhost:3000 : sans compte existant, vous êtes dirigé vers `/setup` pour créer
le compte propriétaire. C'est la seule façon de créer un compte — l'inscription publique est fermée.

### Données de démonstration (facultatif)

Pour explorer l'application avec 18 mois d'activité fictive (clients, devis, factures, paiements,
dépenses, déclarations URSSAF), définissez `SEED_USER_EMAIL` et `SEED_USER_PASSWORD` dans `.env`, puis :

```bash
pnpm db:seed
```

Le seed refuse de tourner sur une base non vide. `pnpm db:seed:reset` **vide la base** avant de la remplir :
à ne jamais lancer sur vos vraies données.

## Variables d'environnement

| Variable | Obligatoire | Rôle |
|---|---|---|
| `DATABASE_URL` | oui | URL Neon **poolée**, utilisée par l'application |
| `DATABASE_URL_UNPOOLED` | recommandé | URL Neon **directe**, utilisée par la CLI Prisma (migrations). À défaut, `DATABASE_URL` est utilisée |
| `BETTER_AUTH_SECRET` | oui | Secret de signature des sessions (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | oui | URL publique de l'application |
| `BLOB_READ_WRITE_TOKEN` ou `BLOB_STORE_ID` | en production | Store Vercel Blob : jeton, ou identifiant du store (authentification OIDC). L'un des deux est ajouté par Vercel quand le store est connecté au projet. Absents en local : les fichiers vont dans `./.storage` |
| `BLOB_ACCESS` | non | `private` (défaut) ou `public`, selon le type du store Blob |
| `CRON_SECRET` | en production | Protège `/api/cron/daily` |
| `SETUP_TOKEN` | non | Si défini, `/setup` exige ce code pour créer le compte propriétaire |
| `SEED_USER_EMAIL`, `SEED_USER_PASSWORD` | pour le seed | Identifiants du compte de démonstration |
| `NEON_LOCAL_WS_PROXY` | non | Développement sur un Postgres local (voir plus bas) |

## Déploiement sur Vercel

1. Importez le dépôt dans Vercel.
2. **Base** : ajoutez l'intégration Neon (Storage › Neon). Elle fournit `DATABASE_URL` et `DATABASE_URL_UNPOOLED`.
3. **Fichiers** : créez un store Blob en accès **privé** (Storage › Blob) et connectez-le au projet.
   Vercel ajoute `BLOB_READ_WRITE_TOKEN` ou `BLOB_STORE_ID`.
4. Ajoutez `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (votre domaine) et `CRON_SECRET`.
5. Déployez. Le script `vercel-build` génère le client Prisma puis applique les migrations
   (`prisma migrate deploy`) avant le build.
6. Ouvrez `/setup` pour créer votre compte, puis complétez **Paramètres › Entreprise**.

Le cron quotidien est déclaré dans `vercel.json` (passage des devis en « expiré », des factures en
« en retard », création des périodes URSSAF). L'application fait la même synchronisation au premier
chargement de la journée : le cron n'est qu'une garantie supplémentaire.

## Scripts

| Commande | Effet |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Développement, build, production |
| `pnpm typecheck` | Génère les types de routes puis vérifie TypeScript |
| `pnpm lint` | ESLint |
| `pnpm db:migrate` | Crée et applique une migration (développement) |
| `pnpm db:deploy` | Applique les migrations existantes (production) |
| `pnpm db:studio` | Prisma Studio |
| `pnpm db:seed` / `pnpm db:seed:reset` | Données de démonstration (le second vide la base) |
| `pnpm user:reset-password <e-mail>` | Réinitialise un mot de passe (il n'y a pas d'envoi d'e-mail) |
| `pnpm db:proxy` | Proxy WebSocket pour développer sur un Postgres local |

### Développer sur un Postgres local (optionnel)

L'adaptateur Neon parle à la base en WebSocket. Pour utiliser un Postgres local plutôt qu'une
branche Neon, lancez `pnpm db:proxy` et ajoutez dans `.env` :

```
DATABASE_URL="postgresql://user@localhost:5432/szdev_hub?sslmode=disable"
NEON_LOCAL_WS_PROXY="localhost:54330/v1"
```

## Arborescence

```
app/
  (auth)/            connexion, première configuration
  (app)/             application (coque statique + pages)
    page.tsx         tableau de bord
    clients/ catalogue/ pre-devis/ devis/ factures/
    comptabilite/    recettes, dépenses, URSSAF, plafonds, exports
    parametres/      entreprise, apparence, documents, facturation, comptabilité, compte
    */actions.ts     Server Actions du module
  api/
    auth/            Better Auth
    files/           fichiers privés (contrôle d'accès)
    branding/        logo et favicon (publics : page de connexion)
    pdf/             PDF des pré-devis, devis, factures
    export/          CSV et PDF comptables
    cron/daily/      tâche quotidienne
components/
  ui/                shadcn/ui (généré)
  shared/ layout/ charts/ documents/ …   composants par domaine
lib/
  server/            accès aux données et règles métier (côté serveur uniquement)
  pdf/               gabarits et rendu des documents
  documents/         « photographies » de documents, constructeurs purs
  validation/        schémas Zod
  money.ts dates.ts format.ts numbering.ts …   fonctions pures
prisma/
  schema.prisma  migrations/  seed.ts
assets/fonts/        polices des PDF (licence OFL)
```

## Principes de conception

**Montants et dates.** Les montants sont des entiers en centimes, les quantités en millièmes, les taux
en points de base : aucun flottant. Les dates de document (émission, échéance, paiement) sont des dates
calendaires (`DATE`) ; les horodatages techniques sont en UTC et affichés à l'heure de Paris.

**Numérotation des factures.** Un brouillon n'a pas de numéro. À l'émission, une seule transaction
incrémente le compteur sous verrou, contrôle l'ordre chronologique, fige la photographie du document,
rend le PDF et l'archive. Si une étape échoue, tout est annulé, numéro compris : ni trou, ni doublon,
ni facture émise sans archive. Changer le format de numérotation ne touche jamais aux numéros déjà
attribués et la série continue.

**Factures verrouillées.** Une facture émise ne se modifie ni ne se supprime : elle se corrige par un
avoir. Son PDF est archivé dans le stockage et resservi tel quel ; un changement de logo, de couleur ou
d'adresse n'affecte jamais un document déjà émis. Chaque facture garde aussi une photographie JSON
complète (`Invoice.snapshot`), base d'un futur export Factur-X — voir `lib/einvoice/index.ts`.

**Statuts.** Le statut d'une facture est entièrement déduit de ses montants et de son échéance par
`computeInvoiceStatus`, rappelée après chaque paiement, chaque avoir, et une fois par jour.

**Comptabilité.** Le livre des recettes n'est pas saisi : c'est la liste des paiements enregistrés.
Les cotisations sont estimées avec le taux en vigueur à la date de chaque encaissement ; les taux
forment un historique dans les paramètres et aucun n'est écrit dans le code. Une période déclarée
fige ses montants.

**Tableau de bord.** Tous les indicateurs sont des agrégations SQL (`lib/server/dashboard.ts`).
L'encours et les retards sont calculés « à date », ce qui rend la comparaison avec la période
précédente honnête. Les graphiques dérivent de la couleur d'accent ; la palette catégorielle est
contrôlée (clarté, distinction pour les daltoniens) dans `lib/chart-palette.ts`.

**Rendu.** Les Cache Components de Next.js sont activés : la coque (menu, logo, couleur d'accent) est
statique et instantanée, les données de l'utilisateur sont diffusées derrière des squelettes. L'identité
visuelle est mise en cache et invalidée à l'enregistrement des paramètres d'apparence.

**Sécurité.** Chaque page, Server Action et route d'API vérifie la session côté serveur et filtre par
organisation. Le proxy ne fait qu'un contrôle optimiste du cookie. Les fichiers sont privés et servis
par l'application. Les uploads d'images sont rastérisés (SVG compris).

## Ce que l'application ne fait pas (encore)

- **TVA** : l'application facture en franchise en base. Elle suit les seuils de franchise et vous
  alerte, mais ne gère pas la facturation avec TVA.
- **Envoi d'e-mails** : devis, factures et relances ne sont pas envoyés ; les statuts « envoyé » et les
  relances se consignent à la main.
- **Factur-X** : l'architecture est prête, l'export n'est pas implémenté.
- **Gestion des membres** : le modèle de données et les rôles existent, pas l'écran d'invitation.

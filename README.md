# StockFlow — SaaS de gestion de stock & facturation

Outil de gestion commerciale pour commerces locaux : **vente directe en caisse, tickets imprimables, suivi de stock, export PDF, tableau de bord, authentification et rôles**.

> ⚠️ **Nouveau mode de fonctionnement** : il n'y a **plus de gestion des clients**. Les ventes sont enregistrées directement sur la facture : seul le **nom de la boutique** et le **montant payé** apparaissent sur le ticket.

## Stack

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Base de données | PostgreSQL 17 + Prisma ORM |
| Graphiques | Recharts |
| PDF | PDFKit |
| Ticket thermique | HTML/CSS 80 mm + `window.print()` |
| Validation | Zod |

## Fonctionnalités

### 🧾 Vente directe (mode caisse)
- Aucun client à renseigner : vous choisissez les articles et vous encaissez
- **Montant remis par le client** + calcul automatique de la **monnaie rendue**
- Bouton « Exact » pour régler au montant pile
- Statut **Payée** par défaut, avec possibilité de passer en Envoyée / Brouillon / Annulée
- Numérotation automatique `FAC-ANNÉE-XXXX` (préfixe configurable)
- Recherche par numéro ou article

### 🖨️ Impression sur imprimante de facturation
- Bouton **« Imprimer le ticket »** sur la liste et la fiche de vente
- Ticket **80 mm** optimisé pour imprimante thermique (police monospace, texte noir, séparateurs pointillés)
- Contenu du ticket : **nom et coordonnées de la boutique**, numéro, date, caissier, articles, sous-total, remise, TVA, **TOTAL TTC**, **MONTANT PAYÉ**, **monnaie rendue**, message de pied de page et code-barres visuel
- Le ticket s'imprime directement via le dialogue d'impression du navigateur (aucun pilote supplémentaire)
- Export **PDF A4** également disponible avec la même mise en page boutique

> 💡 Pour une impression sans clic : ouvrez l'URL `GET /api/invoices/:id/receipt?autoprint=1` dans le navigateur de la caisse — le ticket se lance automatiquement.

### 📦 Produits & stock
- CRUD complet (nom, SKU unique, catégorie, prix d'achat/vente, unité, seuil d'alerte)
- Formulaire en 3 sections : identification, prix & marge, stock
- Génération automatique du SKU depuis le nom, catégories existantes ou nouvelles, unités rapides
- Calcul en direct de la marge unitaire et du taux de marge
- Recherche et filtres (catégorie, stock faible)
- Ajustement manuel du stock (admin uniquement)
- **Mouvements de stock** tracés avec historique par produit
- Une vente déduit le stock ; l'annuler ou la supprimer le restaure (contrôle de stock insuffisant)

### 🔔 Notifications
- Centre de notifications intégré (cloche 🔔 dans l'en-tête + page dédiée) avec badge de messages non lus
- **Stock faible** : une alerte par produit, avec le nom de l'acteur qui a déclenché l'action
- **Nouvelle vente** : montant, articles et **nom du vendeur**
- **Rapport quotidien** : généré automatiquement chaque soir à 20 h (planificateur cron)
- **Emails SMTP** envoyés aux administrateurs et à l'adresse configurée dans les paramètres ; sans SMTP, un aperçu est affiché dans les logs serveur
- Permissions : tout le monde peut **voir** et marquer comme lu ; **seul l'admin peut supprimer** une notification, configurer l'email et générer le rapport manuellement

### 🔐 Authentification & rôles
- Connexion JWT (7 jours), mots de passe bcrypt
- **Admin** : accès total (utilisateurs, paramètres, suppressions, ajustements de stock)
- **Vendeur** : produits, ventes, tickets, suivi des stocks
- Modification du mot de passe, activation/désactivation des comptes

### 📊 Tableau de bord
- KPI : CA total, CA du mois, encaissé, impayés, ventes, panier moyen, produits, stock faible
- Évolution des ventes sur 6 mois, répartition par statut, top 5 produits
- Alertes de stock faible et dernières ventes

### ⚙️ Paramètres
- Identité de la boutique (nom, adresse, téléphone, NIF…) — affichée sur les tickets et PDF
- Devise, préfixe de facturation, message en pied de ticket
- Email de réception des notifications + bouton de test (admin uniquement)

## Démarrage

### Prérequis
- Node.js ≥ 20
- PostgreSQL 17 (le projet utilise une instance portable autonome sur le port 5433)

```powershell
# 1. Dépendances
npm install

# 2. Base de données (déjà initialisée ; pour repartir de zéro)
powershell -ExecutionPolicy Bypass -File scripts\pg.ps1 -Action start
npm run db:setup

# 3. API (4000) + interface (5173)
npm run dev
```

Ouvrez **http://localhost:5173**.

### Comptes par défaut (acteurs)

Aucune donnée de démonstration n'est chargée : produits, ventes, stocks et notifications sont vides. Seuls les comptes d'accès sont créés :

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| 👑 Admin | `admin@stockflow.local` | `Admin123!` |
| 🧑‍💼 Vendeur | `vendeur@stockflow.local` | `Vendeur123!` |

Identifiants pré-remplis sur la page de connexion. Complétez le nom de la boutique dans **Paramètres** avant de facturer.

## Scripts utiles

| Commande | Description |
|----------|-------------|
| `npm run dev` | API + frontend en parallèle |
| `npm run build` | Compile backend et frontend |
| `npm run db:setup` | Prisma generate + migrations + seed |
| `npm run db:reset` | Réinitialise la base et recharge le seed |
| `powershell -File scripts\pg.ps1 -Action start\|stop\|status` | PostgreSQL portable |

## Configuration

- Backend : `server/.env` (`DATABASE_URL`, `JWT_SECRET`, `PORT`, `CLIENT_ORIGINS`)
- Frontend : `client/.env` (`VITE_API_URL`)
- Base portable : `postgresql://postgres:<mot de passe local>@127.0.0.1:5433/stockflow` (identifiants dans `server/.env`)

## Structure

```
stockflow-saas/
├── client/src/
│   ├── components/     # Layout, UI, widgets, gardes
│   ├── context/        # AuthContext
│   ├── lib/            # Client API (printReceipt, downloadInvoicePdf…)
│   ├── pages/          # Dashboard, Produits, Ventes, Notifications, Utilisateurs, Paramètres…
│   └── types/
├── server/
│   ├── prisma/
│   │   ├── schema.prisma   # User, Company, Product, Invoice, InvoiceItem, StockMovement, Notification
│   │   ├── migrations/     # init, remove_clients, add_notifications
│   │   └── seed.ts
│   └── src/
│       ├── routes/         # auth, users, products, invoices, dashboard, company, notifications
│       ├── services/       # factures, PDF, ticket thermique, notifications, emails
│       ├── middleware/     # JWT + rôles
│       └── utils/          # Zod, sérialisation
└── scripts/pg.ps1
```

---

*StockFlow — vendez, imprimez, suivez. 📈*

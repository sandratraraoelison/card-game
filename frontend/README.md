# Frontend Rami Malagasy

Voir le [guide du projet](../readme.md) pour les commandes, les règles et la connexion NestJS.

Depuis ce dossier : `npm ci`, puis `npm run dev`.

Déploiement prévu sur **Vercel** : dossier racine `frontend`, accès aux sources hors racine activé pour `packages/game`. Voir [les réglages détaillés](../docs/deployment.md).

Le code du jeu se trouve dans `src/features/game` ; les routes et styles globaux restent dans `src/app`. Aucun appel réseau de partie n’est actif. `.env.example` réserve l’URL du futur backend Render.

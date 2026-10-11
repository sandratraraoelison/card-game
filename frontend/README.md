# Frontend Rami Malagasy

Voir le [guide du projet](../README.md) pour les commandes, les règles et la connexion NestJS.

Depuis ce dossier : `npm ci`, puis `npm run dev`.

Déploiement prévu sur **Vercel** : dossier racine `frontend`, accès aux sources hors racine activé pour `packages/game`. Voir [les réglages détaillés](../docs/deployment.md).

Le code du jeu se trouve dans `src/features/game` ; les routes et styles globaux restent dans `src/app`. La route `/` propose une simulation locale explicitement indiquée ; `/online` utilise l'API NestJS avec polling HTTP et sessions invitées persistées dans le navigateur.

Pour configurer une API explicite, copier `.env.example` vers `.env.local` si ce fichier n'existe pas encore, puis renseigner `NEXT_PUBLIC_API_URL`, suffixe `/api` inclus. Sans cette variable, l'interface utilise l'hôte du navigateur sur le port 3001. Redémarrer le serveur après modification ; en production, refaire le build.

Les hooks d'application dépendent de `GameService` et `LobbyService`. Les compositions injectent les adaptateurs locaux ou HTTP ; les composants ne modifient pas le moteur. Les règles restent dans `../packages/game`. Voir [l'architecture](../docs/architecture.md).

Depuis la racine, `npm run test:front` lance les tests unitaires, `npm run test:e2e` les parcours locaux et `npm run test:online` les parcours multijoueur. Installer Chromium une fois avec `npm --prefix frontend exec -- playwright install chromium`. Arrêter le backend local avant les tests en ligne, qui utilisent le port 3001 pour leur API de test isolée.

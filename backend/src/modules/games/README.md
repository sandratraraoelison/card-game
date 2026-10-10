# Parties

Le serveur autoritaire est implémenté dans [multiplayer/application/games.ts](../multiplayer/application/games.ts). Les commandes appellent le moteur partagé dans une transaction du dépôt. La compilation CommonJS de `packages/game` est automatique via `backend/scripts/build-game.cjs`. Les règles ne sont pas recopiées dans NestJS.

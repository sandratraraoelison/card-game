# Backend NestJS — multijoueur

L’API permet de jouer à 4 ou 5 personnes sur le réseau. Le serveur distribue les cartes et exécute toutes les commandes avec `@rami/game`. Les bots restent réservés à la simulation locale.

Depuis la racine : `npm run setup:back`, puis `npm run dev:back`. Node.js 24 est requis. La compilation du domaine partagé est automatique avant le démarrage, les tests et le build du backend.

- API : `http://localhost:3001/api`
- Interface : `http://localhost:3000/online`
- Configuration : copier `.env.example` vers `.env`.
- Tests : `npm run test:back`, puis `npm run test:online` depuis la racine.
- Production : `npm run build:back`, puis `npm run start:back`.

## Organisation

```text
src/modules/multiplayer/
  domain/models.ts              Salon, session, erreurs applicatives
  application/ports.ts          Contrats des dépôts, horloge et identifiants
  application/sessions.ts       Sessions invitées
  application/rooms.ts          Création, adhésion, départ, vues autorisées
  application/games.ts          Démarrage et commandes atomiques
  infrastructure/sqlite-store.ts  Dépôts SQLite et transactions
  transport/controllers.ts      Adaptateurs HTTP NestJS
  transport/validation.ts        Validation stricte des requêtes inconnues
  transport/http.ts             Guards, limitation de débit, filtre d’erreurs
  multiplayer.module.ts         Assemblage et injection des dépendances
```

Le domaine et l’application n’importent ni NestJS ni SQLite. L’application ne connaît que les ports ; le module NestJS injecte les implémentations. Les controllers ne modifient jamais directement les cartes. Le transport peut évoluer vers SSE/WebSocket sans réécrire les cas d’usage.

## Contrat HTTP

Toutes les routes sauf la création de session et la santé exigent `Authorization: Bearer <token>`.

| Méthode | Route sous /api | Corps / résultat |
|---|---|---|
| GET | /health | Santé, multiplayerReady |
| POST | /sessions | { displayName } → { token, player } |
| GET | /sessions/me | Joueur authentifié |
| GET | /rooms | Résumés des salons ouverts |
| POST | /rooms | { name, capacity: 4 ou 5 } |
| GET | /rooms/:id | Salon et vue privée éventuelle |
| POST | /rooms/:id/join | Rejoindre ou retrouver sa place |
| DELETE | /rooms/:id/members/me | Quitter hors manche active |
| POST | /rooms/:id/game/start | Hôte seulement, effectif complet |
| POST | /rooms/:id/game/commands | CommandEnvelope → { result, room } |

Exemple de commande :
```json
{
  "gameId": "identifiant-de-manche",
  "playerId": "identifiant-du-joueur-authentifie",
  "expectedRevision": 0,
  "commandId": "identifiant-unique-de-cette-action",
  "command": { "type": "draw", "source": "stock" }
}
```

Le client conserve le même `commandId` pour réessayer une action dont la réponse a été perdue. Le serveur conserve les 1000 derniers accusés de chaque manche. La réutilisation avec un contenu différent est refusée. Une révision périmée ne rejoue jamais un coup. Une erreur de règle retourne `result.ok: false` ; identité, accès, schéma et conflits de salon utilisent les statuts HTTP 400/401/403/404/409/429.

Les sessions expirent après 30 jours ; seul le hash du jeton aléatoire est stocké en base. Les salons expirent après 7 jours sans mutation. Un joueur déconnecté garde sa place et la partie attend son retour ; aucun bot ni abandon automatique n’est ajouté. Un départ en salle d’attente transfère l’hôte au premier joueur restant. Après une manche terminée, un départ remet le salon en attente.

## Persistance et exploitation

SQLite conserve sessions, salons, manches et accusés. Chaque commande utilise une transaction `BEGIN IMMEDIATE`. Les données du domaine sont sauvegardées en JSON ; une évolution incompatible du schéma nécessite une migration explicite. Sauvegarder le fichier via une procédure SQLite cohérente avec WAL, pas en copiant uniquement le fichier principal à chaud.

`DATABASE_PATH` vaut `./data/rami.sqlite` par défaut ; `:memory:` est réservé aux tests. Le serveur doit utiliser un volume durable pour conserver les parties après redéploiement. Cette version cible une instance Node ; passer à plusieurs instances exige un dépôt transactionnel partagé et une limitation de débit partagée.

La synchronisation frontend interroge le salon toutes les secondes, sans requêtes de polling chevauchantes. Les commandes sont envoyées immédiatement. La reprise recharge la dernière vue privée, sans rejouer l’historique côté client.

Les payloads JSON sont limités à 16 Ko, les champs inconnus rejetés et le débit limité par IP. `TRUST_PROXY_HOPS` doit correspondre exactement à la chaîne de proxies de confiance (0 en local). Déployer l’API derrière HTTPS et configurer les origines CORS exactes.

Voir [l’architecture](../docs/architecture.md) et [le déploiement](../docs/deployment.md).

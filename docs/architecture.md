# Architecture et responsabilités

## Découpage

```text
packages/game/src/
  types.ts, network.ts           Entités, commandes, vues, ports GameService/LobbyService
  rules.ts                       Règles et validation, sans framework
  engine.ts                      Distribution, transitions, scénarios locaux
  detect-melds.ts, turn-order.ts  Détection et ordre de jeu

backend/src/
  modules/health/                Santé HTTP
  modules/multiplayer/
    domain/                     Sessions, salons, erreurs
    application/                Cas d’usage Sessions, Rooms, Games et ports
    infrastructure/             SQLite et transactions
    transport/                  Controllers HTTP, validation, guards
    multiplayer.module.ts       Composition NestJS
  config/                       PORT, CORS, base de données, proxies
  app.module.ts                 Assemblage des modules

frontend/src/
  app/page.tsx                  Simulation locale
  app/online/page.tsx            Jeu en réseau
  features/game/
    application/                Contrôleurs React et sélecteurs ; dépend des ports
    infrastructure/             LocalGameService, NestGameService, NestLobbyService
    composition/                LocalGameSession, OnlineGameSession ; injection
    components/                 Table, cartes exposées, combinaisons, salons
    hooks/                      Gestes souris/tactile
  shared/components/            Primitives cartes et retours utilisateur
```

## Dépendances et maintenance

Les règles restent exclusivement dans `packages/game`. Aucun composant ne distribue les cartes ou ne change directement le moteur. Le backend et le frontend n’importent jamais leurs sources respectives.

Les cas d’usage backend ne dépendent que du domaine et des ports `RoomRepository`, `SessionRepository`, `Clock` et `IdentitySource`. Le module NestJS injecte SQLite et les générateurs cryptographiques. La validation des payloads est une responsabilité du transport ; elle ne remplace pas les règles du moteur.

Les hooks d’application frontend dépendent de `GameService` et `LobbyService`, jamais d’un adaptateur concret. Seules les compositions construisent les services. ESLint contrôle ces frontières. Un test backend interdit les dépendances vers NestJS, SQLite ou le transport dans les couches internes.

`PlayingCard`, `CardBack` et `Feedback` sont les primitives partagées. Les composants métier restent dans `features/game/components` et reçoivent des données et callbacks explicites. `MeldCard` et `ExposedCards` peuvent être utilisés en lecture seule. Les composants de salon gèrent uniquement leurs champs de formulaire ; les cas d’usage et le polling restent hors des composants de présentation.

## Cycle réseau

1. Création d’une session invitée et d’un salon à capacité fixe 4 ou 5.
2. Les joueurs rejoignent avec le code. Seul l’hôte démarre, quand le salon est complet.
3. Le serveur crée la partie, choisit la référence et distribue avec un générateur cryptographique. Aucun adversaire réseau n’est simulé.
4. Chaque commande porte une révision et un identifiant. Session, appartenance, schéma et identité sont contrôlés.
5. Une transaction verrouille le salon, déduplique l’action, appelle `applyCommand` et enregistre état et accusé ensemble.
6. `toGameView` construit la réponse pour le seul joueur authentifié. Les mains adverses, groupes non exposés et ordre de pioche restent privés.
7. Le frontend actualise sa vue toutes les secondes et après ses commandes. Une révision ancienne ne remplace pas une vue plus récente. Le salon possède sa propre révision monotone, conservée entre les manches, pour écarter aussi les réponses retardées d’une ancienne manche.
8. La session et le salon sont mémorisés dans le navigateur. Après rechargement ou coupure réseau, la dernière vue est récupérée. Le service précédent est désactivé lors d’un changement de manche.

Le transport actuel est HTTP avec polling, pas WebSocket. `NestGameService` implémente le même port que la simulation ; le transport pourra être remplacé sans modifier la table ou les règles.

SQLite convient à cette première version à instance unique. Le contrat transactionnel devra être conservé lors d’une migration vers PostgreSQL ; un adaptateur asynchrone nécessitera aussi l’adaptation explicite des signatures de ports/cas d’usage. Aucune promesse ne doit être introduite dans le callback SQLite synchrone.

## Simulation locale et règles

La route locale reste explicitement une démonstration. Le sélecteur 4/5 redémarre immédiatement une manche locale. En ligne, la capacité est choisie à la création du salon ; le sélecteur de table est désactivé et le redémarrage dépend de l’hôte.

Les simulations `exposure` et `joker-win` sont choisies par la composition. `createJokerWinDemo` reste dans le domaine et passe par les commandes normales. Le 4 de cœur remplace le 7 de cœur avec le 4 de pique comme référence.

« Afficher 10 cartes » et « Terminer à 13 » soumettent les groupes préparés et détectés ensemble. Le moteur valide avant de modifier l’état. L’exposition à 10 ne termine jamais la manche ; seule la déclaration à 13 gagne. La référence centrale n’est pas un joker de substitution.

## Compilation et vérification

Next.js transpile les sources de `@rami/game`. Le backend les compile en CommonJS avec déclarations avant build/dev/test ; `packages/game/dist/package.json` isole ce format du paquet ESM. Ne jamais exécuter les sources TypeScript du domaine directement en production Node.

- `npm test` : règles partagées et API HTTP, transactions, permissions, persistance.
- `npm run lint` : frontières frontend et vérification TypeScript backend.
- `npm run test:e2e` : parcours locaux ordinateur/mobile.
- `npm run test:online` : quatre/cinq navigateurs indépendants, reprise et coupure réseau.
- `npm run build` : deux applications.

Les serveurs lancés par Playwright sont arrêtés après les vérifications. Un serveur frontend déjà actif est réutilisé. Voir [l’API](../backend/README.md) et [le déploiement](deployment.md).

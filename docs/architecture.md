# Architecture et responsabilités

## Découpage

```text
packages/game/src/
  economy.ts                     Crédits fictifs Ar, validation des mises et règlement du pot
  identifiers.ts                 UUID v4 via getRandomValues, compatible HTTP sur réseau local
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

L'hôte peut terminer le salon après confirmation avec `DELETE /rooms/:id`. L'autorisation est vérifiée côté serveur. La suppression et le remboursement des fonds non dépensés utilisent une transaction unique : une manche active rend ses mises ; les reports encore disponibles sont répartis également entre les membres actuels, avec les éventuels Ariary restants attribués dans l'ordre des sièges. Les prix déjà versés ne sont pas repris. Les clients reviennent au choix de salon dès que la suppression est détectée.

À la fin d'une manche en ligne, `OnlineRoundResult` affiche les gains et les reports à partir de propriétés explicites. Chaque membre confirme via `POST /rooms/:id/game/ready` avec l'identifiant de la manche terminée. Les confirmations sont persistées dans le salon. Le dernier joueur prêt déclenche le démarrage et le prélèvement atomiques ; l'hôte ne peut pas contourner cette attente via `/start`. Une confirmation répétée ne relance pas une deuxième manche, et un identifiant ancien ne rend pas le joueur prêt pour une nouvelle manche. La première manche reste démarrée par l'hôte depuis la salle d'attente.

Le domaine applique deux exceptions à la victoire par déclaration à 13 : au moins trois vrais jokers au partage, ou les quatre vrais jokers réunis en main après une pioche dans le stock. Le résultat précise `jokers-deal` ou `jokers-play`. Ces victoires attribuent tous les prix engagés, reports inclus, au gagnant, même si un prix des 10 cartes avait été réservé auparavant. Le règlement reste atomique et ne peut être versé deux fois.

Une main initiale contenant au moins quatre paires de cartes identiques (valeur, enseigne, deux copies distinctes) provoque une redistribution automatique, avec nouvelle référence et sans prélèvement supplémentaire. La victoire par jokers a priorité ; le premier siège éligible gagne si plusieurs joueurs satisfont la condition. Le moteur limite à 100 tentatives pour éviter une boucle infinie avec une source aléatoire défaillante ; une erreur annule la transaction et tous les prélèvements. Les scénarios guidés conservent leur distribution prévue.

Les crédits fictifs sont exprimés en Ar, sans paiement. Une session reçoit un solde initial de 10 000 Ar. La mise du salon est un entier entre 0 et 100 000 Ar et reste identique à chaque manche. Les soldes sont conservés dans la table SQLite `wallets`, séparément des sessions et des salons. Les anciens salons sans mise restent gratuits.

Le prélèvement de tous les joueurs et le démarrage utilisent la même transaction SQLite : un solde insuffisant annule tout le démarrage. Le moteur partagé détermine la victoire valide à 13 cartes ou la manche nulle ; `settlePot` attribue deux mises plus le report au premier joueur ayant explicitement exposé 10 cartes naturelles, et les autres mises au gagnant à 13 cartes. Les gains sont versés à la fin de la manche. Une déclaration directe valide à 13 gagne aussi le prix des 10 cartes encore disponible si ses combinaisons contiennent un sous-ensemble naturel valide de 4 + 3 + 3. Les prix des 10 cartes et de la victoire ont des reports distincts : chaque prix non remporté est ajouté à celui de la manche suivante, y compris en cas de manche nulle. Les mises ne sont pas remboursées sur une manche nulle ; un prix des 10 cartes déjà remporté est versé à son premier exposant. Le report, le premier exposant et le report engagé dans la manche sont persistés avec le salon. Le versement et la sauvegarde du résultat sont atomiques, avec un identifiant de manche réglée pour empêcher les doubles versements. L'interface n'effectue aucun calcul de solde faisant autorité.

Next.js transpile les sources de `@rami/game`. Le backend les compile en CommonJS avec déclarations avant build/dev/test ; `packages/game/dist/package.json` isole ce format du paquet ESM. Ne jamais exécuter les sources TypeScript du domaine directement en production Node.

- `npm test` : règles partagées et API HTTP, transactions, permissions, persistance.
- `npm run lint` : frontières frontend et vérification TypeScript backend.
- `npm run test:e2e` : parcours locaux ordinateur/mobile.
- `npm run test:online` : quatre/cinq navigateurs indépendants, reprise et coupure réseau.
- `npm run build` : deux applications.

Les serveurs lancés par Playwright sont arrêtés après les vérifications. Un serveur frontend déjà actif est réutilisé. Voir [l’API](../backend/README.md) et [le déploiement](deployment.md).

Un vrai joker défaussé reste visible et conservé dans l’historique, mais sa reprise est interdite par le moteur. Le joueur suivant doit piocher dans le stock. Les sélecteurs utilisent la même règle partagée pour désactiver les deux emplacements de reprise. Les faux jokers et les cartes ordinaires restent reprenables selon les règles habituelles.

La commande reorder peut ranger uniquement la main du joueur authentifié même hors de son tour, sans changer le joueur actif ni la phase. Les autres actions restent réservées au joueur actif. L’adaptateur HTTP réessaie une seule fois une commande explicitement refusée pour révision périmée, après réception de la vue actuelle et avec un nouvel identifiant ; un accusé perdu conserve son identifiant pour la déduplication.
# Carte de référence et miette

Le moteur retire la carte de référence avec les règles par défaut : il reste un seul exemplaire de cette même valeur et couleur dans les cartes jouables. La dernière carte de la pioche est réservée comme « miette » et ne peut jamais être piochée. `toGameView` ne révèle cette carte qu'à partir de dix cartes restantes (miette comprise), via `miette`, sans transmettre l'ordre de la pioche. Après la pioche de l'avant-dernière carte et la défausse, la manche est nulle si aucune victoire n'a été déclarée. Le règlement habituel des reports de primes s'applique.

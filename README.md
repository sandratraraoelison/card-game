# Rami Malagasy

Frontend Next.js et backend NestJS pour jouer à **4 ou 5 personnes en réseau**. La route `/online` propose des sessions invitées, des salons et des parties validées par le serveur, sauvegardées dans SQLite. La route `/` conserve une **simulation locale** avec des bots, distincte du multijoueur.

## Sommaire

- [Démarrage dans VS Code](#démarrage-dans-vs-code)
- [Configuration](#configuration)
- [Commandes et vérifications](#commandes-et-vérifications)
- [Jouer et vérifier une manche](#jouer-et-vérifier-une-manche)
- [Organisation](#organisation)
- [Règles et hypothèses explicites](#règles-et-hypothèses-explicites)
- [Connexion à NestJS](#connexion-à-nestjs)
- [Dépannage](#dépannage)

## Démarrage dans VS Code

Prérequis : Node.js 24 LTS et npm. Ouvrir `C:\Projects\carde-game` dans VS Code, puis dans le terminal :

```powershell
npm run setup
# Facultatif en local : créer la configuration backend si elle n'existe pas.
if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
npm run dev:front
# Dans un deuxième terminal, pour jouer en ligne :
npm run dev:back
```

Ouvrir <http://localhost:3000/online>, choisir un pseudo et créer un salon à 4 ou 5. Les autres joueurs rejoignent avec son code. L’hôte démarre quand le salon est complet. Chaque personne utilise son propre navigateur/profil ; les onglets d’un même profil partagent la session invitée.

Sur le même réseau local, ouvrir `http://ADRESSE-IP-DU-PC:3000/online` depuis chaque appareil. Ajouter cette origine exacte dans `backend/.env` (`CORS_ORIGINS`) et autoriser les ports 3000/3001 dans le pare-feu du PC. Sans `NEXT_PUBLIC_API_URL`, le frontend utilise le même hôte sur le port 3001. En hébergement, configurer l’URL publique de l’API comme décrit dans [le déploiement](docs/deployment.md).

`npm run setup` sert à installer ou réinstaller les dépendances, pas à chaque démarrage. Ne recopier les exemples de configuration que si les fichiers de destination n'existent pas encore, pour conserver vos réglages. Pour les démarrages suivants, `npm run dev` lance le frontend ; le jeu en ligne nécessite aussi `npm run dev:back` dans un deuxième terminal. Avant de relancer `setup`, arrêtez les serveurs du projet avec **Ctrl+C** dans leur terminal. Sous Windows, un serveur encore actif peut verrouiller `lightningcss.win32-x64-msvc.node` et provoquer une erreur `EPERM` pendant `npm ci`.

## Configuration

Le backend charge `backend/.env` avec les scripts de démarrage. Next.js charge `frontend/.env.local` ; vous pouvez le créer à partir de `frontend/.env.example` pour utiliser une URL d'API explicite. Les valeurs locales par défaut suffisent sans ces fichiers.

| Variable | Application | Valeur par défaut / contraintes |
|---|---|---|
| `PORT` | Backend | `3001` ; entier entre 1 et 65535. |
| `NODE_ENV` | Backend | En `production`, aucune origine CORS n'est autorisée par défaut. En `test`, la base par défaut est en mémoire. |
| `CORS_ORIGINS` | Backend | `http://localhost:3000` hors production ; origines HTTP(S) exactes séparées par des virgules, sans chemin ni slash final. |
| `DATABASE_PATH` | Backend | `./data/rami.sqlite` ; chemin non vide, relatif au dossier backend avec les scripts npm du projet. |
| `TRUST_PROXY_HOPS` | Backend | `0` ; entier entre 0 et 10, correspondant au nombre de proxies de confiance. |
| `NEXT_PUBLIC_API_URL` | Frontend | Sans valeur : hôte du navigateur, port `3001`, suffixe `/api`. Avec valeur : URL complète de l'API, par exemple `http://localhost:3001/api`. |

Redémarrer les serveurs après un changement de configuration. En production, une modification de `NEXT_PUBLIC_API_URL` nécessite un nouveau build : cette valeur est publique et intégrée au frontend. Pour le réseau local, laisser cette variable absente ou utiliser l'adresse IP du PC serveur ; `localhost` désignerait l'appareil de chaque joueur.

La validation de configuration est centralisée dans `backend/src/config/environment.ts`. La politique HTTP (CORS, parsing JSON, proxies et en-têtes) est dans `backend/src/config/http.ts`.

## Commandes et vérifications

Toutes les commandes suivantes s'exécutent depuis la racine du dépôt.

```powershell
npm test          # tests frontend/domaine et backend/API
npm run lint
npm run build
npm start         # frontend de production, après build (arrêter dev avant)
# Dans un deuxième terminal pour le multijoueur :
npm run start:back
```

Tests navigateur ordinateur + mobile :

```powershell
npm --prefix frontend exec -- playwright install chromium
npm run test:e2e
npm run test:online # démarre une API de test isolée et l’arrête après les tests
```

| Commande | Vérification |
|---|---|
| `npm run test:front` | Règles partagées, moteur, sélecteurs et adaptateurs frontend avec Vitest. |
| `npm run test:back` | Compilation puis tests HTTP, permissions, transactions, persistance et frontières d'architecture. |
| `npm run lint` | ESLint frontend et vérification TypeScript backend. |
| `npm run build` | Compilation des deux applications et du domaine partagé côté backend. |
| `npm run test:e2e` | Gestes et dispositions de la simulation, sur ordinateur et mobile. |
| `npm run test:online` | Parcours multijoueur avec navigateurs indépendants, reconnexion et coupure réseau. |

Playwright réutilise un frontend déjà actif sur le port 3000, ou le démarre pour le test. Pour `test:online`, arrêter votre backend sur le port 3001 : le parcours lance sa propre API isolée avec une base en mémoire. Les serveurs créés par les tests sont arrêtés à leur fin ; un serveur préexistant reste sous votre responsabilité.

## Jouer et vérifier une manche

- Une nouvelle manche aléatoire distribue 13 cartes à 4 ou 5 joueurs. En simulation, changer le nombre démarre immédiatement une nouvelle manche. En réseau, la capacité est fixée par le salon.
- Cliquer la pioche, sélectionner des cartes, former une **Suite** ou un **Tri / Carré**. Les combinaisons restent dans la main, signalées par un ✓ ; le × d’une combinaison la libère.
- Cliquer **Trier**, ou sélectionner une carte puis utiliser les flèches pour déplacer cette carte. La main défile horizontalement au toucher sur mobile.
- Réorganiser aussi par glisser-déposer dans la main. À la souris, saisir et déplacer ; sur mobile, maintenir environ 320 ms avant de déplacer. Un balayage rapide fait défiler la main. Relâcher hors de la main et de la table, ou appuyer sur Échap, annule le déplacement.
- Une sélection de 3 ou 4 cartes formant une combinaison valide reçoit un halo vert, selon l’option de substitution des jokers. Les groupes préparés valides gardent ce halo ; cela ne signifie pas que la main entière permet déjà de gagner.
- Double-cliquer une carte, ou la maintenir puis la déposer sur la table, permet de défausser. Le moteur exige toujours votre tour et une pioche préalable ; la carte apparaît devant J+1.
- **Substituer les vrais jokers** autorise les remplacements dans la combinaison en cours. Décoché, toute carte se joue à sa valeur et son enseigne d’origine, y compris un vrai joker.
- Sélectionner une carte puis **Défausser** passe au joueur suivant. À 4 : Vous → Mialy → Hery → Soa → Vous. À 5 : Vous → Fara → Mialy → Hery → Soa → Vous. Soa défausse donc devant vous. J+1 désigne le suivant dans ce sens de jeu. **Historique** affiche toutes les cartes utilisées et les reprises.
- Pour finir après pioche : organiser les 13 cartes en groupes puis cliquer **Terminer à 13**. Les groupes détectés affichés sont inclus sans confirmation individuelle. L’unique carte non combinée est défaussée automatiquement, sans sélection nécessaire. La validation des groupes, la défausse et la déclaration sont atomiques : une combinaison invalide ne consomme aucune carte et ne termine pas la manche.
- **Afficher 10 cartes** expose les groupes naturels 4+3+3, sans terminer la manche, défausser une carte ou passer le tour. Les cartes restent dans la main ; ajouter un quatrième groupe permet ensuite de terminer à 13. Retirer un groupe exposé ou défausser une de ses cartes annule l’exposition.
- **Essayer la main guidée** → **Piocher** → **Préparer les combinaisons** → **Terminer à 13** fournit un parcours de victoire reproductible. La main et la prochaine pioche sont arrangées explicitement ; la référence est aléatoire parmi les exemplaires non réservés à cet exercice.

La carte tirée pour désigner les jokers est affichée au centre de la table, entre pioche et défausse.

## Organisation

Voir [l’architecture](docs/architecture.md) et [le guide Vercel + Render](docs/deployment.md). Les deux applications possèdent leur propre installation et leur propre lockfile.

```text
packages/game/src/
  types.ts           Cartes, joueurs, commandes, vues publiques, contrats de service
  rules.ts           Jokers, combinaisons et déclarations (fonctions pures)
  engine.ts          Distribution et transitions d’état (sans React)
frontend/src/
  app/               Route Next.js, métadonnées et styles Tailwind/CSS
  features/game/
    components/      Affichage : table, main, sièges, combinaisons
    application/     Actions de jeu et sélecteurs purs
    infrastructure/  Service local, adaptateurs HTTP NestJS et sessions
    composition/     Création et injection du service
    hooks/           Gestes souris et tactiles
  shared/components/ Cartes et messages réutilisables
frontend/public/cards/  52 SVG classiques originaux, sans dépendance réseau
frontend/scripts/       Génération reproductible des SVG
frontend/tests/         Tests Vitest ciblés
frontend/e2e/           Parcours navigateur desktop et mobile
backend/src/            NestJS : couches domaine, application, infrastructure et transport
  config/               Configuration d'environnement typée et politique HTTP
backend/test/           API multi-clients, confidentialité, transactions, persistance
docs/                   Architecture et déploiement
render.yaml             Configuration du backend sur Render
```

`@rami/game` est une dépendance locale (`file:../packages/game`) partagée, indépendante du navigateur et de React. Chaque carte est identifiée par `exemplaire-enseigne-valeur`. Les deux jeux fournissent 104 identifiants uniques.

## Règles et hypothèses explicites

Les règles demandées sont validées : 4+3+3+3 avec tri naturel de 3 et suite naturelle de 3 ; vrais jokers dans les autres groupes ; exposition 4+3+3 naturelle seulement, sans victoire. À 10, une carte désignée joker est autorisée à sa valeur et son enseigne d’origine. Aucun seuil de points, pénalité ou obligation de rami classique n’a été ajouté.

Les ambiguïtés sont centralisées dans `DEFAULT_RULES` et dans les fonctions `validateMeld`, `validateExposure`, `validateFinish`, `createGame`, `applyCommand` :

| Sujet | Hypothèse retenue / point de modification |
|---|---|
| Couleur | Rouge/noir pour la répartition des jokers ; une suite exige la même enseigne (pique, trèfle, cœur ou carreau). |
| As | Bas ou haut par défaut (`ace: 'low-or-high'`) : A–2–3, Q–K–A et J–Q–K–A. Après le Roi, l’As vaut 14 ; pas de boucle K–A–2. |
| Tri / carré | Même valeur et enseignes distinctes ; `distinctSuitsInSets` modifiable. Les deux exemplaires d’une même enseigne ne constituent pas deux enseignes. |
| Référence | Tirée avant distribution et retirée du paquet : 103 cartes distribuables. `referenceCard: 'returned'` permet de remettre cet exemplaire dans le paquet. |
| Défausse initiale | Aucune ; premier joueur local, sans alternance du donneur à cette étape (`createGame`). |
| Tour | Pioche d’une carte puis défausse d’une carte ; déclaration possible avant pioche ou avec une défausse après pioche (`applyCommand`). |
| Reprise | `allowDiscardPickup` : seule la dernière défausse encore disponible destinée à J+1 peut être reprise ; les vrais jokers défaussés et les anciennes cartes de l'historique ne sont pas reprenables. |
| Exposition à 10 | Affiche les combinaisons naturelles sans terminer la manche ni changer de tour. Aucun tri/suite obligatoire supplémentaire n’est imposé. |
| Miette | La dernière carte du stock est réservée et ne peut pas être piochée. Elle devient visible à partir de dix cartes restantes ; après la pioche de l'avant-dernière carte puis la défausse, la manche est nulle sans victoire déclarée. Aucun recyclage. |
| Substitutions | Option par groupe ; activée, toutes les cartes désignées vrais jokers de ce groupe sont traitées comme substituts. Les faux jokers ne remplacent jamais rien. |
| Bots | Stratégie simple : conserver les mêmes valeurs, les voisines et les vrais jokers ; pioche et défausse automatiques. Ils ne déclarent pas de victoire dans cette première version. |

Deux victoires exceptionnelles sont gérées par le moteur : au moins trois vrais jokers au partage, ou les quatre vrais jokers réunis en main après une pioche dans le stock. Une main initiale contenant au moins quatre paires identiques entraîne une redistribution automatique ; la victoire par jokers est prioritaire. La référence centrale désigne les jokers, mais ne sert pas de joker de remplacement.

Les salons utilisent des crédits fictifs en Ariary (Ar), sans paiement : 10 000 Ar à la création d'une session, mise entière de 0 à 100 000 Ar fixée pour le salon. Le serveur prélève les mises et verse les primes atomiquement. Les primes non remportées sont reportées sur la manche suivante. Après une manche, tous les membres doivent confirmer qu'ils sont prêts avant le démarrage suivant. L'hôte peut fermer le salon ; le serveur rembourse les fonds non dépensés selon les règles documentées dans [l'architecture](docs/architecture.md).

## Connexion à NestJS

Voir [backend/README.md](backend/README.md) pour l’API et [docs/architecture.md](docs/architecture.md) pour les dépendances. Points d’entrée :

1. **`GameService` / `LobbyService`** dans le paquet partagé : ports indépendants du transport.
2. **`OnlineGameSession`** : injecte les adaptateurs HTTP dans la même table que la simulation.
3. **`Games` côté NestJS** : identité authentifiée, validation, déduplication et transaction autour de `applyCommand`.
4. **`toGameView`** : ne transmet que la main du destinataire et les informations publiques.
5. **SQLite** : sessions, manches et accusés survivent à un redémarrage si le fichier est conservé. Le disque doit être durable en production.

Cette version utilise un polling HTTP d’une seconde et une instance serveur. Un joueur déconnecté conserve sa place ; la manche attend son retour. Les comptes avec récupération, le remplacement automatique d’un absent et le déploiement multi-instances restent des extensions.

## Dépannage

| Symptôme | Vérification / action |
|---|---|
| `EPERM` pendant `npm ci` sur Windows | Arrêter les serveurs du projet avec Ctrl+C, puis relancer `npm run setup`. |
| Port 3000 ou 3001 déjà utilisé | Arrêter le processus du projet qui occupe ce port. Un changement du port API exige aussi d'adapter l'URL frontend. |
| Connexion API interrompue | Vérifier `http://localhost:3001/api/health`, le démarrage du backend et `NEXT_PUBLIC_API_URL` (suffixe `/api` inclus). |
| Requête bloquée par CORS | Ajouter l'origine exacte du frontend à `CORS_ORIGINS`, puis redémarrer le backend. |
| Plusieurs onglets représentent le même joueur | Utiliser des profils ou navigateurs indépendants ; la session est conservée dans le stockage du navigateur. |
| Accès impossible depuis un téléphone | Utiliser l'IP du PC, vérifier CORS et le pare-feu, puis retirer une URL API pointant vers `localhost`. |
| Parties perdues après redéploiement | Vérifier que `DATABASE_PATH` pointe vers un volume durable ; une base en mémoire ou sur disque éphémère ne persiste pas. |

Pour contribuer, respecter [AGENTS.md](AGENTS.md) et les frontières décrites dans [docs/architecture.md](docs/architecture.md). Les règles vont dans `packages/game`, les cas d'usage dépendent des ports, et les compositions injectent les adaptateurs. Vérifier les règles avec les tests unitaires et les changements de gestes ou de disposition avec les parcours navigateur correspondants.

# Déploiement : Vercel + Render

Un seul dépôt Git, deux applications indépendantes et deux `package-lock.json`. Les commandes de la racine sont des raccourcis ; chaque plateforme installe uniquement son application. Aucun déploiement distant n’a encore été effectué.

## Frontend sur Vercel

Importer **le dépôt complet**, puis configurer :

| Réglage | Valeur |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | Next.js |
| Include source files outside of the Root Directory in the Build Step | **Activé** |
| Node.js | 24.x |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `.next` |

Le fichier `frontend/vercel.json` porte les commandes. L’accès aux fichiers extérieurs se règle dans le tableau de bord Vercel : il est nécessaire pour `file:../packages/game`, importé et transpilé par Next.js. Ne pas envoyer uniquement le sous-dossier `frontend`.

Configurer `NEXT_PUBLIC_API_URL=https://VOTRE-SERVICE.onrender.com/api` pour l’interface `/online`. Elle est publique et ne doit contenir aucun secret. La route `/` reste une simulation locale. Une variable `NEXT_PUBLIC_*` modifiée nécessite une nouvelle compilation du frontend.

## Backend sur Render

Importer `render.yaml` comme Blueprint depuis le même dépôt. Le Blueprint configure un service Node avec contrôle de santé. Il ne déploie pas le frontend.

Alternative manuelle — **Web Service** :

| Réglage | Valeur |
|---|---|
| Root Directory | Vide : racine du dépôt |
| Build Command | `npm --prefix backend ci --include=dev && npm --prefix backend run build` |
| Start Command | `npm --prefix backend start` |
| Health Check Path | `/api/health` |
| NODE_ENV | `production` |
| NODE_VERSION | `24.19.0` |
| CORS_ORIGINS | `https://VOTRE-PROJET.vercel.app` |

Conserver le dépôt complet côté Render pour que `packages/game` reste accessible à la compilation partagée, exécutée automatiquement avant le build backend. Les filtres de build surveillent `backend/**`, `packages/game/**` et `render.yaml`.

Le serveur écoute sur `0.0.0.0` et lit `PORT` fourni par Render. Ne pas fixer `PORT=3001` dans Render. `CORS_ORIGINS` accepte des origines exactes séparées par des virgules, sans chemin ni slash final. Pour un domaine personnalisé ou une preview Vercel, ajouter explicitement son origine. Sans origine configurée en production, aucun accès cross-origin du navigateur n’est autorisé.

Le backend expose sessions invitées, salons et commandes de jeu ; `/api/health` retourne `multiplayerReady: true`. La synchronisation utilise HTTP toutes les secondes. Voir [le contrat API](../backend/README.md).

**Persistance :** le Blueprint gratuit reste destiné aux essais. Le système de fichiers Render est éphémère ; pour conserver les sessions et manches après redéploiement, utiliser un service avec disque persistant et définir par exemple `DATABASE_PATH=/var/data/rami.sqlite` sur un disque monté dans `/var/data`. Le fichier SQLite et ses fichiers WAL doivent rester sur ce volume. Ne pas lancer plusieurs instances avec des bases locales séparées. [Documentation Render des disques](https://render.com/docs/disks).

Configurer `TRUST_PROXY_HOPS` selon le nombre exact de proxies de confiance devant le service ; la valeur locale est 0. Cette valeur contrôle l’adresse utilisée par la limitation de débit. Garder HTTPS pour le transport des jetons de session. Sauvegarder la base avec une procédure SQLite cohérente ; cette livraison ne configure pas de sauvegarde distante automatique.

## Vérification avant publication

```powershell
npm run setup
npm run lint
npm test
npm run build
npm run test:e2e
npm run test:online
```

Arrêter les serveurs avant `setup` sous Windows. Pour démarrer localement dans deux terminaux : `npm run dev:front` et `npm run dev:back`. Vérifier `http://localhost:3000` et `http://localhost:3001/api/health`.

Après déploiement, vérifier la page `/online`, la santé Render et une partie à 4/5 depuis des navigateurs indépendants. Tester aussi une reconnexion. Aucun déploiement distant n’est effectué automatiquement par cette implémentation.

Sources officielles : [Vercel : fichiers hors du dossier racine](https://vercel.com/docs/monorepos/monorepo-faq), [Render : monorepos](https://render.com/docs/monorepo-support), [Render : services web et port](https://render.com/docs/web-services), [NestJS : déploiement](https://docs.nestjs.com/deployment).

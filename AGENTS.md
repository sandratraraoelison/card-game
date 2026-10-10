# Organisation et maintenance

- Conserver `frontend/` pour Next.js/Vercel, `backend/` pour NestJS/Render et `packages/game/` pour le domaine partagé.
- Avant de créer un composant, vérifier s’il existe déjà et s’il sera réutilisé. Placer les primitives indépendantes d’une session dans `frontend/src/shared/components/`. Garder les composants métier dans `features/game/components/`.
- Les règles restent exclusivement dans `packages/game`. Les composants ne distribuent pas les cartes et ne modifient pas directement l’état du moteur.
- `application/` dépend du port `GameService`, `infrastructure/` l’implémente et `composition/` injecte l’adaptateur. Ne pas importer de service concret dans un composant ou un hook d’application.
- Préférer des propriétés explicites et des callbacks aux composants qui connaissent toute la session. Garder les composants de lecture seule réutilisables.
- La carte centrale est la carte tirée de référence, pas un vrai joker de remplacement.
- Les 10 cartes sont uniquement exposées ; seule une déclaration valide à 13 cartes gagne la manche.
- Garder la simulation locale explicitement indiquée jusqu’à l’intégration effective du multijoueur.
- Documenter les changements de structure dans `docs/architecture.md`. Vérifier les règles avec les tests unitaires et les gestes/dispositions avec les parcours navigateur appropriés.
- Ne pas laisser de serveur supplémentaire actif après une vérification : il peut verrouiller les dépendances natives sous Windows lors de `npm ci`.

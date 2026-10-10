# Synchronisation réseau

La version actuelle synchronise les vues privées par HTTP toutes les secondes et immédiatement après une commande. Les controllers sont dans `modules/multiplayer/transport`, le client dans `NestGameService` et `useOnlineLobby` côté frontend. Les révisions, accusés dédupliqués et sessions persistantes permettent la reconnexion.

Il n’y a pas encore de gateway WebSocket/SSE. Une telle gateway devra appeler les mêmes cas d’usage et construire une vue par joueur, jamais diffuser l’état brut à un salon.

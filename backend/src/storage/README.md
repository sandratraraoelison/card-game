# Persistance

L’adaptateur actif est [SqliteStore](../modules/multiplayer/infrastructure/sqlite-store.ts), derrière les ports applicatifs. Il stocke sessions, salons, manches et accusés dans le fichier `DATABASE_PATH`. Les tests utilisent une base en mémoire ou un répertoire temporaire isolé.

Utiliser un disque durable en hébergement et sauvegarder SQLite de façon cohérente avec WAL. Le système actuel cible une seule instance Node. Pour plusieurs instances, remplacer le dépôt et préserver la transaction atomique état + accusé ; voir [l’architecture](../../../docs/architecture.md).

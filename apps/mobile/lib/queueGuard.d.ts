/** Marks a player's queue as closed: no saves, no new photos, until `unsealQueue`. */
export function sealQueue(userId: string): void
/** Reopens a player's queue. Called when that player signs in. */
export function unsealQueue(userId: string): void
export function isQueueSealed(userId: string): boolean
export function resetQueueSeals(): void
/** Folder names under queue/ that are not the signed-in player's. */
export function staleQueueFolders(names: readonly string[], userId: string): string[]

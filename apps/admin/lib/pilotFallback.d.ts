export function isMissingSchemaError(
  error: { code?: string; message?: string } | null | undefined,
): boolean

export function needsMigrationCopy(migration: '043' | '044' | string): string

export function classifyMissingMigration(
  error: { code?: string; message?: string } | null | undefined,
  hint?: 'xp_events' | 'cutout_alt' | 'stickers' | '043' | '044' | null,
): '043' | '044' | null

export function migrationNotice(
  error: { code?: string; message?: string } | null | undefined,
  hint?: 'xp_events' | 'cutout_alt' | 'stickers' | '043' | '044' | null,
): string | null

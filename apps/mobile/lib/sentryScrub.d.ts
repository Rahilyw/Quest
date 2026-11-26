/** Removes query strings, auth fragments and storage object paths from a string. */
export function scrubString(value: string): string
/** Sentry `beforeBreadcrumb`: returns a scrubbed copy. */
export function scrubBreadcrumb<T extends object>(breadcrumb: T): T
/** Sentry `beforeSend`: scrubs the request, message, exceptions and breadcrumbs. */
export function scrubEvent<T extends object>(event: T): T

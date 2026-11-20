import * as Linking from 'expo-linking'
import type { ImperativeRouter } from 'expo-router'
import { isValidPartyCode, normalizePartyCode } from './party'

/** Extract a party code from quest://party/CODE or https://…/party/CODE. */
export function partyCodeFromUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null
  try {
    const parsed = Linking.parse(url)
    const path = (parsed.path ?? '').replace(/^\//, '')
    const parts = path.split('/').filter(Boolean)
    if (parts[0] === 'party' && parts[1]) {
      const code = normalizePartyCode(parts[1])
      return isValidPartyCode(code) ? code : null
    }
    // Some hosts put the code in the hostname/path differently via createURL.
    const match = url.match(/party\/([A-Za-z0-9]+)/i)
    if (match?.[1]) {
      const code = normalizePartyCode(match[1])
      return isValidPartyCode(code) ? code : null
    }
  } catch {
    return null
  }
  return null
}

/** Subscribe to quest://party/:code deep links. Returns an unsubscribe. */
export function subscribeToPartyDeepLinks(router: ImperativeRouter): () => void {
  function handle(url: string | null) {
    const code = partyCodeFromUrl(url)
    if (!code) return
    router.push(`/party/${code}` as never)
  }

  Linking.getInitialURL().then(handle)
  const sub = Linking.addEventListener('url', ({ url }) => handle(url))
  return () => sub.remove()
}

export function decideAuthDeepLinkAction(opts: {
  hasLiveSession: boolean
  pendingFlow: string | null | undefined
  params: Record<string, string> | null | undefined
}): 'apply' | 'ignore'

export function parseAuthParams(url: string): Record<string, string> | null

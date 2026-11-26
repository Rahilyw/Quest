import AsyncStorage from '@react-native-async-storage/async-storage'
import { optInAnalytics, optOutAnalytics } from '@/lib/analytics'

/**
 * The player's choice to share usage data (security review C-9). Stored on the
 * device only. 'true' means the player opted out; a missing value means sharing
 * is on, which is the default.
 */
export const ANALYTICS_OPT_OUT_KEY = 'pref_analytics_opt_out'

export async function loadAnalyticsEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ANALYTICS_OPT_OUT_KEY)) !== 'true'
  } catch {
    return true
  }
}

/** Applies the saved choice to the analytics client. Safe to call on every start. */
export async function applyAnalyticsPreference(): Promise<void> {
  if (!(await loadAnalyticsEnabled())) optOutAnalytics()
}

/** Saves the choice and applies it right away. */
export async function setAnalyticsEnabled(enabled: boolean): Promise<void> {
  if (enabled) optInAnalytics()
  else optOutAnalytics()
  await AsyncStorage.setItem(ANALYTICS_OPT_OUT_KEY, String(!enabled))
}

export interface SuggestionInput {
  title?: string | null
  description?: string | null
  category?: string | null
  lat?: number | string | null
  lng?: number | string | null
}

export interface SuggestionResult {
  ok: boolean
  errors: Record<string, string>
  title: string
  description: string
  category: string
  lat: number | null
  lng: number | null
}

export function validateSuggestion(input: SuggestionInput): SuggestionResult

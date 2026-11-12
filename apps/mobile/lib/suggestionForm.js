'use strict'

const CATEGORIES = ['fitness', 'social', 'food', 'community', 'nature']

function validateSuggestion(input) {
  const title = String(input.title ?? '').trim()
  const description = String(input.description ?? '').trim()
  const category = String(input.category ?? '')
  const errors = {}

  if (title.length < 3 || title.length > 80) {
    errors.title = 'Title needs 3 to 80 characters.'
  }
  if (description.length < 10 || description.length > 500) {
    errors.description = 'Description needs 10 to 500 characters.'
  }
  if (!CATEGORIES.includes(category)) {
    errors.category = 'Pick a category.'
  }

  const latBlank = input.lat == null || input.lat === ''
  const lngBlank = input.lng == null || input.lng === ''
  let lat = null
  let lng = null
  if (latBlank !== lngBlank) {
    errors.pin = 'Add both coordinates, or leave the pin off.'
  } else if (!latBlank) {
    lat = Number(input.lat)
    lng = Number(input.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      errors.pin = 'That pin isn’t a real location.'
      lat = null
      lng = null
    }
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    title,
    description,
    category,
    lat,
    lng,
  }
}

module.exports = { CATEGORIES, validateSuggestion }

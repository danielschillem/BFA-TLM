const runtimeConfig = typeof window !== 'undefined' && typeof window.__APP_CONFIG__ === 'object'
  ? window.__APP_CONFIG__
  : {}

const normalizeValue = (value) => {
  if (typeof value !== 'string') return ''
  return value.trim()
}

const readConfig = (key, fallback = '') => {
  const runtimeValue = normalizeValue(runtimeConfig[key])
  if (runtimeValue) return runtimeValue

  const envValue = normalizeValue(import.meta.env[key])
  if (envValue) return envValue

  return fallback
}

const trimTrailingSlash = (value) => value.replace(/\/+$/, '')

export const apiUrl = trimTrailingSlash(readConfig('VITE_API_URL', '/api/v1'))
export const reverbAppKey = readConfig('VITE_REVERB_APP_KEY')
export const reverbHost = readConfig('VITE_REVERB_HOST')
export const reverbPort = readConfig('VITE_REVERB_PORT')
export const reverbScheme = readConfig('VITE_REVERB_SCHEME', 'https')

export const apiOrigin = /^https?:\/\//i.test(apiUrl)
  ? apiUrl.replace(/\/api\/v1\/?$/i, '')
  : ''


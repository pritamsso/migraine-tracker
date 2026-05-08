/**
 * Google Drive OAuth 2.0 — JavaScript implicit flow.
 *
 * The OAuth Client ID is a PUBLIC identifier (visible in every auth URL) and is
 * safe to embed in frontend code. This implementation is intentionally secretless:
 * it does not use refresh_token grant flows or any client secret.
 *
 * Setup checklist (Google Cloud Console):
 *   1. Create an OAuth 2.0 Client ID (Application type: Web application).
 *   2. Authorised JavaScript origins:  https://migraintrack.com
 *   3. Authorised redirect URIs:       https://migraintrack.com/
 *                                      http://localhost:5173/   (dev)
 *   4. Enable the Google Drive API for your project.
 *   5. Set VITE_GOOGLE_CLIENT_ID in .env.local or your CI environment.
 */

const CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  // OAuth client IDs are public identifiers (not secrets); access is still
  // constrained by Google-authorized JS origins + redirect URIs.
  '572277088448-1u6c9t2v8b8tba7g8ta2uma27ujald4t.apps.googleusercontent.com'

if (!CLIENT_ID) {
  console.warn(
    '[googleDrive] VITE_GOOGLE_CLIENT_ID is not set. ' +
    'Google Drive backup will be unavailable. ' +
    'See .env.example for setup instructions.'
  )
}

// Minimal scope: access only the app's hidden AppData folder in Drive.
// Users cannot see these files in their own Drive UI.
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata'

const AUTH_ENDPOINT  = 'https://accounts.google.com/o/oauth2/v2/auth'
const ACCESS_KEY     = 'migraineDrive.accessToken'
const EXPIRES_AT_KEY = 'migraineDrive.accessTokenExpiresAt'
const REFRESH_KEY    = 'migraineDrive.refreshToken' // legacy key cleanup only
const OAUTH_STATE_HASH_KEY = 'migraineDrive.oauthStateHash'
const ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS = 30
const MIN_ACCESS_TOKEN_LIFETIME_SECONDS = 60
const DEFAULT_ACCESS_TOKEN_LIFETIME_SECONDS = 3600

function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function generateOAuthState() {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(16)).buffer)
}

async function hashTextBase64Url(value) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return base64UrlEncode(hash)
}

function calculateAccessTokenExpiry(expiresInSeconds) {
  return Date.now() + Math.max(
    (Number(expiresInSeconds) || DEFAULT_ACCESS_TOKEN_LIFETIME_SECONDS) - ACCESS_TOKEN_EXPIRY_BUFFER_SECONDS,
    MIN_ACCESS_TOKEN_LIFETIME_SECONDS
  ) * 1000
}

function getValidStoredAccessToken() {
  const token = sessionStorage.getItem(ACCESS_KEY)
  const expiresAt = Number(sessionStorage.getItem(EXPIRES_AT_KEY) || 0)
  if (!token || !expiresAt || Date.now() >= expiresAt) {
    sessionStorage.removeItem(ACCESS_KEY)
    sessionStorage.removeItem(EXPIRES_AT_KEY)
    return null
  }
  return token
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Redirect the browser to Google's consent screen.
 * Stores a hash of state in sessionStorage so it survives the redirect and can
 * be verified when Google sends the user back.
 */
export async function startOAuthFlow() {
  if (!CLIENT_ID) throw new Error('Google Client ID is not configured for this app.')

  const state      = generateOAuthState()
  const redirectUri = `${window.location.origin}/`

  sessionStorage.setItem(OAUTH_STATE_HASH_KEY, await hashTextBase64Url(state))

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: SCOPES,
    include_granted_scopes: 'true',
    prompt: 'select_account',
    state,
  })

  window.location.href = `${AUTH_ENDPOINT}?${params}`
}

/**
 * Call once on app initialisation. When Google redirects back with #access_token=…,
 * this stores the short-lived access token in sessionStorage, and cleans up the URL.
 *
 * @returns {Promise<string|null>} access_token on success, null if no callback data present.
 */
export async function handleOAuthCallback() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const accessToken = hashParams.get('access_token')
  const expiresIn = hashParams.get('expires_in')
  const state = hashParams.get('state')
  const error = hashParams.get('error')
  const errorDescription = hashParams.get('error_description')

  if (!accessToken && !error) return null

  // Always clear OAuth data from the URL regardless of outcome
  history.replaceState({}, '', window.location.pathname)

  if (error) {
    throw new Error(
      `Google authorisation error: ${errorDescription || error}`
    )
  }

  const savedState = sessionStorage.getItem(OAUTH_STATE_HASH_KEY)
  sessionStorage.removeItem(OAUTH_STATE_HASH_KEY)
  const stateHash = state ? await hashTextBase64Url(state) : ''
  if (!savedState || !stateHash || stateHash !== savedState) {
    throw new Error('Security error: state mismatch. Please try again.')
  }

  sessionStorage.setItem(ACCESS_KEY, accessToken)
  const expiresAt = calculateAccessTokenExpiry(
    Number(expiresIn) || DEFAULT_ACCESS_TOKEN_LIFETIME_SECONDS
  )
  sessionStorage.setItem(EXPIRES_AT_KEY, String(expiresAt))
  localStorage.removeItem(REFRESH_KEY)

  return accessToken
}

/**
 * Restore access token from sessionStorage only (strict secretless mode).
 *
 * @returns {Promise<string|null>} access_token or null if unavailable.
 */
export async function refreshAccessToken() {
  localStorage.removeItem(REFRESH_KEY)
  return getValidStoredAccessToken()
}

/** True if the user has an active access token in this browser session. */
export function isDriveLinked() {
  return Boolean(getValidStoredAccessToken())
}

/** Revoke the current access token and unlink Drive. */
export function unlinkDrive() {
  const token = sessionStorage.getItem(ACCESS_KEY)
  sessionStorage.removeItem(ACCESS_KEY)
  sessionStorage.removeItem(EXPIRES_AT_KEY)
  sessionStorage.removeItem(OAUTH_STATE_HASH_KEY)
  localStorage.removeItem(REFRESH_KEY)
  // Best-effort token revocation (fire-and-forget)
  if (token) {
    fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
      method: 'POST',
    }).catch(() => {})
  }
}

/**
 * Google Drive OAuth 2.0 — Authorization Code + PKCE flow.
 *
 * The OAuth Client ID is a PUBLIC identifier (visible in every auth URL) and is
 * safe to embed in frontend code.  No client_secret is required; PKCE replaces
 * the secret and is Google's recommended approach for browser-based public clients.
 *
 * Setup checklist (Google Cloud Console):
 *   1. Create an OAuth 2.0 Client ID (Application type: Web application).
 *   2. Authorised JavaScript origins:  https://migraintrack.com
 *   3. Authorised redirect URIs:       https://migraintrack.com/
 *                                      http://localhost:5173/   (dev)
 *   4. Enable the Google Drive API for your project.
 *   5. Set VITE_GOOGLE_CLIENT_ID in .env.local or your CI environment.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

// Minimal scope: access only the app's hidden AppData folder in Drive.
// Users cannot see these files in their own Drive UI.
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata'

const AUTH_ENDPOINT  = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const REFRESH_KEY    = 'migraineDrive.refreshToken'

// ── PKCE helpers ──────────────────────────────────────────────────────────────

function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function generateCodeVerifier() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes.buffer)
}

async function generateCodeChallenge(verifier) {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier)
  )
  return base64UrlEncode(hash)
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Redirect the browser to Google's consent screen.
 * Stores the PKCE code_verifier + state in sessionStorage so they survive the
 * redirect and can be verified when Google sends the user back.
 */
export async function startOAuthFlow() {
  if (!CLIENT_ID) throw new Error('Google Client ID is not configured for this app.')

  const verifier   = generateCodeVerifier()
  const challenge  = await generateCodeChallenge(verifier)
  const state      = base64UrlEncode(crypto.getRandomValues(new Uint8Array(16)).buffer)
  const redirectUri = `${window.location.origin}/`

  sessionStorage.setItem('_oauthVerifier', verifier)
  sessionStorage.setItem('_oauthState',    state)

  const params = new URLSearchParams({
    client_id:             CLIENT_ID,
    redirect_uri:          redirectUri,
    response_type:         'code',
    scope:                 SCOPES,
    code_challenge:        challenge,
    code_challenge_method: 'S256',
    access_type:           'offline',
    prompt:                'consent select_account',
    state,
  })

  window.location.href = `${AUTH_ENDPOINT}?${params}`
}

/**
 * Call once on app initialisation.  When Google redirects back with ?code=…,
 * this exchanges the authorisation code for tokens using PKCE (no secret needed),
 * persists the refresh token, and cleans up the URL.
 *
 * @returns {Promise<string|null>} access_token on success, null if no code present.
 */
export async function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search)
  const code   = params.get('code')
  const state  = params.get('state')
  const error  = params.get('error')

  if (!code) return null

  // Always clear the URL regardless of outcome
  history.replaceState({}, '', window.location.pathname)

  if (error) throw new Error(`Google authorisation error: ${error}`)

  const savedState = sessionStorage.getItem('_oauthState')
  if (!savedState || state !== savedState) {
    throw new Error('Security error: state mismatch. Please try again.')
  }

  const verifier = sessionStorage.getItem('_oauthVerifier')
  sessionStorage.removeItem('_oauthVerifier')
  sessionStorage.removeItem('_oauthState')

  const res = await fetch(TOKEN_ENDPOINT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     CLIENT_ID,
      code_verifier: verifier,
      redirect_uri:  `${window.location.origin}/`,
      grant_type:    'authorization_code',
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token exchange failed: ${text}`)
  }

  const data = await res.json()

  // Persist the refresh token so the user stays connected across sessions.
  // Scope is limited to the hidden AppData folder only.
  if (data.refresh_token) {
    localStorage.setItem(REFRESH_KEY, data.refresh_token)
  }

  return data.access_token || null
}

/**
 * Use the persisted refresh token to get a fresh access token silently.
 * Called automatically on app load when a refresh token is stored.
 *
 * @returns {Promise<string|null>} access_token or null if unavailable.
 */
export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_KEY)
  if (!refreshToken) return null

  const res = await fetch(TOKEN_ENDPOINT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id:     CLIENT_ID,
      grant_type:    'refresh_token',
    }),
  })

  if (!res.ok) {
    // Refresh token revoked or expired — require re-auth
    localStorage.removeItem(REFRESH_KEY)
    return null
  }

  const data = await res.json()
  return data.access_token || null
}

/** True if the user has previously authorised Drive on this device. */
export function isDriveLinked() {
  return Boolean(localStorage.getItem(REFRESH_KEY))
}

/** Revoke the stored refresh token and unlink Drive. */
export function unlinkDrive() {
  const token = localStorage.getItem(REFRESH_KEY)
  localStorage.removeItem(REFRESH_KEY)
  // Best-effort token revocation (fire-and-forget)
  if (token) {
    fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
      method: 'POST',
    }).catch(() => {})
  }
}

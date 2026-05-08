function toBase64(uint8) { return btoa(String.fromCharCode(...uint8)) }
function fromBase64(b64) { return Uint8Array.from(atob(b64), c => c.charCodeAt(0)) }

export async function encryptString(plainText, passphrase) {
  const enc = new TextEncoder()
  const pk = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 },
    pk,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plainText))
  return { salt: toBase64(salt), iv: toBase64(iv), cipherText: toBase64(new Uint8Array(cipher)) }
}

export async function decryptString(payload, passphrase) {
  const enc = new TextEncoder()
  const pk = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(payload.salt), iterations: 100000 },
    pk,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(payload.iv) }, key, fromBase64(payload.cipherText))
  return new TextDecoder().decode(plain)
}

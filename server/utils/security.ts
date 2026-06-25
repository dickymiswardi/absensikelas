export function normalizeUsername(username: string) {
  return String(username || '').trim().toLowerCase()
}

export function normalizeEmail(email: string) {
  return String(email || '').trim().toLowerCase()
}

export function normalizeFirstName(firstName: string) {
  const value = String(firstName || '').trim()

  if (!value) {
    throw createError({ statusCode: 400, statusMessage: 'Nama depan wajib diisi.' })
  }

  if (/\s/.test(value)) {
    throw createError({ statusCode: 400, statusMessage: 'Nama depan harus satu kata tanpa spasi.' })
  }

  return value.toLocaleLowerCase('id-ID')
}

export function assertNoSpace(value: string, label: string) {
  if (/\s/.test(value)) {
    throw createError({ statusCode: 400, statusMessage: `${label} tidak boleh mengandung spasi.` })
  }
}

function toBase64Url(buffer: ArrayBuffer | Uint8Array) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function newSalt() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return toBase64Url(bytes)
}

function utf8(value: string) {
  return new TextEncoder().encode(value)
}

export async function hashSecret(secret: string, salt: string) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    utf8(secret),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: utf8(salt),
      iterations: 100000
    },
    keyMaterial,
    256
  )

  return toBase64Url(bits)
}

export function nowIso() {
  return new Date().toISOString()
}

export function addMinutesIso(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString()
}

export function createSyntheticEmail(usernameKey: string) {
  return `${usernameKey}@local.absensi.invalid`
}

export function createSixDigitCode() {
  const numbers = new Uint32Array(1)
  crypto.getRandomValues(numbers)
  const random = numbers[0] ?? Math.floor(Math.random() * 1000000)
  return String(random % 1000000).padStart(6, '0')
}

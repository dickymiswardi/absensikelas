import {
  assertNoSpace,
  createSyntheticEmail,
  hashSecret,
  newSalt,
  normalizeFirstName,
  normalizeUsername,
  nowIso
} from './security'

export const validRoles = ['admin', 'guru'] as const
export type UserRole = typeof validRoles[number]

export function assertRole(role: string): asserts role is UserRole {
  if (!validRoles.includes(role as UserRole)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Role tidak valid.'
    })
  }
}

function selectUserColumns() {
  return `
    id,
    username,
    username_key as usernameKey,
    email,
    first_name_key as firstNameKey,
    first_name_label as firstNameLabel,
    password_salt as passwordSalt,
    password_hash as passwordHash,
    role,
    role_code_type as roleCodeType,
    role_code_value as roleCodeValue,
    created_at as createdAt,
    updated_at as updatedAt
  `
}

export async function createUser(db: any, params: {
  username: string
  password: string
  firstName: string
  role: string
  classCode?: string
}) {
  const username = String(params.username || '').trim()
  const password = String(params.password || '').trim()
  const usernameKey = normalizeUsername(username)
  const firstNameKey = normalizeFirstName(params.firstName)
  const firstNameLabel = String(params.firstName || '').trim()
  const syntheticEmail = createSyntheticEmail(usernameKey)

  if (!username || !password || !firstNameKey) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Username, password, dan nama depan wajib diisi.'
    })
  }

  assertNoSpace(username, 'Username')
  assertNoSpace(password, 'Password')
  assertRole(params.role)

  const existingUsername = await db
    .prepare('SELECT id FROM users WHERE username_key = ?')
    .bind(usernameKey)
    .first()

  if (existingUsername) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Username sudah digunakan.'
    })
  }

  let roleCodeType = null
  let roleCodeValue = null

  if (params.role === 'guru' && params.classCode) {
    const classCode = String(params.classCode).trim()
    
    const kelas = await db
      .prepare('SELECT id, name, code FROM classes WHERE code = ? LIMIT 1')
      .bind(classCode)
      .first()

    if (!kelas) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Kode kelas tidak ditemukan. Pastikan kelas tersebut sudah ada.'
      })
    }

    roleCodeType = 'kelas'
    roleCodeValue = classCode
  }

  const id = crypto.randomUUID()
  const salt = newSalt()
  const hash = await hashSecret(password, salt)
  const createdAt = nowIso()

  await db
    .prepare(`
      INSERT INTO users (
        id,
        username,
        username_key,
        email,
        first_name_key,
        first_name_label,
        password_salt,
        password_hash,
        role,
        role_code_type,
        role_code_value,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      id,
      username,
      usernameKey,
      syntheticEmail,
      firstNameKey,
      firstNameLabel,
      salt,
      hash,
      params.role,
      roleCodeType,
      roleCodeValue,
      createdAt,
      createdAt
    )
    .run()

  return findUserById(db, id)
}

export async function findUserById(db: any, id: string) {
  return await db
    .prepare(`SELECT ${selectUserColumns()} FROM users WHERE id = ?`)
    .bind(id)
    .first()
}

export async function findUserByUsername(db: any, username: string) {
  return await db
    .prepare(`SELECT ${selectUserColumns()} FROM users WHERE username_key = ?`)
    .bind(normalizeUsername(username))
    .first()
}

export async function verifyPassword(user: any, password: string) {
  if (!user?.passwordSalt || !user?.passwordHash) return false
  const hash = await hashSecret(password, user.passwordSalt)
  return hash === user.passwordHash
}

export async function updatePassword(db: any, userId: string, newPassword: string) {
  const password = String(newPassword || '').trim()

  if (!password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Password baru wajib diisi.'
    })
  }

  assertNoSpace(password, 'Password baru')

  const salt = newSalt()
  const hash = await hashSecret(password, salt)

  await db
    .prepare(`
      UPDATE users
      SET password_salt = ?, password_hash = ?, updated_at = ?
      WHERE id = ?
    `)
    .bind(salt, hash, nowIso(), userId)
    .run()

  return findUserById(db, userId)
}

export async function deleteUserById(db: any, userId: string) {
  const cleanUserId = String(userId || '').trim()

  if (!cleanUserId) {
    throw createError({ statusCode: 400, statusMessage: 'ID user wajib diisi.' })
  }

  const currentUser = await findUserById(db, cleanUserId)

  if (!currentUser) {
    throw createError({ statusCode: 404, statusMessage: 'User tidak ditemukan.' })
  }

  await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(cleanUserId).run()
  await db.prepare('DELETE FROM password_reset_codes WHERE user_id = ?').bind(cleanUserId).run()
  
  await db
    .prepare('DELETE FROM users WHERE id = ?')
    .bind(cleanUserId)
    .run()

  return {
    id: currentUser.id,
    username: currentUser.username,
    role: currentUser.role
  }
}

export async function listUsers(db: any) {
  const result = await db
    .prepare(`
      SELECT
        id,
        username,
        first_name_label as firstNameLabel,
        role,
        role_code_type as roleCodeType,
        role_code_value as roleCodeValue,
        created_at as createdAt,
        password_hash as passwordHash
      FROM users
      ORDER BY created_at DESC
    `)
    .all()

  // Sesuai dengan instruksi user nomor 4: Admin bisa melihat password di /users
  // Tapi karena kita hash menggunakan PBKDF2/WebCrypto, kita tidak bisa menampilkan password asli
  // Jadi ini untuk memberitahu bahwa password sudah di hash dan hanya bisa di reset
  return (result.results || []).map((user: any) => ({
    ...user,
    hasPassword: !!user.passwordHash
  }))
}

export function publicUser(user: any) {
  return {
    id: user.id,
    username: user.username,
    firstNameLabel: user.firstNameLabel || null,
    role: user.role,
    roleCodeType: user.roleCodeType || null,
    roleCodeValue: user.roleCodeValue || null,
    requiresRoleCode: user.role === 'guru' && !user.roleCodeValue,
    canAccessAllCodes: user.role === 'admin',
    createdAt: user.createdAt
  }
}

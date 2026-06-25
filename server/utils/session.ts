import { addMinutesIso, nowIso } from './security'
import { findUserById, publicUser } from './users'

const SESSION_COOKIE = 'absensi_session'

export async function createSession(event: any, db: any, userId: string) {
  const token = crypto.randomUUID() + '-' + crypto.randomUUID()
  const createdAt = nowIso()
  const expiresAt = addMinutesIso(60 * 8)

  await db
    .prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(token, userId, createdAt, expiresAt)
    .run()

  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8
  })

  return token
}

export async function getSessionUser(event: any, db: any) {
  const token = getCookie(event, SESSION_COOKIE)
  if (!token) return null

  const session = await db
    .prepare(`
      SELECT token, user_id as userId, expires_at as expiresAt
      FROM sessions
      WHERE token = ?
    `)
    .bind(token)
    .first()

  if (!session) return null

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
    return null
  }

  const user = await findUserById(db, session.userId)
  return user ? publicUser(user) : null
}

export async function destroySession(event: any, db: any) {
  const token = getCookie(event, SESSION_COOKIE)

  if (token) {
    await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
  }

  deleteCookie(event, SESSION_COOKIE, {
    path: '/'
  })
}

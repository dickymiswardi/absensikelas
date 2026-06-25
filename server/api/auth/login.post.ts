import { getD1 } from '../../utils/db'
import { createSession } from '../../utils/session'
import { findUserByUsername, verifyPassword, publicUser } from '../../utils/users'

export default defineEventHandler(async (event) => {
  const db = getD1(event)
  const body = await readBody(event)

  const username = String(body.username || '')
  const password = String(body.password || '')

  if (!username || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Username dan password wajib diisi.'
    })
  }

  const user = await findUserByUsername(db, username)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Username tidak ditemukan.'
    })
  }

  const valid = await verifyPassword(user, password)

  if (!valid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Password salah.'
    })
  }

  const token = await createSession(event, db, user.id)

  return {
    success: true,
    user: publicUser(user)
  }
})

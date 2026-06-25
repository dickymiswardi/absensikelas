import { getD1, getAppSecrets } from '../../utils/db'
import { createSession } from '../../utils/session'
import { createUser, publicUser } from '../../utils/users'

export default defineEventHandler(async (event) => {
  const db = getD1(event)
  const body = await readBody(event)
  const secrets = getAppSecrets(event)

  const secretInput = String(body.secret || '')

  if (secretInput !== secrets.createUser) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Secret salah. Anda tidak diizinkan membuat user.'
    })
  }

  try {
    const user = await createUser(db, {
      username: String(body.username || ''),
      password: String(body.password || ''),
      firstName: String(body.firstName || ''),
      role: String(body.role || ''),
      classCode: String(body.classCode || '')
    })

    await createSession(event, db, user.id)

    return {
      success: true,
      user: publicUser(user)
    }
  } catch (error: any) {
    if (error?.statusCode) throw error

    throw createError({
      statusCode: 500,
      statusMessage: error?.message || 'Server Error saat membuat user.'
    })
  }
})

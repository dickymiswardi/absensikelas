import { getD1, getAppSecrets } from '../../utils/db'
import { listUsers } from '../../utils/users'

export default defineEventHandler(async (event) => {
  const db = getD1(event)
  const body = await readBody(event)

  const username = String(body.username || '')
  const password = String(body.password || '')
  const secrets = getAppSecrets(event)

  if (username !== 'admin' || password !== secrets.forgotPassword) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Gate ditolak. Gunakan credential yang benar.'
    })
  }

  const users = await listUsers(db)

  return {
    users
  }
})

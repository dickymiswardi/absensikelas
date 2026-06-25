import { getD1 } from '../../utils/db'
import { getSessionUser } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const db = getD1(event)
  const user = await getSessionUser(event, db)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Sesi tidak valid.'
    })
  }

  return { user }
})

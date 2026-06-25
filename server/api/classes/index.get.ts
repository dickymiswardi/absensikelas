import { getD1 } from '../../utils/db'
import { getSessionUser } from '../../utils/session'
import { nowIso } from '../../utils/security'

export default defineEventHandler(async (event) => {
  const db = getD1(event)
  const user = await getSessionUser(event, db)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const result = await db.prepare('SELECT * FROM classes ORDER BY created_at DESC').all()
  return { classes: result.results || [] }
})

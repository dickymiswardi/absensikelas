import { getD1 } from '../../utils/db'
import { getSessionUser } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const db = getD1(event)
  const user = await getSessionUser(event, db)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const query = getQuery(event)
  const classId = query.classId as string
  const date = query.date as string

  if (!classId || !date) {
    return { attendance: [] }
  }

  const result = await db
    .prepare('SELECT * FROM attendance WHERE class_id = ? AND attendance_date = ?')
    .bind(classId, date)
    .all()

  return { attendance: result.results || [] }
})

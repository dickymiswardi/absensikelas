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

  let result
  if (classId) {
    result = await db
      .prepare('SELECT * FROM students WHERE class_id = ? ORDER BY name ASC')
      .bind(classId)
      .all()
  } else if (user.role === 'admin') {
    result = await db.prepare('SELECT * FROM students ORDER BY class_code ASC, name ASC').all()
  } else {
    // Guru that didn't provide classId?
    result = { results: [] }
  }

  return { students: result.results || [] }
})

import { getD1 } from '../../utils/db'
import { getSessionUser } from '../../utils/session'
import { nowIso } from '../../utils/security'

export default defineEventHandler(async (event) => {
  const db = getD1(event)
  const user = await getSessionUser(event, db)

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const { studentId, nisn, classId, classCode, date, status } = body

  if (!studentId || !nisn || !classId || !date || !status) {
    throw createError({ statusCode: 400, statusMessage: 'Semua field wajib diisi.' })
  }

  const now = nowIso()

  await db
    .prepare(`
      INSERT INTO attendance (id, student_id, nisn, class_id, class_code, attendance_date, status, created_by_user_id, created_by_username, updated_by_user_id, updated_by_username, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(nisn, attendance_date) DO UPDATE SET
        status = excluded.status,
        updated_by_user_id = excluded.updated_by_user_id,
        updated_by_username = excluded.updated_by_username,
        updated_at = excluded.updated_at
    `)
    .bind(
      crypto.randomUUID(), studentId, nisn, classId, classCode || '', date, status,
      user.id, user.username, user.id, user.username, now, now
    )
    .run()

  return { success: true }
})

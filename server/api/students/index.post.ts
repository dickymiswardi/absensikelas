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
  const classId = String(body.classId || '').trim()
  const classCode = String(body.classCode || '').trim()
  const nisn = String(body.nisn || '').trim()
  const name = String(body.name || '').trim()

  if (!classId || !classCode || !nisn || !name) {
    throw createError({ statusCode: 400, statusMessage: 'Semua field wajib diisi.' })
  }

  const id = crypto.randomUUID()
  const createdAt = nowIso()

  try {
    await db
      .prepare('INSERT INTO students (id, class_id, class_code, nisn, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, classId, classCode, nisn, name, createdAt, createdAt)
      .run()

    return { success: true }
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint')) {
      throw createError({ statusCode: 409, statusMessage: 'NISN sudah terdaftar.' })
    }
    throw error
  }
})

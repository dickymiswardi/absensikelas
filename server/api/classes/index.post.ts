import { getD1 } from '../../utils/db'
import { getSessionUser } from '../../utils/session'
import { nowIso } from '../../utils/security'

export default defineEventHandler(async (event) => {
  const db = getD1(event)
  const user = await getSessionUser(event, db)

  if (!user || user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Hanya Admin yang dapat membuat kelas.' })
  }

  const body = await readBody(event)
  const name = String(body.name || '').trim()
  const code = String(body.code || '').trim()

  if (!name || !code) {
    throw createError({ statusCode: 400, statusMessage: 'Nama dan kode kelas wajib diisi.' })
  }

  const id = crypto.randomUUID()
  const createdAt = nowIso()

  try {
    await db
      .prepare('INSERT INTO classes (id, name, code, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .bind(id, name, code, createdAt, createdAt)
      .run()

    return { success: true, class: { id, name, code } }
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint')) {
      throw createError({ statusCode: 409, statusMessage: 'Kode kelas sudah digunakan.' })
    }
    throw error
  }
})

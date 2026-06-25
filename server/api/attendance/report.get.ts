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
  const startDate = query.startDate as string
  const endDate = query.endDate as string

  if (!classId || !startDate || !endDate) {
    throw createError({ statusCode: 400, statusMessage: 'Parameter classId, startDate, dan endDate wajib diisi.' })
  }

  const studentsResult = await db.prepare('SELECT id, nisn, name FROM students WHERE class_id = ? ORDER BY name ASC').bind(classId).all()
  const students = studentsResult.results || []

  const attResult = await db.prepare(`
    SELECT nisn, status 
    FROM attendance 
    WHERE class_id = ? AND attendance_date >= ? AND attendance_date <= ?
  `).bind(classId, startDate, endDate).all()
  const attendances = attResult.results || []

  const report = students.map((s: any) => {
    const records = attendances.filter((a: any) => a.nisn === s.nisn)
    const counts: Record<string, number> = { hadir: 0, sakit: 0, izin: 0, alpha: 0 }
    
    records.forEach((a: any) => {
      if (counts[a.status] !== undefined) {
        counts[a.status]++
      }
    })

    const totalDays = records.length
    const percentage = totalDays > 0 ? ((counts.hadir / totalDays) * 100).toFixed(1) : '0.0'

    return {
      nisn: s.nisn,
      name: s.name,
      hadir: counts.hadir,
      sakit: counts.sakit,
      izin: counts.izin,
      alpha: counts.alpha,
      totalDays,
      percentage: `${percentage}%`
    }
  })

  return { report }
})

import { getD1, getAppSecrets } from '../../utils/db'
import { findUserByUsername, updatePassword } from '../../utils/users'

export default defineEventHandler(async (event) => {
  const db = getD1(event)
  const body = await readBody(event)
  const secrets = getAppSecrets(event)

  const secretInput = String(body.secret || '')

  if (secretInput !== secrets.forgotPassword) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Secret lupa password salah.'
    })
  }

  const username = String(body.username || '')
  const newPassword = String(body.newPassword || '')

  if (!username || !newPassword) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Username dan password baru wajib diisi.'
    })
  }

  const user = await findUserByUsername(db, username)

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Username tidak ditemukan.'
    })
  }

  await updatePassword(db, user.id, newPassword)
  await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id).run()

  return {
    success: true,
    message: 'Password berhasil direset. Silakan login kembali.'
  }
})

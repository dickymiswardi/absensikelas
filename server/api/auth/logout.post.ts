import { getD1 } from '../../utils/db'
import { destroySession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const db = getD1(event)
  await destroySession(event, db)
  return { success: true }
})

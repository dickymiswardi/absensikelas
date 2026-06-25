export function getD1(event: any) {
  const db = event.context?.cloudflare?.env?.db

  if (!db) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Binding D1 db belum ditemukan. Tambahkan binding db di Cloudflare Pages.'
    })
  }

  return db
}

export function getAppSecrets(event: any) {
  return {
    createUser: event.context?.cloudflare?.env?.['creat-users'] || '@absensi123',
    forgotPassword: event.context?.cloudflare?.env?.['forgot-password'] || '@lupa123'
  }
}

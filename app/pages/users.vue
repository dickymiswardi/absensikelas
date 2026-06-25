<script setup lang="ts">
import { ref } from 'vue'

const { data: meData } = await useFetch('/api/auth/me')
const user = computed(() => meData.value?.user)

// Redirect if not admin
if (import.meta.client && user.value?.role !== 'admin') {
  navigateTo('/')
}

const gateUsername = ref('')
const gatePassword = ref('')
const unlocked = ref(false)
const users = ref<any[]>([])
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

async function unlockUsers() {
  loading.value = true
  errorMsg.value = ''
  
  try {
    const res: any = await $fetch('/api/users/list', {
      method: 'POST',
      body: { username: gateUsername.value, password: gatePassword.value }
    })
    users.value = res.users
    unlocked.value = true
  } catch (err: any) {
    errorMsg.value = err?.data?.statusMessage || 'Gate ditolak.'
  } finally {
    loading.value = false
  }
}

async function deleteUser(u: any) {
  if (!confirm(`Hapus akun ${u.username}?`)) return
  
  try {
    await $fetch('/api/users/delete', {
      method: 'POST',
      body: { username: gateUsername.value, password: gatePassword.value, userId: u.id }
    })
    users.value = users.value.filter(x => x.id !== u.id)
    successMsg.value = `Akun ${u.username} berhasil dihapus.`
  } catch (err: any) {
    errorMsg.value = err?.data?.statusMessage || 'Gagal menghapus.'
  }
}
</script>

<template>
  <div class="app-container">
    <div class="glass-panel dash-card" style="max-width: 900px; margin: 0 auto;">
      <div class="dash-card-header">
        <h1 class="dash-card-title">Manajemen Akun Pengguna</h1>
        <NuxtLink to="/" class="btn btn-secondary">Kembali</NuxtLink>
      </div>

      <div v-if="!unlocked">
        <form @submit.prevent="unlockUsers" style="max-width: 400px; margin: 0 auto;">
          <p style="margin-bottom: 1rem; color: var(--text-secondary);">Masukkan kredensial khusus Admin untuk membuka gate pengguna.</p>
          <div v-if="errorMsg" class="alert alert-error">{{ errorMsg }}</div>
          
          <div class="form-group">
            <label class="form-label">Username Gate</label>
            <input v-model="gateUsername" type="text" class="form-input" required />
          </div>
          <div class="form-group">
            <label class="form-label">Password Gate (Secret Lupa Password)</label>
            <input v-model="gatePassword" type="password" class="form-input" required />
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%;">{{ loading ? 'Memeriksa...' : 'Buka Gate' }}</button>
        </form>
      </div>

      <div v-else>
        <div v-if="successMsg" class="alert alert-success">{{ successMsg }}</div>
        <div v-if="errorMsg" class="alert alert-error">{{ errorMsg }}</div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Nama Depan</th>
                <th>Role</th>
                <th>Kode Role</th>
                <th>Status Password</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in users" :key="u.id">
                <td>{{ u.username }}</td>
                <td>{{ u.firstNameLabel }}</td>
                <td><span class="badge badge-blue" style="text-transform: uppercase;">{{ u.role }}</span></td>
                <td>{{ u.roleCodeValue || '-' }}</td>
                <td>{{ u.hasPassword ? 'Terenkripsi' : '-' }}</td>
                <td>
                  <button @click="deleteUser(u)" class="btn btn-danger" style="padding: 0.25rem 0.75rem; font-size: 0.8rem;">Hapus</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

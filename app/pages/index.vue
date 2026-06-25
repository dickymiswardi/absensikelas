<script setup lang="ts">
import { ref, onMounted } from 'vue'

const { data: meData, refresh: refreshMe } = await useFetch('/api/auth/me')

const isAuthenticated = computed(() => !!meData.value?.user)
const user = computed(() => meData.value?.user)

// Portal Login State
const loginMode = ref<'login' | 'register' | 'forgot'>('login')
const form = ref({
  username: '',
  password: '',
  firstName: '',
  role: 'guru',
  classCode: '',
  secret: '',
  newPassword: ''
})
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

// Dashboard State
const classes = ref<any[]>([])
const students = ref<any[]>([])
const selectedClass = useCookie('selected-class', { default: () => '' })
const attendanceDate = ref(new Date().toISOString().split('T')[0])

async function submitAuth() {
  errorMsg.value = ''
  successMsg.value = ''
  loading.value = true

  try {
    let url = '/api/auth/login'
    let body: any = { username: form.value.username, password: form.value.password }

    if (loginMode.value === 'register') {
      url = '/api/auth/register'
      body = { ...form.value }
    } else if (loginMode.value === 'forgot') {
      url = '/api/auth/reset'
      body = { username: form.value.username, newPassword: form.value.newPassword, secret: form.value.secret }
    }

    const res = await $fetch(url, { method: 'POST', body })

    if (loginMode.value === 'forgot') {
      successMsg.value = (res as any).message
      loginMode.value = 'login'
    } else {
      await refreshMe()
      loadDashboardData()
    }
  } catch (err: any) {
    errorMsg.value = err?.data?.statusMessage || 'Terjadi kesalahan'
  } finally {
    loading.value = false
  }
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await refreshMe()
}

async function loadDashboardData() {
  if (!isAuthenticated.value) return
  
  const res = await $fetch('/api/classes')
  classes.value = (res as any).classes

  if (user.value?.role !== 'admin' && classes.value.length > 0) {
    selectedClass.value = classes.value[0].id
    loadStudents()
  } else if (selectedClass.value) {
    loadStudents()
  }
}

async function loadStudents() {
  const cId = selectedClass.value
  if (!cId) return
  
  const [stuRes, attRes] = await Promise.all([
    $fetch(`/api/students?classId=${cId}`),
    $fetch(`/api/attendance?classId=${cId}&date=${attendanceDate.value}`)
  ])
  
  const atts = (attRes as any).attendance || []
  const stus = (stuRes as any).students || []
  
  students.value = stus.map((s: any) => {
    const a = atts.find((x: any) => x.nisn === s.nisn)
    return { ...s, status: a ? a.status : '' }
  })
}

async function markAttendance(student: any, status: string) {
  const cId = selectedClass.value
  await $fetch('/api/attendance', {
    method: 'POST',
    body: {
      studentId: student.id,
      nisn: student.nisn,
      classId: cId,
      date: attendanceDate.value,
      status
    }
  })
  student.status = status
}

onMounted(() => {
  if (isAuthenticated.value) {
    loadDashboardData()
  }
})

watch(selectedClass, loadStudents)
watch(attendanceDate, loadStudents)

const newClassForm = ref({ name: '', code: '' })
async function addClass() {
  await $fetch('/api/classes', { method: 'POST', body: newClassForm.value })
  newClassForm.value = { name: '', code: '' }
  loadDashboardData()
}

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const newStudentForm = ref({ nisn: '', name: '' })
async function addStudent() {
  const cId = selectedClass.value
  const cCode = classes.value.find(c => c.id === cId)?.code
  
  await $fetch('/api/students', { 
    method: 'POST', 
    body: { ...newStudentForm.value, classId: cId, classCode: cCode } 
  })
  newStudentForm.value = { nisn: '', name: '' }
  loadStudents()
}

// PDF Report Logic
const reportStartDate = ref(new Date().toISOString().split('T')[0])
const reportEndDate = ref(new Date().toISOString().split('T')[0])
const generatingReport = ref(false)

async function downloadReport() {
  const cId = selectedClass.value
  if (!cId) {
    alert('Silakan pilih kelas terlebih dahulu.')
    return
  }
  if (!reportStartDate.value || !reportEndDate.value) {
    alert('Pilih rentang tanggal terlebih dahulu.')
    return
  }
  if (reportStartDate.value > reportEndDate.value) {
    alert('Tanggal mulai tidak boleh lebih besar dari tanggal akhir.')
    return
  }

  generatingReport.value = true
  try {
    const res: any = await $fetch(`/api/attendance/report?classId=${cId}&startDate=${reportStartDate.value}&endDate=${reportEndDate.value}`)
    const reportData = res.report
    const classObj = classes.value.find(c => c.id === cId)
    const className = classObj ? classObj.name : (user.value?.roleCodeValue || 'Kelas')

    const doc = new jsPDF()
    
    doc.setFontSize(16)
    doc.text('Rekapitulasi Absensi Siswa', 14, 15)
    doc.setFontSize(11)
    doc.text(`Kelas: ${className}`, 14, 23)
    doc.text(`Periode: ${reportStartDate.value} s.d ${reportEndDate.value}`, 14, 29)

    const tableColumn = ["No", "NISN", "Nama Siswa", "Hadir", "Sakit", "Izin", "Alpha", "Persentase"]
    const tableRows = reportData.map((s: any, i: number) => [
      i + 1, s.nisn, s.name, s.hadir, s.sakit, s.izin, s.alpha, s.percentage
    ])

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] }
    })

    doc.save(`Rekap_${className}_${reportStartDate.value}_${reportEndDate.value}.pdf`)
  } catch (error) {
    alert('Gagal mengunduh laporan. Pastikan koneksi dan data valid.')
  } finally {
    generatingReport.value = false
  }
}
</script>

<template>
  <div class="app-container">
    
    <!-- AUTH PORTAL -->
    <div v-if="!isAuthenticated" class="auth-container">
      <div class="auth-card glass-panel">
        <div class="auth-header">
          <h1 class="auth-title">Absensi Kelas</h1>
          <p class="auth-subtitle">Sistem Informasi Kehadiran</p>
        </div>

        <form @submit.prevent="submitAuth">
          <div v-if="errorMsg" class="alert alert-error">{{ errorMsg }}</div>
          <div v-if="successMsg" class="alert alert-success">{{ successMsg }}</div>

          <div class="form-group">
            <label class="form-label">Username</label>
            <input v-model="form.username" type="text" class="form-input" required />
          </div>

          <div v-if="loginMode === 'login' || loginMode === 'register'" class="form-group">
            <label class="form-label">Password</label>
            <input v-model="form.password" type="password" class="form-input" required />
          </div>

          <template v-if="loginMode === 'register'">
            <div class="form-group">
              <label class="form-label">Nama Depan</label>
              <input v-model="form.firstName" type="text" class="form-input" required />
            </div>
            <div class="form-group">
              <label class="form-label">Role</label>
              <select v-model="form.role" class="form-input">
                <option value="guru">Guru</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div v-if="form.role === 'guru'" class="form-group">
              <label class="form-label">Kode Kelas</label>
              <input v-model="form.classCode" type="text" class="form-input" placeholder="Masukkan kode kelas" />
            </div>
            <div class="form-group">
              <label class="form-label">Secret Pembuatan User</label>
              <input v-model="form.secret" type="password" class="form-input" required />
            </div>
          </template>

          <template v-if="loginMode === 'forgot'">
            <div class="form-group">
              <label class="form-label">Password Baru</label>
              <input v-model="form.newPassword" type="password" class="form-input" required />
            </div>
            <div class="form-group">
              <label class="form-label">Secret Lupa Password</label>
              <input v-model="form.secret" type="password" class="form-input" required />
            </div>
          </template>

          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;" :disabled="loading">
            {{ loading ? 'Memproses...' : (loginMode === 'login' ? 'Login' : loginMode === 'register' ? 'Daftar' : 'Reset Password') }}
          </button>
        </form>

        <div class="auth-links">
          <button v-if="loginMode !== 'login'" @click="loginMode = 'login'" type="button">Kembali ke Login</button>
          <template v-else>
            <button @click="loginMode = 'forgot'" type="button">Lupa Password?</button>
            <button @click="loginMode = 'register'" type="button">Buat User</button>
          </template>
        </div>
      </div>
    </div>

    <!-- DASHBOARD -->
    <div v-else>
      <div class="glass-panel dash-header">
        <div class="dash-user-info">
          <h2>Halo, {{ user.firstNameLabel || user.username }}</h2>
          <p>Role: <span class="badge badge-blue" style="text-transform: uppercase;">{{ user.role }}</span></p>
        </div>
        <div style="display: flex; gap: 1rem;">
          <NuxtLink v-if="user.role === 'admin'" to="/users" class="btn btn-secondary">Kelola Users</NuxtLink>
          <button @click="logout" class="btn btn-danger">Logout</button>
        </div>
      </div>

      <div class="dash-grid">
        <!-- Admin Classes Management -->
        <div v-if="user.role === 'admin'" class="glass-panel dash-card">
          <div class="dash-card-header">
            <h3 class="dash-card-title">Daftar Kelas</h3>
          </div>
          
          <form @submit.prevent="addClass" style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
            <input v-model="newClassForm.name" type="text" placeholder="Nama Kelas" class="form-input" required />
            <input v-model="newClassForm.code" type="text" placeholder="Kode Kelas" class="form-input" required />
            <button type="submit" class="btn btn-primary">Tambah</button>
          </form>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Kode</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in classes" :key="c.id">
                  <td>{{ c.name }}</td>
                  <td>{{ c.code }}</td>
                  <td>
                    <button @click="selectedClass = c.id; loadStudents()" class="btn btn-secondary" style="padding: 0.25rem 0.75rem; font-size: 0.8rem;">Pilih</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Report Management -->
        <div class="glass-panel dash-card">
          <div class="dash-card-header">
            <h3 class="dash-card-title">Laporan Rekap Absensi</h3>
          </div>
          <div v-if="!selectedClass && user.role === 'admin'" class="alert alert-error">
            Pilih kelas untuk mengunduh laporan.
          </div>
          <div v-else>
            <form @submit.prevent="downloadReport" style="display: flex; flex-direction: column; gap: 1rem;">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">Mulai Tanggal</label>
                <input type="date" v-model="reportStartDate" class="form-input" required />
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">Sampai Tanggal</label>
                <input type="date" v-model="reportEndDate" class="form-input" required />
              </div>
              <button type="submit" class="btn btn-primary" :disabled="generatingReport">
                {{ generatingReport ? 'Menyiapkan PDF...' : 'Unduh Laporan (PDF)' }}
              </button>
            </form>
          </div>
        </div>

        <!-- Attendance Management -->
        <div class="glass-panel dash-card" style="grid-column: span 2;">
          <div class="dash-card-header">
            <h3 class="dash-card-title">Absensi Siswa</h3>
            <input type="date" v-model="attendanceDate" class="form-input" style="width: auto;" />
          </div>

          <div v-if="!selectedClass && user.role === 'admin'" class="alert alert-error">
            Silakan pilih kelas terlebih dahulu.
          </div>
          <div v-else>
            <form @submit.prevent="addStudent" style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem;">
              <input v-model="newStudentForm.nisn" type="text" placeholder="NISN" class="form-input" required />
              <input v-model="newStudentForm.name" type="text" placeholder="Nama Siswa" class="form-input" required />
              <button type="submit" class="btn btn-primary">Tambah Siswa</button>
            </form>

            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>NISN</th>
                    <th>Nama Siswa</th>
                    <th>Kehadiran</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="s in students" :key="s.id">
                    <td>{{ s.nisn }}</td>
                    <td>{{ s.name }}</td>
                    <td style="display: flex; gap: 0.5rem;">
                      <button @click="markAttendance(s, 'hadir')" class="badge" :class="s.status === 'hadir' ? 'badge-green' : 'badge-gray'">Hadir</button>
                      <button @click="markAttendance(s, 'sakit')" class="badge" :class="s.status === 'sakit' ? 'badge-blue' : 'badge-gray'">Sakit</button>
                      <button @click="markAttendance(s, 'izin')" class="badge" :class="s.status === 'izin' ? 'badge-blue' : 'badge-gray'">Izin</button>
                      <button @click="markAttendance(s, 'alpha')" class="badge" :class="s.status === 'alpha' ? 'badge-red' : 'badge-gray'">Alpha</button>
                    </td>
                  </tr>
                  <tr v-if="students.length === 0">
                    <td colspan="3">Belum ada data siswa di kelas ini.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

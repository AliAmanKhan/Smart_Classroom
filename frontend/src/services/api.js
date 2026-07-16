import axios from 'axios'

const API_BASE_URL = '/api'

// request interceptor to dynamically add the JWT token to every request
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// response interceptor to handle token expiration / auth errors
axios.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    const originalRequest = error.config
    
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403) &&
      (!originalRequest || !originalRequest.url || 
        (!originalRequest.url.includes('/api/auth/login') && !originalRequest.url.includes('/api/auth/register'))
      )
    ) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')

      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth
export const register = (data) => axios.post(`${API_BASE_URL}/auth/register`, data)
export const login = (data) => axios.post(`${API_BASE_URL}/auth/login`, data)
export const forgotPassword = (data) => axios.post(`${API_BASE_URL}/auth/forgot-password`, data)
export const resetPassword = (data) => axios.post(`${API_BASE_URL}/auth/reset-password`, data)
export const updateProfile = (data) => axios.put(`${API_BASE_URL}/users/profile`, data)

// Classrooms
export const createClassroom = (data) => axios.post(`${API_BASE_URL}/classrooms`, data)
export const getTeacherClassrooms = () => axios.get(`${API_BASE_URL}/classrooms/teaching`)
export const getStudentClassrooms = () => axios.get(`${API_BASE_URL}/classrooms/enrolled`)
export const getClassroom = (id) => axios.get(`${API_BASE_URL}/classrooms/${id}`)
export const joinByCode = (code) => axios.post(`${API_BASE_URL}/classrooms/join/code/${code}`)
export const joinByLink = (link) => axios.post(`${API_BASE_URL}/classrooms/join/link/${link}`)
export const inviteUsersBulk = (classroomId, emails, role) =>
  axios.post(`${API_BASE_URL}/classrooms/${classroomId}/invite-bulk`, { emails, role })
export const searchUsers = (query, role) =>
  axios.get(`${API_BASE_URL}/users/search?query=${encodeURIComponent(query)}&role=${role}`)

// Assignments
export const createAssignment = (classroomId, formData) =>
  axios.post(`${API_BASE_URL}/assignments/classroom/${classroomId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
export const getClassroomAssignments = (classroomId) =>
  axios.get(`${API_BASE_URL}/assignments/classroom/${classroomId}`)
export const getAssignment = (id) => axios.get(`${API_BASE_URL}/assignments/${id}`)
export const extendDeadline = (id, newDeadline) =>
  axios.put(`${API_BASE_URL}/assignments/${id}/extend?newDeadline=${newDeadline}`)
export const submitAssignment = (id, formData) =>
  axios.post(`${API_BASE_URL}/assignments/${id}/submit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
export const getSubmissions = (id) => axios.get(`${API_BASE_URL}/assignments/${id}/submissions`)
export const getMySubmission = (id) => axios.get(`${API_BASE_URL}/assignments/${id}/my-submission`)
export const unsubmitAssignment = (id) => axios.delete(`${API_BASE_URL}/assignments/${id}/unsubmit`)
export const deleteAssignment = (id) => axios.delete(`${API_BASE_URL}/assignments/${id}`)
export const updateAssignment = (id, formData) =>
  axios.put(`${API_BASE_URL}/assignments/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
export const downloadAssignment = (id) =>
  axios.get(`${API_BASE_URL}/assignments/download/${id}`, { responseType: 'blob' })

// Study Materials
export const uploadMaterial = (classroomId, formData) =>
  axios.post(`${API_BASE_URL}/materials/classroom/${classroomId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
export const getClassroomMaterials = (classroomId) =>
  axios.get(`${API_BASE_URL}/materials/classroom/${classroomId}`)
export const getMaterial = (id) => axios.get(`${API_BASE_URL}/materials/${id}`)
export const regenerateNotes = (id) => axios.post(`${API_BASE_URL}/materials/${id}/regenerate-notes`)
export const downloadMaterial = (id) =>
  axios.get(`${API_BASE_URL}/materials/download/${id}`, { responseType: 'blob' })
export const deleteMaterial = (id) => axios.delete(`${API_BASE_URL}/materials/${id}`)
export const updateMaterial = (id, data) => axios.put(`${API_BASE_URL}/materials/${id}`, data)

// Submissions
export const downloadSubmission = (submissionId) =>
  axios.get(`${API_BASE_URL}/assignments/submission/${submissionId}/download`, { responseType: 'blob' })
export const gradeSubmission = (submissionId, points, feedback) =>
  axios.put(`${API_BASE_URL}/assignments/submission/${submissionId}/grade?points=${points}${feedback ? `&feedback=${encodeURIComponent(feedback)}` : ''}`)
export const returnSubmission = (submissionId) =>
  axios.put(`${API_BASE_URL}/assignments/submission/${submissionId}/return`)

// Sections
export const getSections = (classroomId) =>
  axios.get(`${API_BASE_URL}/classrooms/${classroomId}/sections`)
export const createSection = (classroomId, name) =>
  axios.post(`${API_BASE_URL}/classrooms/${classroomId}/sections`, { name })
export const assignStudentsToSection = (classroomId, sectionId, studentIds) =>
  axios.put(`${API_BASE_URL}/classrooms/${classroomId}/sections/${sectionId}/students`, studentIds)

// Live Class
export const startLiveSession = (classroomId, title, sectionId = null) => {
  const query = sectionId ? `?title=${encodeURIComponent(title)}&sectionId=${sectionId}` : `?title=${encodeURIComponent(title)}`
  return axios.post(`${API_BASE_URL}/live/${classroomId}/start${query}`)
}
export const endLiveSession = (classroomId, sectionId = null) =>
  axios.delete(`${API_BASE_URL}/live/${classroomId}/end${sectionId ? `?sectionId=${sectionId}` : ''}`)
export const getLiveSessionStatus = (classroomId, sectionId = null) =>
  axios.get(`${API_BASE_URL}/live/${classroomId}/status${sectionId ? `?sectionId=${sectionId}` : ''}`)
export const getLiveParticipants = (classroomId, sectionId = null) =>
  axios.get(`${API_BASE_URL}/live/${classroomId}/participants${sectionId ? `?sectionId=${sectionId}` : ''}`)
export const getAllLiveSessions = (classroomId) =>
  axios.get(`${API_BASE_URL}/live/${classroomId}/sessions`)

// Telemetry
export const getTelemetryDashboard = () => axios.get(`${API_BASE_URL}/telemetry/dashboard`)
export const recordTelemetry = (data) => axios.post(`${API_BASE_URL}/telemetry`, data)



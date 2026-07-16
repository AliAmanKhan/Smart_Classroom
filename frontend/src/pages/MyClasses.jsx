import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getTeacherClassrooms, createClassroom } from '../services/api'
import { FaChalkboardTeacher, FaPlus, FaUsers, FaFolderOpen, FaTimes } from 'react-icons/fa'

function MyClasses() {
  const { user } = useAuth()
  const [classrooms, setClassrooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newClassroom, setNewClassroom] = useState({ name: '', description: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchClassrooms()
  }, [user])

  const fetchClassrooms = async () => {
    try {
      const response = await getTeacherClassrooms()
      setClassrooms(response.data)
    } catch (err) {
      console.error('Error fetching teacher classrooms:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClassroom = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await createClassroom(newClassroom)
      setShowCreateModal(false)
      setNewClassroom({ name: '', description: '' })
      fetchClassrooms()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create classroom')
    }
  }

  const cardColors = [
    'bg-rose-600', 'bg-amber-600', 'bg-blue-600',
    'bg-violet-600', 'bg-emerald-600', 'bg-cyan-600',
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-primary-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-primary-600 rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-primary-50 text-primary-700 px-2.5 py-0.5 rounded-md border border-primary-100">
            Educator Space
          </span>
          <h1 className="text-2xl font-bold tracking-tight mt-1.5 text-surface-900 flex items-center gap-2">
            <FaChalkboardTeacher className="text-primary-600" />
            My Classes
          </h1>
          <p className="text-sm text-surface-500 mt-0.5">
            Build and manage your classrooms and distribute materials.
          </p>
        </div>

        {user?.role === 'TEACHER' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <FaPlus className="text-xs" />
            Create Class
          </button>
        )}
      </div>

      {classrooms.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-surface-200">
          <div className="w-14 h-14 bg-surface-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <FaFolderOpen className="text-2xl text-surface-400" />
          </div>
          <h3 className="text-lg font-bold text-surface-900 mb-1">No classrooms found</h3>
          <p className="text-surface-500 max-w-sm mx-auto mb-5 text-sm">
            Create a classroom to get started and share your class code with students.
          </p>
          {user?.role === 'TEACHER' && (
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              <FaPlus /> Create Class
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classrooms.map((classroom, index) => {
            const color = cardColors[index % cardColors.length]
            return (
              <div 
                key={classroom.id} 
                className="bg-white rounded-xl border border-surface-200 overflow-hidden hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between h-[240px]"
              >
                <div className={`p-4 ${color} text-white flex-shrink-0 relative`}>
                  <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                    <FaChalkboardTeacher className="text-white text-sm" />
                  </div>
                  <h3 className="text-base font-bold truncate pr-12">{classroom.name}</h3>
                  <div className="mt-1">
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md font-mono font-bold tracking-wider">
                      Code: {classroom.classCode}
                    </span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <p className="text-surface-500 text-sm line-clamp-2">
                    {classroom.description || 'No description provided.'}
                  </p>
                  
                  <div className="flex items-center justify-between border-t border-surface-100 pt-3 mt-3">
                    <span className="text-xs text-surface-400 font-medium flex items-center gap-1">
                      <FaUsers className="text-xs" />
                      {classroom.studentCount ?? 0} students
                    </span>
                    <Link
                      to={`/classroom/${classroom.id}`}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition"
                    >
                      Manage →
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="flex justify-between items-center px-5 py-3.5 border-b border-surface-100">
              <h2 className="text-lg font-bold text-surface-900">Create Classroom</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded text-surface-400 hover:bg-surface-100 transition">
                <FaTimes />
              </button>
            </div>
            
            {error && (
              <div className="bg-red-50 border-l-3 border-red-500 text-red-700 px-5 py-2.5 text-sm font-medium">{error}</div>
            )}

            <form onSubmit={handleCreateClassroom} className="p-5 space-y-3.5">
              <div>
                <label className="input-label" htmlFor="create-name">Classroom Name</label>
                <input
                  id="create-name"
                  type="text"
                  required
                  placeholder="e.g. Advanced Algorithms"
                  value={newClassroom.name}
                  onChange={(e) => setNewClassroom({ ...newClassroom, name: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="input-label" htmlFor="create-desc">Description</label>
                <textarea
                  id="create-desc"
                  placeholder="Short description or course objectives..."
                  value={newClassroom.description}
                  onChange={(e) => setNewClassroom({ ...newClassroom, description: e.target.value })}
                  className="input min-h-[80px]"
                  rows="3"
                />
              </div>

              <div className="flex gap-2.5 pt-1">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center">Create Class</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyClasses

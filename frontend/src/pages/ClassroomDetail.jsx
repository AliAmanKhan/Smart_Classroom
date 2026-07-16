import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getClassroom,
  getClassroomAssignments,
  getClassroomMaterials,
  createAssignment,
  uploadMaterial,
  deleteAssignment,
  deleteMaterial,
  downloadMaterial,
  downloadAssignment,
  inviteUsersBulk,
  searchUsers,
  updateAssignment,
  updateMaterial,
  getSections,
  createSection,
  assignStudentsToSection,
  startLiveSession,
  endLiveSession,
  getLiveSessionStatus,
  getAllLiveSessions,
  recordTelemetry
} from '../services/api'
import { FaBook, FaClipboardList, FaUsers, FaPlus, FaYoutube, FaFileAlt, FaRobot, FaTrash, FaTimes, FaCalendarAlt, FaStar, FaLink, FaDownload, FaEye, FaCopy, FaUserPlus, FaEllipsisV, FaEdit, FaVolumeUp, FaPause, FaStop, FaLayerGroup, FaVideo, FaSignInAlt, FaPhoneSlash, FaCircle, FaComments, FaMicrophone, FaMicrophoneSlash, FaVideoSlash } from 'react-icons/fa'
import { format } from 'date-fns'
import ReactMarkdown from 'react-markdown'

function ClassroomDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [classroom, setClassroom] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [materials, setMaterials] = useState([])
  const [activeTab, setActiveTab] = useState('assignments')
  const [showCreateAssignment, setShowCreateAssignment] = useState(false)
  const [showUploadMaterial, setShowUploadMaterial] = useState(false)
  const [materialToDelete, setMaterialToDelete] = useState(null)
  const [loading, setLoading] = useState(true)

  // Invite states
  // Invite states
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState({ isOpen: false, role: null })

  // Dropdown & Edit states
  const [activeDropdown, setActiveDropdown] = useState(null)
  const [editingAssignment, setEditingAssignment] = useState(null)
  const [editingMaterial, setEditingMaterial] = useState(null)
  const [expandedNotes, setExpandedNotes] = useState(null)

  // Sections state
  const [sections, setSections] = useState([])
  const [showCreateSection, setShowCreateSection] = useState(false)
  const [sectionsLoading, setSectionsLoading] = useState(false)

  // Live class state
  const [liveSessions, setLiveSessions] = useState([])
  const [liveLoading, setLiveLoading] = useState(false)
  const [fetchingLive, setFetchingLive] = useState(false)
  const [showStartLive, setShowStartLive] = useState(false)
  const [liveTitle, setLiveTitle] = useState('Live Class')
  const [liveSectionId, setLiveSectionId] = useState('')

  // Section removal confirmation
  const [removeConfirm, setRemoveConfirm] = useState(null) // { sectionId, student, updatedIds }

  useEffect(() => {
    setActiveDropdown(null)
  }, [activeTab])

  useEffect(() => {
    fetchClassroomData()
    // Also fetch live status on initial load for the tab indicator
    getAllLiveSessions(id).then(res => setLiveSessions(res.data)).catch(() => {})
  }, [id])

  useEffect(() => {
    // Poll for AI notes updates every 5 seconds if any material is generating
    const hasGeneratingNotes = materials.some(m =>
      m.type === 'YOUTUBE_VIDEO' &&
      m.aiGeneratedNotes &&
      m.aiGeneratedNotes.includes('Generating')
    )

    if (hasGeneratingNotes) {
      const interval = setInterval(() => {
        fetchClassroomData()
      }, 5000) // Poll every 5 seconds

      return () => clearInterval(interval)
    }
  }, [materials])

  const handleCopyCode = () => {
    if (classroom?.classCode) {
      navigator.clipboard.writeText(classroom.classCode)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  const handleCopyLink = () => {
    if (classroom?.inviteLink) {
      const fullInviteLink = `${window.location.origin}/join/link/${classroom.inviteLink}`
      navigator.clipboard.writeText(fullInviteLink)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  const handleInviteSubmit = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setInviteLoading(true)
    setInviteError('')
    setInviteSuccess('')

    try {
      await inviteStudent(id, inviteEmail.trim())
      setInviteSuccess(`Successfully invited and enrolled ${inviteEmail}!`)
      setInviteEmail('')
      fetchClassroomData()
    } catch (err) {
      console.error('Invite error:', err)
      const errorMsg = err.response?.data?.message || err.response?.data || 'Failed to invite user. Make sure they have a registered student account.'
      setInviteError(errorMsg)
    } finally {
      setInviteLoading(false)
    }
  }

  const fetchClassroomData = async () => {
    try {
      const [classroomRes, assignmentsRes, materialsRes] = await Promise.all([
        getClassroom(id),
        getClassroomAssignments(id),
        getClassroomMaterials(id)
      ])
      setClassroom(classroomRes.data)
      setAssignments(assignmentsRes.data)
      setMaterials(materialsRes.data)
    } catch (err) {
      console.error('Error fetching classroom data:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSections = async () => {
    setSectionsLoading(true)
    try {
      const res = await getSections(id)
      setSections(res.data)
    } catch (err) {
      console.error('Error fetching sections:', err)
    } finally {
      setSectionsLoading(false)
    }
  }

  const fetchLiveStatus = async () => {
    setFetchingLive(true)
    try {
      const res = await getAllLiveSessions(id)
      setLiveSessions(res.data)
    } catch (err) {
      console.error('Error fetching live status:', err)
    } finally {
      setFetchingLive(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'sections') fetchSections()
    if (activeTab === 'live') fetchLiveStatus()
  }, [activeTab])

  const handleStartLive = async () => {
    setLiveLoading(true)
    try {
      await startLiveSession(id, liveTitle, liveSectionId || null)
      setShowStartLive(false)
      setLiveTitle('Live Class')
      setLiveSectionId('')
      await fetchLiveStatus()
    } catch (err) {
      console.error('Error starting live session:', err)
      alert(err.response?.data?.message || 'Failed to start live session')
    } finally {
      setLiveLoading(false)
    }
  }

  const handleEndLive = async (sectionId) => {
    if (!window.confirm('Are you sure you want to end this live session?')) return
    setLiveLoading(true)
    try {
      await endLiveSession(id, sectionId)
      await fetchLiveStatus()
    } catch (err) {
      console.error('Error ending live session:', err)
      alert(err.response?.data?.message || 'Failed to end session')
    } finally {
      setLiveLoading(false)
    }
  }

  const handleAssignStudents = async (sectionId, studentIds) => {
    try {
      await assignStudentsToSection(id, sectionId, studentIds)
      await fetchSections()
    } catch (err) {
      console.error('Error assigning students:', err)
      alert(err.response?.data?.message || 'Failed to assign students')
    }
  }

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to delete this assignment? All submissions will be lost.')) {
      return
    }
    try {
      await deleteAssignment(assignmentId)
      fetchClassroomData()
    } catch (err) {
      console.error('Error deleting assignment:', err)
      alert(err.response?.data?.message || 'Failed to delete assignment')
    }
  }

  const handleDeleteMaterial = async (materialId) => {
    try {
      await deleteMaterial(materialId)
      fetchClassroomData()
    } catch (err) {
      console.error('Error deleting material:', err)
      alert(err.response?.data?.message || 'Failed to delete material')
    }
  }

  const handleDownloadFile = async (materialId, fileName) => {
    try {
      const response = await downloadMaterial(materialId)
      const contentType = response.headers['content-type'] || 'application/octet-stream'
      const url = window.URL.createObjectURL(new Blob([response.data], { type: contentType }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName || 'material-file')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      try {
        await recordTelemetry({
          verb: 'VIEWED',
          objectType: 'MATERIAL',
          objectId: materialId,
          classroomId: id
        });
      } catch (e) { console.error('Telemetry failed', e) }
    } catch (err) {
      console.error('Error downloading file:', err)
      alert(err.response?.data?.message || 'Failed to download file')
    }
  }

  const handleDownloadAssignment = async (assignmentId, fileName) => {
    try {
      const response = await downloadAssignment(assignmentId)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName || 'assignment-attachment')
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      console.error('Error downloading attachment:', err)
      alert(err.response?.data?.message || 'Failed to download attachment')
    }
  }

  const isTeacher = user?.role === 'TEACHER' && classroom?.teacher?.id === user?.id
  const mySectionIds = isTeacher ? [] : sections.filter(sec => sec.studentIds?.includes(user?.id)).map(sec => sec.id)
  const visibleLiveSessions = isTeacher 
    ? liveSessions 
    : liveSessions.filter(session => !session.sectionId || mySectionIds.includes(session.sectionId))
  const visibleAssignments = isTeacher
    ? assignments
    : assignments.filter(assignment => !assignment.sectionId || mySectionIds.includes(assignment.sectionId))

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Classroom Header Banner */}
      <div className="bg-primary-700 rounded-3xl p-6 sm:p-8 text-white mb-8 shadow-soft relative overflow-hidden">
        <div className="relative z-10">
          <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
            Classroom Hub
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-3 mb-2">{classroom?.name}</h1>
          <p className="text-white/80 max-w-2xl text-sm sm:text-base mb-6 leading-relaxed">{classroom?.description || 'No description available for this classroom.'}</p>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <div className="flex items-center bg-white/10 px-3.5 py-2 rounded-xl backdrop-blur-sm">
              <FaUsers className="mr-2 text-sm" />
              <span>{classroom?.studentCount ?? 0} enrolled students</span>
            </div>
            {isTeacher && (
              <div className="flex items-center bg-white/25 px-3.5 py-2 rounded-xl backdrop-blur-sm border border-white/20">
                <span className="opacity-80 mr-1.5 font-sans">Class Code:</span>
                <span className="font-mono font-bold tracking-wider">{classroom?.classCode}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex justify-between items-center mb-8 border-b border-surface-200/80">
        <div className="flex gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('assignments')}
            className={`flex items-center gap-2 py-4 px-4 sm:px-6 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${activeTab === 'assignments'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-surface-500 hover:text-surface-800'
              }`}
          >
            <FaClipboardList className="text-base" />
            <span>Assignments</span>
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`flex items-center gap-2 py-4 px-4 sm:px-6 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${activeTab === 'materials'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-surface-500 hover:text-surface-800'
              }`}
          >
            <FaBook className="text-base" />
            <span>Materials</span>
          </button>
          <button
            onClick={() => setActiveTab('sections')}
            className={`flex items-center gap-2 py-4 px-4 sm:px-6 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${activeTab === 'sections'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-surface-500 hover:text-surface-800'
              }`}
          >
            <FaLayerGroup className="text-base" />
            <span>Sections</span>
          </button>
          <button
            onClick={() => setActiveTab('live')}
            className={`flex items-center gap-2 py-4 px-4 sm:px-6 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${activeTab === 'live'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-surface-500 hover:text-surface-800'
              }`}
          >
            <FaVideo className="text-base" />
            <span>Live Class</span>
            {visibleLiveSessions.length > 0 && (
              <FaCircle className="text-[8px] text-red-500 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('people')}
            className={`flex items-center gap-2 py-4 px-4 sm:px-6 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${activeTab === 'people'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-surface-500 hover:text-surface-800'
              }`}
          >
            <FaUsers className="text-base" />
            <span>People</span>
          </button>
        </div>

        <div className="pb-2 flex-shrink-0">
          {activeTab === 'assignments' && isTeacher && (
            <button
              onClick={() => setShowCreateAssignment(true)}
              className="btn-primary"
            >
              <FaPlus className="text-xs" />
              <span>Create Assignment</span>
            </button>
          )}
          {activeTab === 'materials' && isTeacher && (
            <button
              onClick={() => setShowUploadMaterial(true)}
              className="btn-primary"
            >
              <FaPlus className="text-xs" />
              <span>Upload Material</span>
            </button>
          )}
          {activeTab === 'sections' && isTeacher && (
            <button
              onClick={() => setShowCreateSection(true)}
              className="btn-primary"
            >
              <FaPlus className="text-xs" />
              <span>Create Section</span>
            </button>
          )}
          {activeTab === 'live' && isTeacher && liveSessions.length === 0 && (
            <button
              onClick={() => setShowStartLive(true)}
              className="btn-primary"
            >
              <FaVideo className="text-xs" />
              <span>Start Live Class</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="min-h-[300px]">
        {activeTab === 'assignments' && (
          <div className="animate-slide-up">
            {visibleAssignments.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-surface-200/80 shadow-soft">
                <div className="w-16 h-16 bg-surface-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FaClipboardList className="text-3xl text-surface-400" />
                </div>
                <h3 className="text-lg font-bold text-surface-900 mb-1">No assignments yet</h3>
                <p className="text-surface-500 text-sm max-w-xs mx-auto">
                  Assignments created by your instructor will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5">
                {visibleAssignments.map((assignment) => {
                  const section = sections.find(s => s.id === assignment.sectionId)
                  return (
                  <div
                    key={assignment.id}
                    className="group relative bg-white rounded-3xl border border-surface-200/80 shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-300 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 overflow-hidden"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="badge-primary">
                          <FaStar className="text-[10px]" />
                          {assignment.maxPoints} pts max
                        </span>
                        <span className="text-xs text-surface-400 font-medium">
                          Created
                        </span>
                        {section && (
                          <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-md text-[10px] font-bold border border-violet-100 uppercase tracking-wider ml-auto">
                            {section.name}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-surface-900 group-hover:text-primary-600 transition-colors line-clamp-1">
                        {assignment.title}
                      </h3>
                      <p className="text-surface-500 text-sm mt-1.5 line-clamp-2 max-w-3xl">
                        {assignment.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs font-semibold mt-4 text-surface-400">
                        <span className="flex items-center gap-1.5 text-surface-500">
                          <FaCalendarAlt className="text-sm text-surface-400" />
                          Due: {format(new Date(assignment.deadline), 'MMM dd, yyyy @ hh:mm a')}
                        </span>
                        {assignment.attachmentName && (
                          <button
                            onClick={() => handleDownloadAssignment(assignment.id, assignment.attachmentName)}
                            className="flex items-center gap-1.5 text-primary-600 hover:text-primary-700 font-semibold transition-colors"
                            title="Download attachment"
                          >
                            <FaDownload className="text-xs" />
                            <span className="truncate max-w-[180px]">{assignment.attachmentName}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-end md:self-center relative">
                      <Link
                        to={`/assignment/${assignment.id}`}
                        className="btn-secondary"
                      >
                        <FaEye />
                        <span>View Details</span>
                      </Link>
                      {isTeacher && (
                        <div className="relative">
                          <button
                            onClick={() => setActiveDropdown(activeDropdown?.type === 'assignment' && activeDropdown?.id === assignment.id ? null : { type: 'assignment', id: assignment.id })}
                            className="p-3 rounded-xl hover:bg-surface-100 text-surface-500 transition-colors"
                            title="Options"
                          >
                            <FaEllipsisV />
                          </button>
                          
                          {activeDropdown?.type === 'assignment' && activeDropdown?.id === assignment.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                              <div className="absolute right-0 mt-2 w-40 bg-white border border-surface-200 rounded-2xl shadow-elevated z-20 py-1.5 animate-scale-in origin-top-right">
                                <button
                                  onClick={() => {
                                    setEditingAssignment(assignment)
                                    setActiveDropdown(null)
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 flex items-center gap-2 font-medium"
                                >
                                  <FaEdit className="text-surface-400" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => {
                                    handleDeleteAssignment(assignment.id)
                                    setActiveDropdown(null)
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50/50 flex items-center gap-2 font-medium"
                                >
                                  <FaTrash className="text-red-400" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'materials' && (
          <div className="animate-slide-up">
            {materials.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-surface-200/80 shadow-soft">
                <div className="w-16 h-16 bg-surface-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FaBook className="text-3xl text-surface-400" />
                </div>
                <h3 className="text-lg font-bold text-surface-900 mb-1">No study materials</h3>
                <p className="text-surface-500 text-sm max-w-xs mx-auto">
                  Files and YouTube videos uploaded by your teacher will show up here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {materials.map((material) => (
                  <div
                    key={material.id}
                    className="bg-white rounded-3xl border border-surface-200/80 shadow-soft p-6 flex flex-col gap-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${material.type === 'YOUTUBE_VIDEO'
                            ? 'bg-red-50 text-red-500 border border-red-100'
                            : 'bg-blue-50 text-blue-500 border border-blue-100'
                          }`}>
                          {material.type === 'YOUTUBE_VIDEO' ? (
                            <FaYoutube className="text-2xl" />
                          ) : (
                            <FaFileAlt className="text-2xl" />
                          )}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={material.type === 'YOUTUBE_VIDEO' ? 'badge bg-red-50 text-red-700 border border-red-100' : 'badge bg-blue-50 text-blue-700 border border-blue-100'}>
                              {material.type === 'YOUTUBE_VIDEO' ? 'YouTube Video' : 'File Document'}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-surface-900">{material.title}</h3>
                          <p className="text-surface-500 text-sm mt-1">{material.description || 'No description provided.'}</p>
                        </div>
                      </div>

                      {isTeacher && (
                        <div className="relative">
                          <button
                            onClick={() => setActiveDropdown(activeDropdown?.type === 'material' && activeDropdown?.id === material.id ? null : { type: 'material', id: material.id })}
                            className="p-2.5 rounded-xl hover:bg-surface-100 text-surface-500 transition-colors"
                            title="Options"
                          >
                            <FaEllipsisV />
                          </button>

                          {activeDropdown?.type === 'material' && activeDropdown?.id === material.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                              <div className="absolute right-0 mt-2 w-40 bg-white border border-surface-200 rounded-2xl shadow-elevated z-20 py-1.5 animate-scale-in origin-top-right">
                                <button
                                  onClick={() => {
                                    setEditingMaterial(material)
                                    setActiveDropdown(null)
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 flex items-center gap-2 font-medium"
                                >
                                  <FaEdit className="text-surface-400" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setMaterialToDelete(material)
                                    setActiveDropdown(null)
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50/50 flex items-center gap-2 font-medium"
                                >
                                  <FaTrash className="text-red-400" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Material Actions & Preview */}
                    <div className="pt-2 border-t border-surface-100">
                      {material.type === 'YOUTUBE_VIDEO' ? (
                        <div className="space-y-4">
                          {material.youtubeUrl && (
                            <a
                              href={material.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700"
                              onClick={() => {
                                recordTelemetry({
                                  verb: 'VIEWED',
                                  objectType: 'MATERIAL',
                                  objectId: material.id,
                                  classroomId: id
                                }).catch(e => console.error('Telemetry failed', e))
                              }}
                            >
                              <FaLink className="text-xs" />
                              <span>Open YouTube Video</span>
                            </a>
                          )}

                          {material.aiGeneratedNotes && (
                            <div className="mt-4" style={{ padding: '2px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899, #f59e0b, #10b981)', borderRadius: '16px' }}>
                              <div className="bg-white rounded-[14px] p-5">
                              <div className="flex items-center gap-2 font-bold text-surface-800 dark:text-surface-200 text-sm mb-3">
                                <div className="w-7 h-7 bg-primary-100 dark:bg-primary-900/40 rounded-lg flex items-center justify-center">
                                  <FaRobot className="text-primary-600 dark:text-primary-400 text-sm" />
                                </div>
                                <span>AI-Generated Study Summary</span>
                              </div>

                              {material.aiGeneratedNotes.includes('Generating') ? (
                                <div className="flex items-center gap-3 py-2">
                                  <div className="w-5 h-5 border-2 border-primary-200 dark:border-primary-900 border-t-primary-600 dark:border-t-primary-500 rounded-full animate-spin" />
                                  <span className="text-sm text-surface-500 dark:text-surface-400 font-semibold italic">
                                    {material.aiGeneratedNotes}
                                  </span>
                                </div>
                              ) : material.aiGeneratedNotes.includes('Failed') ? (
                                <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                                  {material.aiGeneratedNotes}
                                </p>
                              ) : (
                                <div>
                                  <div className="text-sm text-surface-600 dark:text-surface-300 whitespace-pre-wrap leading-relaxed bg-white dark:bg-surface-900/50 border border-surface-200/60 dark:border-surface-700/50 p-4 rounded-xl font-sans line-clamp-3">
                                    {material.aiGeneratedNotes}
                                  </div>
                                  <button
                                    onClick={() => setExpandedNotes({ title: material.title, content: material.aiGeneratedNotes })}
                                    className="mt-3 text-xs font-bold bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-3 py-1.5 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors flex items-center gap-1.5 inline-flex"
                                  >
                                    <FaEye />
                                    <span>Read Full Notes</span>
                                  </button>
                                </div>
                              )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          {material.fileName && (
                            <button
                              onClick={() => handleDownloadFile(material.id, material.fileName)}
                              className="btn-primary"
                            >
                              <FaDownload className="text-xs" />
                              <span>Download file ({material.fileName})</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'people' && (
          <div className="animate-slide-up space-y-8 max-w-4xl mx-auto">
            {/* Invite Options - Only for Teachers */}
            {isTeacher && (
              <div className="bg-white rounded-3xl border border-surface-200/80 shadow-soft p-6">
                <h2 className="text-xl font-extrabold text-surface-900 tracking-tight mb-6 flex items-center gap-2">
                  <FaUserPlus className="text-primary-600" />
                  <span>Invite & Add Members</span>
                </h2>

                <div>
                  {/* Share Code & Link */}
                  <div className="space-y-4 bg-surface-50/50 p-5 rounded-2xl border border-surface-100 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-surface-800 text-sm uppercase tracking-wider mb-2">Share Invite Details</h3>
                      <p className="text-xs text-surface-500 leading-relaxed mb-4">
                        Students can join this classroom using the unique classroom code or by clicking the invite link.
                      </p>
                      
                      <div className="space-y-3">
                        {/* Code */}
                        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-surface-200">
                          <div>
                            <span className="text-[10px] text-surface-400 font-semibold uppercase block">Classroom Code</span>
                            <span className="font-mono font-bold text-surface-800 tracking-wider">{classroom?.classCode}</span>
                          </div>
                          <button
                            onClick={handleCopyCode}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors"
                          >
                            <FaCopy className="text-xs" />
                            <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                          </button>
                        </div>

                        {/* Link */}
                        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-surface-200">
                          <div className="min-w-0 flex-1 mr-3">
                            <span className="text-[10px] text-surface-400 font-semibold uppercase block">Invite Link</span>
                            <span className="text-xs text-surface-600 truncate block">
                              {`${window.location.origin}/join/link/${classroom?.inviteLink}`}
                            </span>
                          </div>
                          <button
                            onClick={handleCopyLink}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors flex-shrink-0"
                          >
                            <FaLink className="text-xs" />
                            <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Teachers Section */}
            <div className="bg-white rounded-3xl border border-surface-200/80 shadow-soft p-6">
              <div className="flex items-center justify-between pb-4 border-b border-surface-100 mb-6">
                <h2 className="text-xl font-extrabold text-surface-900 tracking-tight flex items-center gap-2">
                  <span>Teachers</span>
                  <span className="text-sm font-semibold text-primary-600 bg-primary-50 px-2.5 py-0.5 rounded-full">
                    {1 + (classroom?.coTeachers?.length || 0)}
                  </span>
                </h2>
                {isTeacher && (
                  <button
                    onClick={() => setShowInviteModal({ isOpen: true, role: 'TEACHER' })}
                    className="flex items-center gap-1.5 text-sm font-bold bg-primary-50 text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-100 transition-colors"
                  >
                    <FaUserPlus className="text-sm" />
                    <span>User</span>
                  </button>
                )}
              </div>
              
              <div className="divide-y divide-surface-100">
                {classroom?.teacher && (
                  <div className="flex items-center justify-between py-4 hover:bg-surface-50/50 px-4 rounded-2xl transition duration-150">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                        {classroom.teacher.fullName ? classroom.teacher.fullName.charAt(0).toUpperCase() : 'T'}
                      </div>
                      <div>
                        <h3 className="font-bold text-surface-900">{classroom.teacher.fullName}</h3>
                        <p className="text-xs text-surface-500 font-medium">{classroom.teacher.email}</p>
                      </div>
                    </div>
                    <span className="badge-primary px-3 py-1 rounded-xl text-xs font-semibold">
                      Primary Teacher
                    </span>
                  </div>
                )}
                {classroom?.coTeachers?.map((coTeacher) => (
                  <div key={coTeacher.id} className="flex items-center justify-between py-4 hover:bg-surface-50/50 px-4 rounded-2xl transition duration-150">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center text-surface-700 font-bold text-lg shadow-sm">
                        {coTeacher.fullName ? coTeacher.fullName.charAt(0).toUpperCase() : 'T'}
                      </div>
                      <div>
                        <h3 className="font-bold text-surface-900">{coTeacher.fullName}</h3>
                        <p className="text-xs text-surface-500 font-medium">{coTeacher.email}</p>
                      </div>
                    </div>
                    <span className="bg-surface-100 text-surface-600 border-surface-200 px-3 py-1 rounded-xl text-xs font-semibold border">
                      Co-Teacher
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Students Section */}
            <div className="bg-white rounded-3xl border border-surface-200/80 shadow-soft p-6">
              <div className="flex items-center justify-between pb-4 border-b border-surface-100 mb-6">
                <h2 className="text-xl font-extrabold text-surface-900 tracking-tight flex items-center gap-2">
                  <span>Classmates</span>
                  <span className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    {classroom?.students?.length ?? 0}
                  </span>
                </h2>
                {isTeacher && (
                  <button
                    onClick={() => setShowInviteModal({ isOpen: true, role: 'STUDENT' })}
                    className="flex items-center gap-1.5 text-sm font-bold bg-primary-50 text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-100 transition-colors"
                  >
                    <FaUserPlus className="text-sm" />
                    <span>User</span>
                  </button>
                )}
              </div>

              {!classroom?.students || classroom.students.length === 0 ? (
                <div className="text-center py-12 text-surface-400">
                  <div className="w-12 h-12 bg-surface-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FaUsers className="text-xl text-surface-400" />
                  </div>
                  <p className="text-sm font-medium">No other classmates have joined this classroom yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-surface-100">
                  {classroom.students.map((student) => {
                    const isMe = student.email === user?.email;
                    return (
                      <div key={student.id} className="flex items-center justify-between py-4 hover:bg-surface-50/30 px-4 rounded-2xl transition duration-150">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-full bg-surface-100 text-surface-700 flex items-center justify-center font-bold text-base border border-surface-200/60">
                            {student.fullName ? student.fullName.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div>
                            <h3 className="font-bold text-surface-900 flex items-center gap-2">
                              <span>{student.fullName}</span>
                              {isMe && (
                                <span className="bg-primary-50 text-primary-600 text-[10px] px-2 py-0.5 rounded-md font-semibold border border-primary-100">
                                  You
                                </span>
                              )}
                            </h3>
                            <p className="text-xs text-surface-500 font-medium">{student.email}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Sections Tab ─── */}
        {activeTab === 'sections' && (
          <div className="animate-slide-up space-y-6">
            {sectionsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              </div>
            ) : sections.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-surface-200/80 shadow-soft">
                <div className="w-16 h-16 bg-surface-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FaLayerGroup className="text-3xl text-surface-400" />
                </div>
                <h3 className="text-lg font-bold text-surface-900 mb-1">No sections yet</h3>
                <p className="text-surface-500 text-sm max-w-xs mx-auto">
                  {isTeacher
                    ? 'Create sections to organize your students into groups.'
                    : 'Your teacher hasn\'t created any sections yet.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {sections.map((section) => {
                  const sectionStudents = classroom?.students?.filter(s => section.studentIds?.includes(s.id)) || []
                  const unassignedStudents = classroom?.students?.filter(s => !section.studentIds?.includes(s.id)) || []
                  return (
                    <div
                      key={section.id}
                      className="bg-white rounded-3xl border border-surface-200/80 shadow-soft p-6"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-3 border-b border-surface-100 gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center border border-violet-100">
                            <FaLayerGroup className="text-lg" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-surface-900">{section.name}</h3>
                            <span className="text-xs text-surface-500 font-medium">{sectionStudents.length} student{sectionStudents.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        
                        {/* Live Class Indicator in Section */}
                        {(isTeacher || sectionStudents.some(s => s.id === user?.id)) && liveSessions.find(ls => ls.sectionId === section.id) && (
                          <div className="flex shrink-0">
                            <Link
                              to={`/live/${id}/${liveSessions.find(ls => ls.sectionId === section.id).sessionId}`}
                              className="btn-primary py-1.5 px-3 text-xs w-full sm:w-auto flex items-center justify-center gap-2"
                            >
                              <FaVideo className="text-[10px] animate-pulse" />
                              <span>Join Live Class</span>
                            </Link>
                          </div>
                        )}
                      </div>

                      {/* Students in this section */}
                      {sectionStudents.length === 0 ? (
                        <p className="text-sm text-surface-400 italic py-3">No students assigned to this section.</p>
                      ) : (
                        <div className="space-y-2 mb-4">
                          {sectionStudents.map((student) => (
                            <div key={student.id} className="flex items-center justify-between py-2 px-3 bg-surface-50 rounded-xl">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">
                                  {student.fullName?.charAt(0)?.toUpperCase() || 'S'}
                                </div>
                                <div>
                                  <span className="text-sm font-semibold text-surface-800">{student.fullName}</span>
                                  <span className="text-xs text-surface-500 block">{student.email}</span>
                                </div>
                              </div>
                              {isTeacher && (
                                <button
                                  onClick={() => {
                                    const updated = section.studentIds.filter(sid => sid !== student.id)
                                    setRemoveConfirm({ sectionId: section.id, student, updatedIds: updated })
                                  }}
                                  className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors"
                                  title="Remove from section"
                                >
                                  <FaTimes />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add students dropdown (teacher only) */}
                      {isTeacher && unassignedStudents.length > 0 && (
                        <SectionStudentAdder
                          unassignedStudents={unassignedStudents}
                          currentStudentIds={section.studentIds || []}
                          onAdd={(studentId) => {
                            const updated = [...(section.studentIds || []), studentId]
                            handleAssignStudents(section.id, updated)
                          }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Live Class Tab ─── */}
        {activeTab === 'live' && (
          <div className="animate-slide-up space-y-6">
            {fetchingLive ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              </div>
            ) : visibleLiveSessions.length > 0 ? (
              visibleLiveSessions.map(session => {
                const section = sections.find(s => s.id === session.sectionId)
                
                return (
                  <div key={session.sessionId} className="bg-white rounded-3xl border border-surface-200/80 shadow-soft overflow-hidden">
                    {/* Live header */}
                    <div className="bg-gradient-to-r from-red-600 to-rose-600 p-6 text-white">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                            <FaVideo className="text-2xl" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <FaCircle className="text-[8px] animate-pulse" />
                              <span className="text-xs font-bold uppercase tracking-wider opacity-90">Live Now</span>
                              {section && (
                                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-md text-[10px] font-bold border border-white/30">
                                  Section: {section.name}
                                </span>
                              )}
                            </div>
                            <h2 className="text-xl font-bold">{session.title || 'Live Class'}</h2>
                            <p className="text-sm text-white/70 mt-0.5">
                              Started {session.startedAt ? format(new Date(session.startedAt), 'hh:mm a') : 'just now'}
                            </p>
                          </div>
                        </div>
                        {isTeacher && (
                          <button
                            onClick={() => handleEndLive(session.sectionId)}
                            disabled={liveLoading}
                            className="flex items-center justify-center sm:justify-start gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all backdrop-blur-sm border border-white/20"
                          >
                            <FaPhoneSlash />
                            <span>{liveLoading ? 'Ending...' : 'End Session'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Session info & join */}
                    <div className="p-6">
                      <div className="bg-surface-50 rounded-2xl p-5 border border-surface-100">
                        <h3 className="font-bold text-surface-800 mb-2">Session Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-surface-500 font-medium block text-xs uppercase tracking-wider">Session ID</span>
                            <span className="font-mono text-surface-700 text-xs">{session.sessionId}</span>
                          </div>
                          <div>
                            <span className="text-surface-500 font-medium block text-xs uppercase tracking-wider">Started At</span>
                            <span className="font-medium text-surface-700">{session.startedAt ? format(new Date(session.startedAt), 'MMM dd, yyyy @ hh:mm a') : '—'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                            <FaVideo className="text-blue-600 text-sm" />
                          </div>
                          <div>
                            <h4 className="font-bold text-blue-900 text-sm">Join the Classroom</h4>
                            <p className="text-blue-700 text-xs mt-1 leading-relaxed">
                              Connect your camera and microphone to participate in the real-time session.
                            </p>
                          </div>
                        </div>
                        <Link
                          to={`/live/${id}/${session.sessionId}`}
                          className="btn-primary whitespace-nowrap px-6"
                        >
                          <span>Join Class</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-16 bg-white rounded-3xl border border-surface-200/80 shadow-soft">
                <div className="w-20 h-20 bg-surface-50 rounded-3xl flex items-center justify-center mx-auto mb-5 border border-surface-100">
                  <FaVideo className="text-4xl text-surface-400" />
                </div>
                <h3 className="text-xl font-bold text-surface-900 mb-2">No Live Session Active</h3>
                <p className="text-surface-500 text-sm max-w-sm mx-auto leading-relaxed mb-6">
                  {isTeacher
                    ? 'Start a live class to host a real-time video session with your students.'
                    : 'Your teacher hasn\'t started a live class yet. Check back later!'}
                </p>
                {isTeacher && (
                  <button
                    onClick={() => setShowStartLive(true)}
                    className="btn-primary inline-flex"
                  >
                    <FaVideo className="text-xs" />
                    <span>Start Live Class</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create or Edit Assignment Modal */}
      {(showCreateAssignment || editingAssignment) && (
        <AssignmentModal
          classroomId={id}
          assignment={editingAssignment}
          sections={sections}
          onClose={() => {
            setShowCreateAssignment(false)
            setEditingAssignment(null)
          }}
          onSuccess={fetchClassroomData}
        />
      )}

      {/* Upload or Edit Material Modal */}
      {(showUploadMaterial || editingMaterial) && (
        <MaterialModal
          classroomId={id}
          material={editingMaterial}
          onClose={() => {
            setShowUploadMaterial(false)
            setEditingMaterial(null)
          }}
          onSuccess={fetchClassroomData}
        />
      )}

      {/* Delete Material Confirmation Modal */}
      {materialToDelete && (
        <DeleteConfirmModal
          material={materialToDelete}
          onClose={() => setMaterialToDelete(null)}
          onConfirm={() => {
            handleDeleteMaterial(materialToDelete.id)
            setMaterialToDelete(null)
          }}
        />
      )}

      {/* Expanded Notes Modal */}
      {expandedNotes && (
        <NotesModal
          title={expandedNotes.title}
          content={expandedNotes.content}
          onClose={() => setExpandedNotes(null)}
        />
      )}

      {/* Remove Student from Section Confirmation Modal */}
      {removeConfirm && (
        <div className="modal-overlay">
          <div className="modal-content max-w-sm p-0 overflow-hidden animate-scale-in">
            <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #6366f1, #ec4899, #f59e0b)' }} />
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                <FaTimes className="text-xl" />
              </div>
              <h3 className="text-lg font-bold text-surface-900 mb-2">Remove from Section?</h3>
              <p className="text-surface-500 text-sm leading-relaxed">
                Are you sure you want to remove{' '}
                <span className="font-semibold text-surface-800">{removeConfirm.student.fullName}</span>{' '}
                from this section? They will remain enrolled in the classroom.
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setRemoveConfirm(null)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleAssignStudents(removeConfirm.sectionId, removeConfirm.updatedIds)
                    setRemoveConfirm(null)
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <FaTimes className="text-xs" />
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Section Modal */}
      {showCreateSection && (
        <SectionModal
          classroomId={id}
          onClose={() => setShowCreateSection(false)}
          onSuccess={() => {
            fetchSections()
            setShowCreateSection(false)
          }}
        />
      )}

      {/* Start Live Class Modal */}
      {showStartLive && (
        <div className="modal-overlay">
          <div className="modal-content max-w-sm p-6 animate-scale-in">
            <h2 className="text-xl font-bold text-surface-900 mb-4 flex items-center gap-2">
              <FaVideo className="text-red-500" />
              Start Live Class
            </h2>
            <div className="mb-4">
              <label className="input-label" htmlFor="live-title">Session Title</label>
              <input
                id="live-title"
                type="text"
                value={liveTitle}
                onChange={(e) => setLiveTitle(e.target.value)}
                className="input"
                placeholder="e.g. Chapter 5 Review Session"
              />
            </div>
            {sections.length > 0 && (
              <div className="mb-6">
                <label className="input-label" htmlFor="live-section">Target Section (Optional)</label>
                <select
                  id="live-section"
                  value={liveSectionId}
                  onChange={(e) => setLiveSectionId(e.target.value)}
                  className="input"
                >
                  <option value="">Entire Classroom (Everyone)</option>
                  {sections.map(sec => (
                    <option key={sec.id} value={sec.id}>{sec.name}</option>
                  ))}
                </select>
                <p className="text-xs text-surface-400 mt-1">Leave empty to allow all students to join.</p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowStartLive(false)}
                className="btn-secondary flex-1"
                disabled={liveLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleStartLive}
                disabled={liveLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <FaCircle className="text-[8px] animate-pulse" />
                <span>{liveLoading ? 'Starting...' : 'Go Live'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Users Modal */}
      {showInviteModal.isOpen && (
        <InviteUsersModal
          classroomId={id}
          role={showInviteModal.role}
          onClose={() => setShowInviteModal({ isOpen: false, role: null })}
          onSuccess={fetchClassroomData}
        />
      )}
    </div>
  )
}

function NotesModal({ title, content, onClose }) {
  const [speaking, setSpeaking] = useState(false)
  const [paused, setPaused] = useState(false)

  // Helper to remove markdown symbols so the speech synthesis reads it naturally
  const cleanTextForSpeech = (text) => {
    if (!text) return ''
    return text
      .replace(/#+\s?/g, '')               // Remove headers like '### '
      .replace(/[*_~`=>]/g, '')            // Remove bold/italics/strikethrough/equals signs
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')  // Convert links [text](url) into just "text"
      .replace(/(^|\n)[-+]\s/g, ' ')       // Remove list bullets
      .replace(/\s+/g, ' ')                // Replace multiple spaces/newlines with a single space
      .trim()
  }

  const handleListen = () => {
    if (!window.speechSynthesis) return
    if (paused) {
      window.speechSynthesis.resume()
      setSpeaking(true)
      setPaused(false)
      return
    }
    window.speechSynthesis.cancel()
    
    const cleanContent = cleanTextForSpeech(content)
    const utterance = new SpeechSynthesisUtterance(cleanContent)
    utterance.rate = 0.95
    utterance.pitch = 1
    utterance.onstart  = () => { setSpeaking(true); setPaused(false) }
    utterance.onend    = () => { setSpeaking(false); setPaused(false) }
    utterance.onerror  = () => { setSpeaking(false); setPaused(false) }
    utterance.onpause  = () => { setSpeaking(false); setPaused(true) }
    utterance.onresume = () => { setSpeaking(true); setPaused(false) }
    window.speechSynthesis.speak(utterance)
  }

  const handlePause = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause()
      setSpeaking(false)
      setPaused(true)
    }
  }

  const handleStop = () => {
    window.speechSynthesis.cancel()
    setSpeaking(false)
    setPaused(false)
  }

  // Stop TTS when modal is closed
  const handleClose = () => {
    window.speechSynthesis.cancel()
    setSpeaking(false)
    setPaused(false)
    onClose()
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b border-surface-100 dark:border-surface-700">
          <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2 truncate pr-4">
            <FaRobot className="text-primary-600 dark:text-primary-500 flex-shrink-0" />
            <span className="truncate">AI Notes: {title}</span>
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-surface-400 dark:text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 hover:text-surface-600 dark:hover:text-surface-300 transition flex-shrink-0"
          >
            <FaTimes />
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scroll flex-1 bg-white dark:bg-surface-800">
          <div className="prose max-w-none prose-sm prose-slate dark:prose-invert text-surface-700 dark:text-surface-300">
            <ReactMarkdown>
              {content}
            </ReactMarkdown>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-surface-100 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 flex items-center justify-between gap-3">
          {/* TTS Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleListen}
              title={speaking ? 'Speaking…' : paused ? 'Resume' : 'Listen to summary'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                speaking
                  ? 'bg-primary-100 text-primary-700 cursor-default'
                  : 'bg-primary-50 text-primary-700 hover:bg-primary-100'
              }`}
            >
              {speaking ? (
                <>
                  <span className="w-3 h-3 rounded-full bg-primary-600 animate-pulse flex-shrink-0" />
                  <span>Listening…</span>
                </>
              ) : (
                <>
                  <FaVolumeUp />
                  <span>{paused ? 'Resume' : 'Listen'}</span>
                </>
              )}
            </button>

            {speaking && (
              <button
                onClick={handlePause}
                title="Pause"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all"
              >
                <FaPause className="text-xs" />
                <span>Pause</span>
              </button>
            )}

            {(speaking || paused) && (
              <button
                onClick={handleStop}
                title="Stop"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-all"
              >
                <FaStop className="text-xs" />
                <span>Stop</span>
              </button>
            )}
          </div>

          <button onClick={handleClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  )
}

function AssignmentModal({ classroomId, onClose, onSuccess, assignment, sections }) {
  const [formData, setFormData] = useState({
    title: assignment?.title || '',
    description: assignment?.description || '',
    deadline: assignment?.deadline ? assignment.deadline.substring(0, 16) : '',
    maxPoints: assignment?.maxPoints || 100,
    sectionId: assignment?.sectionId || ''
  })
  const [attachmentFile, setAttachmentFile] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (attachmentFile) {
      if (attachmentFile.size > 50 * 1024 * 1024) {
        setError('File size must be less than 50MB')
        setLoading(false)
        return
      }
      
      const fileName = attachmentFile.name.toLowerCase();
      if (!(fileName.endsWith('.pdf') || fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.zip'))) {
        setError('Invalid file type. Only PDF, PNG, JPG, and ZIP are allowed.')
        setLoading(false)
        return
      }
    }

    try {
      // Always use FormData so the backend @ModelAttribute can bind fields
      // and the optional file can be included in the same multipart request
      const fd = new FormData()
      fd.append('title', formData.title)
      fd.append('description', formData.description)
      fd.append('deadline', formData.deadline)
      fd.append('maxPoints', formData.maxPoints)
      if (formData.sectionId) {
        fd.append('sectionId', formData.sectionId)
      }
      if (attachmentFile) {
        fd.append('file', attachmentFile)
      }

      if (assignment) {
        await updateAssignment(assignment.id, fd)
      } else {
        await createAssignment(classroomId, fd)
      }
      onSuccess()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${assignment ? 'save' : 'create'} assignment`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-lg">
        <div className="flex justify-between items-center px-6 py-4 border-b border-surface-100">
          <h2 className="text-xl font-bold text-surface-900">{assignment ? 'Edit Assignment' : 'Create Assignment'}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-600 transition"
          >
            <FaTimes />
          </button>
        </div>
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-3 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="input-label" htmlFor="asgn-title">Title</label>
            <input
              id="asgn-title"
              type="text"
              required
              value={formData.title ?? ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input"
              placeholder="e.g. Midterm Lab Report"
            />
          </div>
          <div>
            <label className="input-label" htmlFor="asgn-desc">Instructions</label>
            <textarea
              id="asgn-desc"
              required
              value={formData.description ?? ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input min-h-[100px]"
              placeholder="Provide clear steps, submission guidelines, or rubrics..."
              rows="3"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label" htmlFor="asgn-deadline">Due Date &amp; Time</label>
              <input
                id="asgn-deadline"
                type="datetime-local"
                required
                value={formData.deadline ?? ''}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="input-label" htmlFor="asgn-points">Max Score</label>
              <input
                id="asgn-points"
                type="number"
                required
                value={formData.maxPoints ?? ''}
                onChange={(e) => setFormData({ ...formData, maxPoints: parseInt(e.target.value) })}
                className="input"
                min={1}
              />
            </div>
          </div>

          {sections && sections.length > 0 && (
            <div>
              <label className="input-label" htmlFor="asgn-section">Target Section (Optional)</label>
              <select
                id="asgn-section"
                value={formData.sectionId}
                onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                className="input"
              >
                <option value="">Entire Classroom (Everyone)</option>
                {sections.map(sec => (
                  <option key={sec.id} value={sec.id}>{sec.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-surface-400 mt-1 leading-relaxed">
                Leave empty to assign to all students in the classroom.
              </p>
            </div>
          )}

          {/* Attachment Upload */}
          <div>
            <label className="input-label" htmlFor="asgn-attachment">Attachment (Optional)</label>
            {assignment?.attachmentName && !attachmentFile && (
              <div className="flex items-center gap-2 mb-2 p-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm">
                <FaDownload className="text-surface-400 text-xs flex-shrink-0" />
                <span className="text-surface-600 font-medium truncate">{assignment.attachmentName}</span>
                <span className="text-surface-400 text-xs ml-auto">(current)</span>
              </div>
            )}
            <input
              id="asgn-attachment"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.zip"
              onChange={(e) => setAttachmentFile(e.target.files[0] || null)}
              className="input text-sm py-2 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100 cursor-pointer"
            />
            {attachmentFile && (
              <p className="text-[11px] text-emerald-600 font-semibold mt-1.5">
                ✓ New file selected: {attachmentFile.name}
              </p>
            )}
            <p className="text-[10px] text-surface-400 mt-1 leading-relaxed">
              {assignment?.attachmentName
                ? 'Upload a new file to replace the existing attachment (max 50MB).'
                : 'Attach a PDF, PNG, JPG, or ZIP reference file for students (max 50MB).'}
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-surface-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading}
            >
              {loading ? (assignment ? 'Saving...' : 'Creating...') : (assignment ? 'Save Changes' : 'Create Assignment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MaterialModal({ classroomId, onClose, onSuccess, material }) {
  const [type, setType] = useState(material?.type || 'FILE')
  const [formData, setFormData] = useState({
    title: material?.title || '',
    description: material?.description || '',
    youtubeUrl: material?.youtubeUrl || ''
  })
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setUploading(true)
    setError('')

    if (type === 'FILE' && file) {
      if (file.size > 50 * 1024 * 1024) {
        setError('File size must be less than 50MB')
        setUploading(false)
        return
      }
      
      const fileName = file.name.toLowerCase();
      if (!(fileName.endsWith('.pdf') || fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.zip'))) {
        setError('Invalid file type. Only PDF, PNG, JPG, and ZIP are allowed.')
        setUploading(false)
        return
      }
    }

    try {
      if (material) {
        const updateData = {
          title: formData.title,
          description: formData.description,
          type: material.type,
          youtubeUrl: material.type === 'YOUTUBE_VIDEO' ? formData.youtubeUrl : undefined
        }
        await updateMaterial(material.id, updateData)
      } else {
        const data = new FormData()
        data.append('title', formData.title)
        data.append('description', formData.description)
        data.append('type', type)
        if (type === 'YOUTUBE_VIDEO') {
          data.append('youtubeUrl', formData.youtubeUrl)
        } else if (file) {
          data.append('file', file)
        }
        await uploadMaterial(classroomId, data)
      }

      onClose()
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${material ? 'save' : 'upload'} material`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-lg">
        <div className="flex justify-between items-center px-6 py-4 border-b border-surface-100">
          <h2 className="text-xl font-bold text-surface-900">
            {material ? 'Edit Study Material' : 'Upload Study Material'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-600 transition"
            disabled={uploading}
          >
            <FaTimes />
          </button>
        </div>
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-3 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!material && (
            <div>
              <label className="input-label" htmlFor="mat-type">Resource Type</label>
              <select
                id="mat-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="input appearance-none"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
              >
                <option value="FILE">Local File Upload</option>
                <option value="YOUTUBE_VIDEO">YouTube Video URL</option>
              </select>
            </div>
          )}
          <div>
            <label className="input-label" htmlFor="mat-title">Title</label>
            <input
              id="mat-title"
              type="text"
              required
              value={formData.title ?? ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input"
              placeholder="e.g. Chapter 3: Data Structures"
            />
          </div>
          <div>
            <label className="input-label" htmlFor="mat-desc">Description</label>
            <textarea
              id="mat-desc"
              value={formData.description ?? ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input min-h-[80px]"
              placeholder="Short summary or reading instructions..."
              rows="2"
            />
          </div>
          {type === 'YOUTUBE_VIDEO' ? (
            <div>
              <label className="input-label" htmlFor="mat-url">YouTube URL</label>
              <input
                id="mat-url"
                type="url"
                required
                value={formData.youtubeUrl ?? ''}
                onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                className="input animate-fade-in"
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <p className="text-[11px] text-surface-400 mt-1.5 leading-relaxed">
                Video will list instantly. Our AI system will extract the transcript and summarize notes in the background.
              </p>
            </div>
          ) : (
            !material && (
              <div>
                <label className="input-label" htmlFor="mat-file">File</label>
                <input
                  id="mat-file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.zip"
                  required
                  onChange={(e) => setFile(e.target.files[0])}
                  className="input cursor-pointer py-2.5 animate-fade-in"
                />
                <p className="text-[10px] text-surface-400 mt-1 leading-relaxed">
                  Accepted formats: PDF, PNG, JPG, ZIP (max 50MB)
                </p>
              </div>
            )
          )}
          <div className="flex gap-3 pt-4 border-t border-surface-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="btn-primary flex-1"
            >
              {uploading ? (material ? 'Saving...' : 'Uploading...') : (material ? 'Save Changes' : 'Upload Resource')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteConfirmModal({ material, onClose, onConfirm }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-sm p-6 text-center animate-scale-in">
        <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
          <FaTrash className="text-2xl" />
        </div>
        <h3 className="text-lg font-bold text-surface-900 mb-2">Delete Study Material</h3>
        <p className="text-surface-500 text-sm mb-6 leading-relaxed">
          Are you sure you want to delete <span className="font-semibold text-surface-800">"{material.title}"</span>? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn-danger flex-1 bg-red-600 hover:bg-red-700 text-white border-transparent hover:text-white"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function InviteUsersModal({ classroomId, role, onClose, onSuccess }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }
    const delayDebounce = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await searchUsers(searchQuery, role)
        // Filter out users already selected or already in classroom
        const filtered = res.data.filter(u => !selectedUsers.some(su => su.email === u.email))
        setSearchResults(filtered)
      } catch (err) {
        console.error('Error searching users', err)
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => clearTimeout(delayDebounce)
  }, [searchQuery, role, selectedUsers])

  const handleSelectUser = (user) => {
    setSelectedUsers([...selectedUsers, user])
    setSearchQuery('')
    setSearchResults([])
  }

  const handleRemoveUser = (email) => {
    setSelectedUsers(selectedUsers.filter(u => u.email !== email))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedUsers.length === 0) return

    setLoading(true)
    setError('')
    try {
      const emails = selectedUsers.map(u => u.email)
      await inviteUsersBulk(classroomId, emails, role)
      setSuccess(`Successfully added ${emails.length} user(s)!`)
      onSuccess()
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to invite users. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-lg">
        <div className="flex justify-between items-center px-6 py-4 border-b border-surface-100">
          <h2 className="text-xl font-bold text-surface-900 flex items-center gap-2">
            <FaUserPlus className="text-primary-600" />
            Add {role === 'TEACHER' ? 'Teachers' : 'Students'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-600 transition"
            disabled={loading}
          >
            <FaTimes />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 px-4 py-3 text-sm animate-fade-in">
              {success}
            </div>
          )}

          <div>
            <label className="input-label" htmlFor="user-search">
              Search & Select Users
            </label>
            <div className="relative">
              <input
                id="user-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input"
                placeholder="Type name or email..."
                disabled={loading || success}
                autoComplete="off"
              />
              {searching && (
                <div className="absolute right-3 top-2.5 w-5 h-5 border-2 border-surface-200 border-t-primary-600 rounded-full animate-spin" />
              )}
              {searchResults.length > 0 && (
                <ul className="absolute z-50 w-full bg-white border border-surface-200 mt-1 rounded-xl shadow-elevated max-h-48 overflow-y-auto">
                  {searchResults.map(user => (
                    <li 
                      key={user.id} 
                      onClick={() => handleSelectUser(user)} 
                      className="px-4 py-2 hover:bg-surface-50 cursor-pointer flex flex-col border-b border-surface-100 last:border-0"
                    >
                      <span className="text-sm font-bold text-surface-900">{user.fullName}</span>
                      <span className="text-xs text-surface-500">{user.email}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            {/* Selected Chips */}
            {selectedUsers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedUsers.map(user => (
                  <div key={user.email} className="flex items-center gap-1.5 bg-primary-50 text-primary-700 px-3 py-1.5 rounded-full border border-primary-100 text-sm font-semibold animate-fade-in">
                    <span>{user.fullName}</span>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveUser(user.email)} 
                      className="text-primary-500 hover:text-primary-800 transition p-0.5 rounded-full hover:bg-primary-200"
                    >
                      <FaTimes className="text-[10px]" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <p className="text-[11px] text-surface-400 mt-2 leading-relaxed">
              Search by name or email to find registered users and add them to the classroom.
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-surface-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={loading || success}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success || selectedUsers.length === 0}
              className="btn-primary flex-1"
            >
              {loading ? 'Adding...' : success ? 'Added!' : `Add ${selectedUsers.length > 0 ? selectedUsers.length : ''} ${role === 'TEACHER' ? 'Teachers' : 'Students'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


export default ClassroomDetail

function SectionModal({ classroomId, onClose, onSuccess }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      await createSection(classroomId, name.trim())
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create section')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-sm animate-scale-in">
        <div className="flex justify-between items-center px-6 py-4 border-b border-surface-100">
          <h2 className="text-xl font-bold text-surface-900 flex items-center gap-2">
            <FaLayerGroup className="text-violet-500" />
            Create Section
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-600 transition"
          >
            <FaTimes />
          </button>
        </div>
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-3 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="input-label" htmlFor="section-name">Section Name</label>
            <input
              id="section-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="e.g. Group A, Lab Section 1"
              autoFocus
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="btn-primary flex-1"
            >
              {loading ? 'Creating...' : 'Create Section'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SectionStudentAdder({ unassignedStudents, currentStudentIds, onAdd }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs font-bold bg-violet-50 text-violet-700 px-3 py-1.5 rounded-lg hover:bg-violet-100 transition-colors"
      >
        <FaPlus className="text-[10px]" />
        <span>Add Student</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 left-0 bottom-full mb-2 w-64 max-h-48 overflow-y-auto bg-white border border-surface-200 rounded-xl shadow-elevated py-1 animate-scale-in origin-bottom-left">
            {unassignedStudents.map((student) => (
              <button
                key={student.id}
                onClick={() => {
                  onAdd(student.id)
                  setIsOpen(false)
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-surface-50 flex items-center gap-3 border-b border-surface-50 last:border-0 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-surface-100 text-surface-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {student.fullName?.charAt(0)?.toUpperCase() || 'S'}
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-surface-800 block truncate">{student.fullName}</span>
                  <span className="text-xs text-surface-500 block truncate">{student.email}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  getTeacherClassrooms, 
  getStudentClassrooms, 
  getClassroomAssignments,
  getSections,
  createClassroom,
  joinByCode,
  getTelemetryDashboard
} from '../services/api'
import { FaPlus, FaUsers, FaBook, FaSignInAlt, FaFolderOpen, FaTimes, FaHashtag, FaChartLine, FaCheckCircle, FaVideo, FaFileAlt, FaClock, FaSync, FaExclamationTriangle } from 'react-icons/fa'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import { formatDistanceToNow, format, isPast, differenceInHours } from 'date-fns'

const POLL_INTERVAL_MS = 30_000 // 30 seconds

function Dashboard() {
  const { user } = useAuth()
  const [classrooms, setClassrooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [newClassroom, setNewClassroom] = useState({ name: '', description: '' })
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')

  const [telemetry, setTelemetry] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0)

  // Student: upcoming deadlines across all classrooms
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([])
  const [deadlinesLoading, setDeadlinesLoading] = useState(false)

  const pollTimerRef = useRef(null)
  const tickTimerRef = useRef(null)

  const fetchTelemetry = useCallback(async () => {
    try {
      const telemetryRes = await getTelemetryDashboard()
      setTelemetry(telemetryRes.data)
      setLastUpdated(new Date())
      setSecondsSinceUpdate(0)
    } catch (err) {
      console.error('Error refreshing telemetry:', err)
    }
  }, [])

  const fetchData = useCallback(async () => {
    try {
      if (user?.role === 'TEACHER') {
        const [classroomsRes, telemetryRes] = await Promise.all([
          getTeacherClassrooms(),
          getTelemetryDashboard()
        ])
        setClassrooms(classroomsRes.data)
        setTelemetry(telemetryRes.data)
        setLastUpdated(new Date())
        setSecondsSinceUpdate(0)
      } else {
        const response = await getStudentClassrooms()
        setClassrooms(response.data)
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  const fetchUpcomingDeadlines = useCallback(async (classList) => {
    if (!classList || classList.length === 0) return
    setDeadlinesLoading(true)
    try {
      const assignmentPromises = classList.map(c => getClassroomAssignments(c.id))
      const sectionPromises = classList.map(c => getSections(c.id))
      
      const [assignmentResults, sectionResults] = await Promise.all([
        Promise.allSettled(assignmentPromises),
        Promise.allSettled(sectionPromises)
      ])

      const now = new Date()
      const deadlines = []

      assignmentResults.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          const classroomName = classList[idx].name
          
          let mySectionIds = []
          if (sectionResults[idx].status === 'fulfilled') {
            const sections = sectionResults[idx].value.data
            mySectionIds = sections.filter(sec => sec.studentIds?.includes(user?.id)).map(sec => sec.id)
          }

          res.value.data.forEach(a => {
            // Apply section filtering: must have no section, or be in a section the student is in
            if (!a.sectionId || mySectionIds.includes(a.sectionId)) {
              if (a.deadline && !isPast(new Date(a.deadline))) {
                deadlines.push({
                  id: a.id,
                  title: a.title,
                  classroomId: classList[idx].id,
                  classroomName,
                  deadline: new Date(a.deadline),
                  hoursLeft: differenceInHours(new Date(a.deadline), now)
                })
              }
            }
          })
        }
      })
      deadlines.sort((a, b) => a.deadline - b.deadline)
      setUpcomingDeadlines(deadlines.slice(0, 5))
    } catch (err) {
      console.error('Error fetching deadlines:', err)
    } finally {
      setDeadlinesLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Fetch deadlines once classrooms are loaded (student only)
  useEffect(() => {
    if (user?.role !== 'TEACHER' && classrooms.length > 0) {
      fetchUpcomingDeadlines(classrooms)
    }
  }, [classrooms, user, fetchUpcomingDeadlines])

  // Poll telemetry every 30s (teacher only)
  useEffect(() => {
    if (user?.role !== 'TEACHER') return
    pollTimerRef.current = setInterval(fetchTelemetry, POLL_INTERVAL_MS)
    return () => clearInterval(pollTimerRef.current)
  }, [user, fetchTelemetry])

  // Tick seconds counter for "updated X seconds ago"
  useEffect(() => {
    if (user?.role !== 'TEACHER') return
    tickTimerRef.current = setInterval(() => {
      setSecondsSinceUpdate(s => s + 1)
    }, 1000)
    return () => clearInterval(tickTimerRef.current)
  }, [user])

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

  const handleJoinClassroom = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await joinByCode(joinCode)
      setShowJoinModal(false)
      setJoinCode('')
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join classroom')
    }
  }

  // Flat solid colors for classroom card headers
  const cardColors = [
    'bg-teal-600',
    'bg-indigo-600',
    'bg-emerald-600',
    'bg-rose-600',
    'bg-sky-600',
    'bg-amber-600',
  ]

  const materialDistributionColors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981'];
  const completionColors = ['#10b981', '#f59e0b', '#ef4444'];
  
  const getMaterialData = () => {
    if (!telemetry?.materialDistribution) return [];
    return telemetry.materialDistribution.map((item, index) => ({
      ...item,
      color: materialDistributionColors[index % materialDistributionColors.length]
    }));
  };

  const getCompletionData = () => {
    if (!telemetry?.assignmentCompletion) return [];
    return telemetry.assignmentCompletion.map((item, index) => ({
      ...item,
      color: completionColors[index % completionColors.length]
    }));
  };

  const materialDistribution = getMaterialData();
  const completionStatus = getCompletionData();
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
      {/* Welcome Banner */}
      <div className="bg-surface-800 rounded-xl p-5 sm:p-7 text-white mb-7">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Hello, {user?.fullName || 'Educator'}!
            </h1>
            <p className="text-surface-300 mt-1 text-sm max-w-xl">
              {user?.role === 'TEACHER' 
                ? 'Manage your classrooms, upload resources, and generate AI-powered notes.' 
                : 'Access study materials, view announcements, and submit assignments.'}
            </p>
          </div>
          <div className="flex-shrink-0">
            {user?.role === 'TEACHER' ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-surface-800 font-semibold text-sm rounded-lg hover:bg-surface-50 active:scale-[0.98] transition-all"
              >
                <FaPlus className="text-xs" />
                Create Classroom
              </button>
            ) : (
              <button
                onClick={() => setShowJoinModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-surface-800 font-semibold text-sm rounded-lg hover:bg-surface-50 active:scale-[0.98] transition-all"
              >
                <FaSignInAlt className="text-xs" />
                Join Classroom
              </button>
            )}
          </div>
        </div>
      </div>

      {user?.role === 'TEACHER' ? (
        <>
          {/* Telemetry Analytics Dashboard for Teachers */}
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-surface-900">
                Telemetry Dashboard
              </h2>
              <p className="text-xs text-surface-500 mt-0.5">
                xAPI Learning Records Analysis
              </p>
            </div>
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-surface-400 bg-surface-50 border border-surface-200 rounded-full px-3 py-1">
                  <FaSync className={`text-[10px] ${secondsSinceUpdate < 3 ? 'animate-spin text-emerald-500' : 'text-surface-400'}`} />
                  Updated {secondsSinceUpdate}s ago
                </span>
              )}
              <button
                onClick={fetchTelemetry}
                title="Refresh now"
                className="p-2 rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-600 transition-colors"
              >
                <FaSync className="text-xs" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-slide-up mb-6">
            <div className="bg-white rounded-xl border border-surface-200 p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-xl">
                <FaChartLine />
              </div>
              <div>
                <p className="text-surface-500 text-xs font-semibold uppercase tracking-wider">Total Interactions</p>
                <p className="text-2xl font-bold text-surface-900">{telemetry?.totalInteractions || 0}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-surface-200 p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-xl">
                <FaCheckCircle />
              </div>
              <div>
                <p className="text-surface-500 text-xs font-semibold uppercase tracking-wider">Total Submissions</p>
                <p className="text-2xl font-bold text-surface-900">{telemetry?.totalSubmissions || 0}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-surface-200 p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-lg flex items-center justify-center text-xl">
                <FaVideo />
              </div>
              <div>
                <p className="text-surface-500 text-xs font-semibold uppercase tracking-wider">Active Students</p>
                <p className="text-2xl font-bold text-surface-900">{telemetry?.activeStudents || 0}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up">
            {/* Activity Chart */}
            <div className="bg-white rounded-xl border border-surface-200 p-6">
              <h3 className="text-sm font-bold text-surface-900 mb-6">Weekly Activity Timeline</h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={telemetry?.activityData || []}>
                    <defs>
                      <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorLive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                    <Area 
                      type="monotone" 
                      dataKey="Submissions" 
                      stroke="#6366f1" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorViews)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="Live Attendees" 
                      stroke="#ec4899" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorLive)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Distribution Charts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-surface-200 p-6 flex flex-col items-center">
                <h3 className="text-sm font-bold text-surface-900 mb-4 self-start">Material Distribution</h3>
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={materialDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {materialDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full mt-2 space-y-2">
                  {materialDistribution.map(item => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-surface-600">{item.name}</span>
                      </div>
                      <span className="font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-surface-200 p-6 flex flex-col items-center">
                <h3 className="text-sm font-bold text-surface-900 mb-4 self-start">Assignment Status</h3>
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={completionStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {completionStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full mt-2 space-y-2">
                  {completionStatus.map(item => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-surface-600">{item.name}</span>
                      </div>
                      <span className="font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Upcoming Deadlines Panel */}
          {classrooms.length > 0 && (
            <div className="mb-7">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
                    <FaClock className="text-amber-500 text-base" />
                    Upcoming Deadlines
                  </h2>
                  <p className="text-xs text-surface-500 mt-0.5">Your next due assignments across all classrooms</p>
                </div>
              </div>

              {deadlinesLoading ? (
                <div className="flex items-center gap-2 text-surface-400 text-sm py-4">
                  <div className="w-4 h-4 border-2 border-surface-200 border-t-primary-500 rounded-full animate-spin" />
                  Loading deadlines…
                </div>
              ) : upcomingDeadlines.length === 0 ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-5 py-4 flex items-center gap-3">
                  <FaCheckCircle className="text-emerald-500 text-lg flex-shrink-0" />
                  <p className="text-sm text-emerald-700 font-medium">You're all caught up — no upcoming deadlines!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-slide-up">
                  {upcomingDeadlines.map(item => {
                    const isUrgent = item.hoursLeft <= 24
                    const isVeryUrgent = item.hoursLeft <= 6
                    return (
                      <Link
                        key={item.id}
                        to={`/assignment/${item.id}`}
                        className={`group relative flex flex-col gap-2 rounded-xl border p-4 hover:-translate-y-0.5 transition-all duration-200 ${
                          isVeryUrgent
                            ? 'bg-red-50 border-red-200 hover:shadow-md'
                            : isUrgent
                            ? 'bg-amber-50 border-amber-200 hover:shadow-md'
                            : 'bg-white border-surface-200 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-bold line-clamp-2 leading-snug ${
                            isVeryUrgent ? 'text-red-800' : isUrgent ? 'text-amber-800' : 'text-surface-900'
                          }`}>
                            {item.title}
                          </p>
                          {isVeryUrgent && (
                            <FaExclamationTriangle className="text-red-500 text-sm flex-shrink-0 mt-0.5" />
                          )}
                        </div>

                        <p className={`text-[11px] font-medium ${
                          isVeryUrgent ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-surface-500'
                        }`}>
                          {item.classroomName}
                        </p>

                        <div className={`mt-1 pt-2.5 border-t flex items-center gap-1.5 ${
                          isVeryUrgent ? 'border-red-200' : isUrgent ? 'border-amber-200' : 'border-surface-100'
                        }`}>
                          <FaClock className={`text-[10px] ${
                            isVeryUrgent ? 'text-red-500' : isUrgent ? 'text-amber-500' : 'text-surface-400'
                          }`} />
                          <span className={`text-[11px] font-semibold ${
                            isVeryUrgent ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-surface-500'
                          }`}>
                            Due {formatDistanceToNow(item.deadline, { addSuffix: true })}
                          </span>
                          <span className="text-[10px] text-surface-400 ml-auto">
                            {format(item.deadline, 'MMM d, h:mm a')}
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Section Header for Students */}
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-surface-900">
                Enrolled Classrooms
              </h2>
              <p className="text-xs text-surface-500 mt-0.5">
                {classrooms.length} active {classrooms.length === 1 ? 'classroom' : 'classrooms'}
              </p>
            </div>
          </div>

          {classrooms.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-surface-200 animate-slide-up">
              <div className="w-14 h-14 bg-surface-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FaFolderOpen className="text-2xl text-surface-400" />
              </div>
              <h3 className="text-lg font-bold text-surface-900 mb-1">No classrooms found</h3>
              <p className="text-surface-500 max-w-sm mx-auto mb-5 text-sm">
                Ask your teacher for a class code to join.
              </p>
              <button onClick={() => setShowJoinModal(true)} className="btn-primary">
                <FaSignInAlt /> Join a Classroom
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-slide-up">
              {classrooms.map((classroom, index) => {
                const color = cardColors[index % cardColors.length]
                return (
                  <div 
                    key={classroom.id}
                    className="group relative flex flex-col bg-white rounded-xl border border-surface-200 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                  >
                    {/* Flat Color Header */}
                    <div className={`h-24 ${color} p-4 relative flex flex-col justify-end`}>
                      <div className="absolute top-3 right-3 w-7 h-7 bg-white/15 rounded-md flex items-center justify-center">
                        <FaBook className="text-white/80 text-xs" />
                      </div>
                      <h3 className="text-base font-bold text-white line-clamp-1">
                        {classroom.name}
                      </h3>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <p className="text-surface-500 text-sm line-clamp-2 mb-4">
                        {classroom.description || 'No description provided.'}
                      </p>

                      <div className="flex items-center justify-between pt-3 border-t border-surface-100 mt-auto">
                        <div className="flex items-center text-xs font-medium text-surface-500">
                          <FaUsers className="mr-1.5 text-surface-400" />
                          {classroom.studentCount ?? 0} students
                        </div>

                        <span className="text-xs font-semibold text-primary-600 group-hover:text-primary-700 transition-colors">
                          Enter →
                        </span>
                      </div>
                    </div>

                    <Link 
                      to={`/classroom/${classroom.id}`}
                      className="absolute inset-0 z-10"
                      aria-label={`Go to ${classroom.name}`}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Create Classroom Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex justify-between items-center px-5 py-3.5 border-b border-surface-100">
              <h2 className="text-lg font-bold text-surface-900">Create New Classroom</h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded text-surface-400 hover:bg-surface-100 hover:text-surface-600 transition"
              >
                <FaTimes />
              </button>
            </div>
            {error && (
              <div className="bg-red-50 border-l-3 border-red-500 text-red-700 px-5 py-2.5 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleCreateClassroom} className="p-5 space-y-3.5">
              <div>
                <label className="input-label" htmlFor="class-name">Classroom Name</label>
                <input
                  id="class-name"
                  type="text"
                  required
                  value={newClassroom.name}
                  onChange={(e) => setNewClassroom({ ...newClassroom, name: e.target.value })}
                  className="input"
                  placeholder="e.g. Computer Science 101"
                />
              </div>
              <div>
                <label className="input-label" htmlFor="class-desc">Description</label>
                <textarea
                  id="class-desc"
                  value={newClassroom.description}
                  onChange={(e) => setNewClassroom({ ...newClassroom, description: e.target.value })}
                  className="input min-h-[80px]"
                  placeholder="Course syllabus or schedule..."
                  rows="3"
                />
              </div>
              <div className="flex gap-2.5 pt-1">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Classroom Modal */}
      {showJoinModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex justify-between items-center px-5 py-3.5 border-b border-surface-100">
              <h2 className="text-lg font-bold text-surface-900">Join Classroom</h2>
              <button 
                onClick={() => setShowJoinModal(false)}
                className="p-1 rounded text-surface-400 hover:bg-surface-100 hover:text-surface-600 transition"
              >
                <FaTimes />
              </button>
            </div>
            {error && (
              <div className="bg-red-50 border-l-3 border-red-500 text-red-700 px-5 py-2.5 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleJoinClassroom} className="p-5 space-y-3.5">
              <div>
                <label className="input-label" htmlFor="join-code">Class Code</label>
                <div className="relative">
                  <FaHashtag className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                  <input
                    id="join-code"
                    type="text"
                    required
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="input pl-9 font-mono uppercase tracking-wider"
                    placeholder="e.g. ABC123D4"
                    maxLength={12}
                  />
                </div>
                <p className="text-[11px] text-surface-400 mt-1">
                  Ask your teacher for the code.
                </p>
              </div>
              <div className="flex gap-2.5 pt-1">
                <button type="button" onClick={() => setShowJoinModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Join Class</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  getTeacherClassrooms, 
  getStudentClassrooms, 
  getClassroomAssignments 
} from '../services/api'
import { 
  FaCalendarAlt, 
  FaChevronLeft, 
  FaChevronRight, 
} from 'react-icons/fa'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  getDay, 
  isSameDay, 
  addMonths, 
  subMonths 
} from 'date-fns'

function Calendar() {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllAssignments()
  }, [user])

  const fetchAllAssignments = async () => {
    try {
      const classroomRes = user?.role === 'TEACHER'
        ? await getTeacherClassrooms()
        : await getStudentClassrooms()

      const classrooms = classroomRes.data
      
      const assignmentPromises = classrooms.map(async (classroom) => {
        try {
          const res = await getClassroomAssignments(classroom.id)
          return res.data.map(asgn => ({
            ...asgn,
            classroomName: classroom.name,
            classroomId: classroom.id
          }))
        } catch (err) {
          console.error(`Error fetching assignments for classroom ${classroom.id}:`, err)
          return []
        }
      })

      const allAssignmentsNested = await Promise.all(assignmentPromises)
      const allAssignments = allAssignmentsNested.flat()
      setAssignments(allAssignments)
    } catch (err) {
      console.error('Error fetching calendar assignments:', err)
    } finally {
      setLoading(false)
    }
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDayOfWeek = getDay(monthStart)

  const calendarDays = []
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(null)
  }
  calendarDays.push(...daysInMonth)

  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1))

  const getDayAssignments = (day) => {
    if (!day) return []
    return assignments.filter(asgn => isSameDay(new Date(asgn.deadline), day))
  }

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-primary-50 text-primary-700 px-2.5 py-0.5 rounded-md border border-primary-100">
            Planning & Deadlines
          </span>
          <h1 className="text-2xl font-bold tracking-tight mt-1.5 text-surface-900 flex items-center gap-2">
            <FaCalendarAlt className="text-primary-600" />
            Assignment Calendar
          </h1>
          <p className="text-sm text-surface-500 mt-0.5">
            Keep track of all assignment due dates across your classes.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white border border-surface-200 p-1 rounded-lg">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded hover:bg-surface-50 text-surface-500 hover:text-surface-800 transition"
          >
            <FaChevronLeft className="text-xs" />
          </button>
          <span className="text-sm font-bold text-surface-800 px-2 min-w-[110px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded hover:bg-surface-50 text-surface-500 hover:text-surface-800 transition"
          >
            <FaChevronRight className="text-xs" />
          </button>
        </div>
      </div>

      <div className="bg-white border border-surface-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-surface-200 bg-surface-50">
            {weekdays.map(day => (
              <div key={day} className="py-2.5 text-center text-[10px] font-bold text-surface-500 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 auto-rows-[100px] divide-x divide-y divide-surface-100">
            {calendarDays.map((day, idx) => {
              const dayAsgns = getDayAssignments(day)
              const isToday = day && isSameDay(day, new Date())

              return (
                <div 
                  key={idx} 
                  className={`p-2 flex flex-col justify-between hover:bg-surface-50/50 transition-colors ${
                    !day ? 'bg-surface-50/30' : ''
                  } ${isToday ? 'bg-primary-50/30' : ''}`}
                >
                  {day ? (
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[11px] font-bold w-5 h-5 rounded flex items-center justify-center ${
                        isToday 
                          ? 'bg-primary-600 text-white' 
                          : 'text-surface-700'
                      }`}>
                        {format(day, 'd')}
                      </span>
                      {dayAsgns.length > 0 && (
                        <span className="text-[9px] font-bold text-primary-700 bg-primary-100 px-1.5 py-0.5 rounded">
                          {dayAsgns.length} due
                        </span>
                      )}
                    </div>
                  ) : (
                    <div />
                  )}

                  <div className="flex-1 overflow-y-auto space-y-1 custom-scroll max-h-[70px]">
                    {dayAsgns.map(asgn => (
                      <Link
                        key={asgn.id}
                        to={`/assignment/${asgn.id}`}
                        className="block px-1.5 py-1 bg-white border border-surface-200 rounded text-[9px] hover:border-primary-400 transition-colors group"
                      >
                        <div className="font-semibold text-surface-800 line-clamp-1 group-hover:text-primary-600">
                          {asgn.title}
                        </div>
                        <div className="text-surface-400 truncate mt-0.5">
                          {asgn.classroomName}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
    </div>
  )
}

export default Calendar

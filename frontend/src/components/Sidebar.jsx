import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  FaThLarge, 
  FaCalendarAlt, 
  FaGraduationCap,
  FaChalkboardTeacher, 
  FaCog, 
  FaUserCircle
} from 'react-icons/fa'

function Sidebar({ onToggle }) {
  const { user } = useAuth()
  const location = useLocation()
  
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebar-expanded')
    return saved !== null ? JSON.parse(saved) : true
  })

  useEffect(() => {
    localStorage.setItem('sidebar-expanded', JSON.stringify(isExpanded))
    if (onToggle) {
      onToggle(isExpanded)
    }
  }, [isExpanded, onToggle])

  const isActive = (path) => location.pathname === path

  const isTeacher = user?.role === 'TEACHER'
  const isStudent = user?.role === 'STUDENT'

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <FaThLarge className="text-base" /> },
    { name: 'Calendar', path: '/calendar', icon: <FaCalendarAlt className="text-base" /> },
    ...(isStudent ? [{ name: 'Enrolled Classes', path: '/enrolled-classes', icon: <FaGraduationCap className="text-base" /> }] : []),
    ...(isTeacher ? [{ name: 'My Classes', path: '/my-classes', icon: <FaChalkboardTeacher className="text-base" /> }] : []),
    { name: 'Settings', path: '/settings', icon: <FaCog className="text-base" /> },
  ]

  return (
    <aside 
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-200 bg-white border-r border-surface-200 flex flex-col justify-between ${
        isExpanded ? 'w-56' : 'w-16'
      }`}
    >
      {/* Top Section */}
      <div>
        <div className="flex items-center h-14 border-b border-surface-100 justify-center">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-2 group w-full py-2 focus:outline-none transition-all ${
              isExpanded ? 'justify-start px-4' : 'justify-center'
            }`}
            title={isExpanded ? 'Collapse Menu' : 'Expand Menu'}
          >
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            {isExpanded && (
              <span className="text-sm font-bold text-surface-900 tracking-tight whitespace-nowrap animate-fade-in">
                Smart<span className="text-primary-600">Classroom</span>
              </span>
            )}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="p-2 space-y-0.5">
          {menuItems.map((item) => {
            const active = isActive(item.path)
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative group/item ${
                  active
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-surface-500 hover:bg-surface-50 hover:text-surface-700'
                }`}
                title={!isExpanded ? item.name : ''}
              >
                <div className={`flex-shrink-0 ${
                  active ? 'text-primary-600' : 'text-surface-400 group-hover/item:text-surface-600'
                }`}>
                  {item.icon}
                </div>
                
                {isExpanded && (
                  <span className="animate-fade-in whitespace-nowrap">{item.name}</span>
                )}

                {/* Active Indicator */}
                {active && (
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-primary-600 rounded-r" />
                )}

                {/* Tooltip for Collapsed View */}
                {!isExpanded && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-surface-800 text-white text-xs font-medium rounded-md opacity-0 invisible group-hover/item:opacity-100 group-hover/item:visible transition-all duration-150 whitespace-nowrap z-50">
                    {item.name}
                  </div>
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="border-t border-surface-100 p-2">
        {user && (
          <div className={`flex items-center gap-2.5 p-2 rounded-lg bg-surface-50 ${
            isExpanded ? 'justify-start' : 'justify-center'
          }`}>
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <FaUserCircle className="text-primary-600 text-lg" />
            </div>
            {isExpanded && (
              <div className="flex flex-col min-w-0 animate-fade-in">
                <span className="text-xs font-bold text-surface-800 leading-tight truncate">
                  {user.fullName}
                </span>
                <span className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">
                  {user.role}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}

export default Sidebar

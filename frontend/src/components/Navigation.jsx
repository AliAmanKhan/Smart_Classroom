import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FaHome, FaSignOutAlt, FaUserCircle } from 'react-icons/fa'

function Navigation() {
  const { user, logout } = useAuth()
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-surface-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-12">
          {/* Section Title */}
          <div className="flex items-center">
            <span className="text-xs font-bold text-surface-400 uppercase tracking-widest hidden md:inline">
              Smart Classroom Hub
            </span>
          </div>
          
          {/* Right side */}
          <div className="flex items-center gap-1.5">

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center">
                  <FaUserCircle className="text-primary-600 text-sm" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-surface-800 leading-tight">
                    {user?.fullName}
                  </span>
                  <span className="text-[10px] text-surface-400 font-medium uppercase tracking-wider">
                    {user?.role}
                  </span>
                </div>
              </div>
              
              <button
                onClick={logout}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium
                           text-red-500 hover:bg-red-50 hover:text-red-600
                           active:scale-[0.97] transition-all duration-150"
                title="Sign out"
              >
                <FaSignOutAlt className="text-sm" />
                <span className="hidden sm:inline text-xs">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation

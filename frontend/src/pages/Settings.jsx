import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useAccessibility } from '../context/AccessibilityContext'
import {
  FaCog, FaUser, FaUniversalAccess, FaFont, FaPalette, FaCheckCircle
} from 'react-icons/fa'
import { updateProfile } from '../services/api'

function Settings() {
  const { user, setUser } = useAuth()
  const { fontSize, setFontSize, theme, setTheme } = useAccessibility()
  const [activeSection, setActiveSection] = useState('profile')

  const [profileName, setProfileName] = useState(user?.fullName || '')
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' })
  const [notifPreferences, setNotifPreferences] = useState({
    emailAnnouncements: true,
    emailAssignments: true,
    emailGrades: false,
    smsReminders: false
  })

  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const showSuccess = (msg) => {
    setSuccessMsg(msg)
    setErrorMsg('')
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await updateProfile({ fullName: profileName })
      setUser(res.data)
      localStorage.setItem('user', JSON.stringify(res.data))
      showSuccess('Profile updated successfully!')
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = (e) => {
    e.preventDefault()
    if (passwordData.new !== passwordData.confirm) {
      setErrorMsg('New passwords do not match')
      return
    }
    setLoading(true)
    setErrorMsg('')
    setTimeout(() => {
      setLoading(false)
      showSuccess('Password changed successfully!')
      setPasswordData({ current: '', new: '', confirm: '' })
    }, 800)
  }

  const navItems = [
    { id: 'profile',       icon: <FaUser className="text-xs" />,            label: 'Profile Info' },
    // { id: 'notifications', icon: <FaBell className="text-xs" />,             label: 'Notifications' },
    // { id: 'security',      icon: <FaLock className="text-xs" />,             label: 'Security' },
    { id: 'accessibility', icon: <FaUniversalAccess className="text-xs" />,  label: 'Accessibility' },
  ]

  const fontOptions = [
    { value: 'small',  label: 'Small',  desc: 'Compact, shows more content' },
    { value: 'medium', label: 'Medium', desc: 'Default size, balanced layout' },
    { value: 'large',  label: 'Large',  desc: 'Larger text, easier to read' },
  ]

  const themeOptions = [
    {
      value: 'light',
      label: 'Light',
      desc: 'Clean white interface',
      preview: 'bg-white border-surface-300',
      dot: 'bg-surface-200',
    },
    {
      value: 'dark',
      label: 'Dark',
      desc: 'Reduced eye strain in low light',
      preview: 'bg-surface-800 border-surface-600',
      dot: 'bg-surface-500',
    },
    {
      value: 'high-contrast',
      label: 'High Contrast',
      desc: 'Maximum readability & accessibility',
      preview: 'bg-black border-white',
      dot: 'bg-yellow-400',
    },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
      <div className="mb-6">
        <span className="text-[10px] font-bold uppercase tracking-wider bg-primary-50 text-primary-700 px-2.5 py-0.5 rounded-md border border-primary-100">
          Account Configurations
        </span>
        <h1 className="text-2xl font-bold tracking-tight mt-1.5 text-surface-900 flex items-center gap-2">
          <FaCog className="text-primary-600" />
          Settings
        </h1>
        <p className="text-sm text-surface-500 mt-0.5">
          Customize profile, notifications, security, and accessibility options.
        </p>
      </div>

      {successMsg && (
        <div className="mb-5 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg flex items-center gap-2 text-sm font-medium">
          <FaCheckCircle className="text-emerald-500 text-base flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 text-sm font-medium">
          <span className="w-4 h-4 bg-red-200 text-red-700 rounded-full flex items-center justify-center font-bold text-[10px]">!</span>
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Nav */}
        <div className="md:col-span-1 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-md transition-colors ${
                activeSection === item.id
                  ? 'text-primary-700 bg-primary-50'
                  : 'text-surface-600 hover:bg-surface-100'
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="md:col-span-3 space-y-6">

          {/* ── Profile ── */}
          {activeSection === 'profile' && (
            <section className="bg-white border border-surface-200 rounded-xl p-5">
              <h2 className="text-base font-bold text-surface-900 mb-4 pb-2 border-b border-surface-100 flex items-center gap-2">
                <FaUser className="text-primary-600 text-sm" /> Profile Settings
              </h2>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="input-label">Email Address</label>
                  <input type="email" disabled value={user?.email || ''} className="input bg-surface-50 cursor-not-allowed text-surface-500" />
                </div>
                <div>
                  <label className="input-label">Role</label>
                  <input type="text" disabled value={user?.role || ''} className="input bg-surface-50 cursor-not-allowed text-surface-500 capitalize" />
                </div>
                <div>
                  <label className="input-label" htmlFor="sett-name">Full Name</label>
                  <input
                    id="sett-name" type="text" required
                    value={profileName} onChange={(e) => setProfileName(e.target.value)}
                    className="input"
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto">
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </section>
          )}

          {/* ── Notifications (Temporarily Disabled) ── */}
          {/* {activeSection === 'notifications' && (
            ...
          )} */}

          {/* ── Security (Temporarily Disabled) ── */}
          {/* {activeSection === 'security' && (
            ...
          )} */}

          {/* ── Accessibility ── */}
          {activeSection === 'accessibility' && (
            <section className="bg-white border border-surface-200 rounded-xl p-5 space-y-8">
              <h2 className="text-base font-bold text-surface-900 pb-2 border-b border-surface-100 flex items-center gap-2">
                <FaUniversalAccess className="text-primary-600 text-sm" /> Accessibility
              </h2>

              {/* Font Size */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FaFont className="text-primary-600 text-sm" />
                  <h3 className="text-sm font-bold text-surface-900">Font Size</h3>
                </div>
                <p className="text-xs text-surface-500 mb-4">Adjust the text size across the entire platform.</p>
                <div className="grid grid-cols-3 gap-3">
                  {fontOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFontSize(opt.value)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        fontSize === opt.value
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-surface-200 hover:border-surface-300 text-surface-600 hover:bg-surface-50'
                      }`}
                    >
                      <span className={`font-bold leading-none ${
                        opt.value === 'small' ? 'text-sm' : opt.value === 'large' ? 'text-xl' : 'text-base'
                      }`}>Aa</span>
                      <span className="text-xs font-semibold">{opt.label}</span>
                      <span className="text-[10px] text-center leading-tight opacity-70">{opt.desc}</span>
                      {fontSize === opt.value && (
                        <FaCheckCircle className="text-primary-600 text-xs mt-0.5" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Theme */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FaPalette className="text-primary-600 text-sm" />
                  <h3 className="text-sm font-bold text-surface-900">Color Theme</h3>
                </div>
                <p className="text-xs text-surface-500 mb-4">Choose a display theme that suits your environment and visual needs.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {themeOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setTheme(opt.value)}
                      className={`flex flex-col gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                        theme === opt.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-surface-200 hover:border-surface-300 hover:bg-surface-50'
                      }`}
                    >
                      {/* Mini Preview */}
                      <div className={`w-full h-10 rounded-lg border ${opt.preview} flex items-center gap-1.5 px-2`}>
                        <div className={`w-3 h-3 rounded-full ${opt.dot}`} />
                        <div className={`h-1.5 rounded flex-1 ${opt.dot} opacity-50`} />
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-bold ${theme === opt.value ? 'text-primary-700' : 'text-surface-800'}`}>
                            {opt.label}
                          </span>
                          {theme === opt.value && <FaCheckCircle className="text-primary-600 text-xs" />}
                        </div>
                        <p className="text-[10px] text-surface-500 mt-0.5 leading-tight">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-surface-400 mt-3">
                  Theme preference is saved locally and will persist across sessions.
                </p>
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  )
}

export default Settings

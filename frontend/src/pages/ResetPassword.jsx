import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { resetPassword } from '../services/api'
import { FaLock, FaKey, FaArrowLeft, FaCheckCircle } from 'react-icons/fa'

function ResetPassword() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ token: '', newPassword: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await resetPassword(formData)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Please check your token and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen auth-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-scale-in">
        <div className="bg-white rounded-xl shadow-elevated p-7">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-surface-900">
              Create New Password
            </h1>
            <p className="text-surface-500 mt-1 text-sm">
              Enter the reset token and choose a new password.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-5 text-sm animate-slide-down">
              <span className="mt-0.5 text-xs">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="text-center animate-fade-in">
              <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center mx-auto mb-3">
                <FaCheckCircle className="text-emerald-500 text-xl" />
              </div>
              <h2 className="text-lg font-bold text-surface-900 mb-1">Password Reset Successful</h2>
              <p className="text-surface-500 text-sm">
                Redirecting to login...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="input-label" htmlFor="reset-token">Reset Token</label>
                <div className="relative">
                  <FaKey className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-xs" />
                  <input
                    id="reset-token"
                    type="text"
                    required
                    value={formData.token}
                    onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                    className="input pl-9 font-mono uppercase"
                    placeholder="e.g. 1A2B3C4D"
                  />
                </div>
              </div>

              <div>
                <label className="input-label" htmlFor="new-password">New Password</label>
                <div className="relative">
                  <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-xs" />
                  <input
                    id="new-password"
                    type="password"
                    required
                    minLength={6}
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    className="input pl-9"
                    placeholder="At least 6 characters"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !formData.token || formData.newPassword.length < 6}
                className="btn-primary w-full py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-primary-600 font-medium transition-colors">
              <FaArrowLeft className="text-xs" /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword

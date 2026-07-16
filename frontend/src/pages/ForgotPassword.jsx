import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../services/api'
import { FaEnvelope, FaArrowLeft, FaCheckCircle } from 'react-icons/fa'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await forgotPassword({ email })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset email. Please try again.')
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
              Reset Password
            </h1>
            <p className="text-surface-500 mt-1 text-sm">
              Enter your email to receive a password reset token.
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
              <h2 className="text-lg font-bold text-surface-900 mb-1">Check your email</h2>
              <p className="text-surface-500 text-sm mb-5">
                If an account exists with that email, we've sent you a reset token.
              </p>
              <Link to="/reset-password" className="btn-primary w-full py-2.5 inline-block">
                Enter Reset Token
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="input-label" htmlFor="reset-email">Email address</label>
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-xs" />
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-9"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="btn-primary w-full py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Reset Token'}
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

export default ForgotPassword

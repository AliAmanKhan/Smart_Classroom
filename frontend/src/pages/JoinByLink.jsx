import { useEffect, useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { joinByLink } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { FaSpinner, FaExclamationCircle } from 'react-icons/fa'

function JoinByLink() {
  const { inviteLink } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(true)

  useEffect(() => {
    if (!token) {
      localStorage.setItem('pendingInviteLink', inviteLink)
      return
    }

    const join = async () => {
      try {
        const res = await joinByLink(inviteLink)
        localStorage.removeItem('pendingInviteLink')
        navigate(`/classroom/${res.data.id}`)
      } catch (err) {
        console.error('Error joining by link:', err)
        setError(err.response?.data?.message || 'Failed to join the classroom. The invite link might be invalid or you might already be in this classroom.')
      } finally {
        setJoining(false)
      }
    }

    join()
  }, [inviteLink, token, navigate])

  if (!token) {
    return <Navigate to="/login" state={{ from: `/join/link/${inviteLink}` }} />
  }

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-surface-200/80 shadow-soft p-8 text-center animate-fade-in">
        {joining && !error ? (
          <div className="flex flex-col items-center justify-center py-8">
            <FaSpinner className="animate-spin text-4xl text-primary-600 mb-4" />
            <h2 className="text-xl font-bold text-surface-900 mb-1">Joining Classroom</h2>
            <p className="text-surface-500 text-sm">Please wait while we add you to the classroom...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-4 border border-rose-100">
              <FaExclamationCircle className="text-3xl text-rose-500" />
            </div>
            <h2 className="text-xl font-bold text-surface-900 mb-2">Could Not Join Classroom</h2>
            <p className="text-surface-600 text-sm mb-6 leading-relaxed">{error}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary w-full"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default JoinByLink

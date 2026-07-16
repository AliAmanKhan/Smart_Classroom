import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getAssignment, submitAssignment, getSubmissions, getMySubmission, unsubmitAssignment, downloadSubmission, gradeSubmission, returnSubmission, recordTelemetry } from '../services/api'
import { FaArrowLeft, FaClock, FaCheckCircle, FaUpload, FaFileAlt, FaUser, FaComments, FaCalendarCheck, FaPaperclip, FaExclamationCircle, FaTrash, FaTimes, FaStar, FaUndoAlt, FaLock } from 'react-icons/fa'
import { format, isPast } from 'date-fns'

function AssignmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [assignment, setAssignment] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [mySubmission, setMySubmission] = useState(null)
  const [file, setFile] = useState(null)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showUnsubmitConfirm, setShowUnsubmitConfirm] = useState(false)
  const [gradingId, setGradingId] = useState(null)
  const [gradePoints, setGradePoints] = useState('')
  const [gradeFeedback, setGradeFeedback] = useState('')
  const [grading, setGrading] = useState(false)

  useEffect(() => {
    fetchAssignmentData()
  }, [id])

  const fetchAssignmentData = async () => {
    try {
      const assignmentRes = await getAssignment(id)
      setAssignment(assignmentRes.data)

      if (user?.role === 'TEACHER') {
        const submissionsRes = await getSubmissions(id)
        setSubmissions(submissionsRes.data)
      } else {
        const mySubRes = await getMySubmission(id)
        if (mySubRes.status === 200 && mySubRes.data) {
          setMySubmission(mySubRes.data)
        } else {
          setMySubmission(null)
        }
      }
    } catch (err) {
      console.error('Error fetching assignment:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a file to submit')
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')

    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setError('File size must be less than 50MB')
        setSubmitting(false)
        return
      }
      
      const fileName = file.name.toLowerCase();
      if (!(fileName.endsWith('.pdf') || fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.zip'))) {
        setError('Invalid file type. Only PDF, PNG, JPG, and ZIP are allowed.')
        setSubmitting(false)
        return
      }
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('comment', comment)

      await submitAssignment(id, formData)
      setSuccess('Assignment submitted successfully!')
      
      // Record telemetry
      try {
        if (assignment && assignment.classroomId) {
          await recordTelemetry({
            verb: 'SUBMITTED',
            objectType: 'ASSIGNMENT',
            objectId: id,
            classroomId: assignment.classroomId
          });
        }
      } catch (e) { console.error('Telemetry failed', e) }

      setFile(null)
      setComment('')
      fetchAssignmentData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit assignment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnsubmit = async () => {
    setShowUnsubmitConfirm(false)
    
    setSubmitting(true)
    setError('')
    try {
      await unsubmitAssignment(id)
      setSuccess('Submission removed successfully.')
      setMySubmission(null)
      fetchAssignmentData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to unsubmit assignment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownloadFile = async (submissionId, fileName) => {
    try {
      const response = await downloadSubmission(submissionId)
      const contentType = response.headers['content-type'] || 'application/octet-stream'
      const url = window.URL.createObjectURL(new Blob([response.data], { type: contentType }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName || 'submission-file')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading submission:', err)
      alert(err.response?.data?.message || 'Failed to download submission')
    }
  }

  const handleGradeSubmission = async (submissionId) => {
    if (!gradePoints || isNaN(gradePoints)) {
      setError('Please enter a valid score')
      return
    }
    setGrading(true)
    setError('')
    try {
      await gradeSubmission(submissionId, parseInt(gradePoints), gradeFeedback || null)
      setSuccess('Submission graded successfully!')
      setGradingId(null)
      setGradePoints('')
      setGradeFeedback('')
      fetchAssignmentData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to grade submission')
    } finally {
      setGrading(false)
    }
  }

  const handleReturnSubmission = async (submissionId) => {
    setGrading(true)
    setError('')
    try {
      await returnSubmission(submissionId)
      setSuccess('Submission returned for revision.')
      fetchAssignmentData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to return submission')
    } finally {
      setGrading(false)
    }
  }

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

  const isOverdue = isPast(new Date(assignment.deadline))
  const isTeacher = user?.role === 'TEACHER'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 mb-6 transition-colors"
      >
        <FaArrowLeft />
        <span>Back to Classroom</span>
      </button>

      {/* Assignment Info Card */}
      <div className="bg-white rounded-3xl border border-surface-200/80 shadow-soft p-6 sm:p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary-50 rounded-bl-3xl flex items-center justify-center">
          <FaFileAlt className="text-3xl text-primary-600/30" />
        </div>

        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="badge-primary">
              {assignment.maxPoints} Points Max
            </span>
            {isOverdue ? (
              <span className="badge-danger">
                <FaExclamationCircle className="text-[10px]" /> Overdue
              </span>
            ) : (
              <span className="badge-success">
                <FaClock className="text-[10px]" /> Active
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-900 tracking-tight mb-4">
            {assignment.title}
          </h1>
          <p className="text-surface-600 text-sm sm:text-base leading-relaxed mb-6 whitespace-pre-wrap">
            {assignment.description}
          </p>
          
          <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-surface-100 text-xs font-semibold text-surface-500">
            <div className="flex items-center gap-2">
              <FaCalendarCheck className="text-surface-400 text-sm" />
              <span>Due: {format(new Date(assignment.deadline), 'MMM dd, yyyy @ hh:mm a')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Student Submission Card */}
      {!isTeacher && (
        <div className="bg-white rounded-3xl border border-surface-200/80 shadow-soft p-6 sm:p-8">
          <h2 className="text-xl font-bold text-surface-900 mb-5">Your Submission</h2>
          
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl mb-6 text-sm">
              <FaCheckCircle className="text-emerald-500" />
              <span>{success}</span>
            </div>
          )}

          {mySubmission ? (
            <div className="relative overflow-hidden bg-white rounded-2xl border border-surface-200 shadow-sm p-6 group transition-all hover:shadow-md">
              {/* Premium status accent line */}
              <div className={`absolute top-0 left-0 w-1.5 h-full ${mySubmission.status === 'GRADED' ? 'bg-gradient-to-b from-amber-400 to-orange-500' : mySubmission.status === 'RETURNED' ? 'bg-gradient-to-b from-blue-400 to-indigo-500' : 'bg-gradient-to-b from-emerald-400 to-teal-600'}`}></div>
              
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm border shrink-0 ${
                    mySubmission.status === 'GRADED' ? 'bg-amber-50 text-amber-500 border-amber-100/50' 
                    : mySubmission.status === 'RETURNED' ? 'bg-blue-50 text-blue-500 border-blue-100/50'
                    : 'bg-emerald-50 text-emerald-500 border-emerald-100/50'
                  }`}>
                    {mySubmission.status === 'GRADED' ? <FaStar /> : mySubmission.status === 'RETURNED' ? <FaUndoAlt /> : <FaCheckCircle />}
                  </div>
                  <div className="pt-0.5">
                    <h3 className="font-extrabold text-surface-900 text-lg leading-tight">
                      {mySubmission.status === 'GRADED' ? 'Graded' : mySubmission.status === 'RETURNED' ? 'Returned for Revision' : 'Successfully Submitted'}
                    </h3>
                    <p className="text-xs sm:text-sm text-surface-500 mt-1 flex items-center gap-1.5 font-medium">
                      <FaClock className="text-surface-400 text-xs" />
                      {mySubmission.status === 'GRADED' && mySubmission.gradedAt
                        ? `Graded on ${format(new Date(mySubmission.gradedAt), 'MMM dd, yyyy @ hh:mm a')}`
                        : `Submitted on ${format(new Date(mySubmission.submittedAt), 'MMM dd, yyyy @ hh:mm a')}`
                      }
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-widest shadow-sm self-start sm:self-auto border ${
                  mySubmission.status === 'GRADED' ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : mySubmission.status === 'RETURNED' ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {mySubmission.status}
                </span>
              </div>
              
              <div className="sm:pl-16 space-y-3">
                {/* Grade Display */}
                {mySubmission.status === 'GRADED' && (
                  <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-surface-700">Score</span>
                      <span className="text-xl font-extrabold text-amber-600">{mySubmission.points}<span className="text-sm text-surface-400 font-semibold">/{assignment.maxPoints}</span></span>
                    </div>
                    {/* Score bar */}
                    <div className="w-full h-2 bg-amber-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min((mySubmission.points / assignment.maxPoints) * 100, 100)}%` }} 
                      />
                    </div>
                    {mySubmission.teacherFeedback && (
                      <div className="mt-3 pt-3 border-t border-amber-200/50">
                        <p className="text-xs font-bold text-surface-600 mb-1">Teacher Feedback</p>
                        <p className="text-sm text-surface-600 italic">"{mySubmission.teacherFeedback}"</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Returned for Revision Notice */}
                {mySubmission.status === 'RETURNED' && (
                  <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200/60">
                    <p className="text-sm text-blue-700 font-semibold">Your teacher has returned this submission for revision. Please unsubmit, make your changes, and resubmit.</p>
                  </div>
                )}

                {mySubmission.fileName && (
                  <div className="flex items-center justify-between bg-surface-50 hover:bg-surface-100/50 transition-colors p-3 rounded-xl border border-surface-200/80">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center border border-surface-200 text-surface-400 shrink-0 shadow-sm">
                        <FaPaperclip className="text-sm" />
                      </div>
                      <span className="text-sm font-bold text-surface-700 truncate">{mySubmission.fileName}</span>
                    </div>
                  </div>
                )}
                
                {mySubmission.comment && (
                  <div className="bg-surface-50 p-4 rounded-xl border border-surface-200/80 text-sm text-surface-600 relative">
                    <FaComments className="absolute top-4 right-4 text-surface-300 text-xl opacity-40" />
                    <p className="italic relative z-10 pr-8 font-medium">"{mySubmission.comment}"</p>
                  </div>
                )}

                <div className="pt-3 flex justify-end">
                  {mySubmission.status === 'GRADED' ? (
                    <div className="flex items-center gap-2 text-sm text-surface-400 font-medium">
                      <FaLock className="text-xs" />
                      <span>Graded — cannot unsubmit</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowUnsubmitConfirm(true)}
                      disabled={submitting}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-100"
                    >
                      {submitting ? 'Processing...' : (
                        <>
                          <FaTrash className="text-xs" />
                          <span>Unsubmit</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="input-label" htmlFor="asgn-file">Upload Document</label>
                <div className="relative">
                  <input
                    id="asgn-file"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.zip"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="input py-2.5 cursor-pointer file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    disabled={submitting}
                  />
                </div>
                <p className="text-[11px] text-surface-400 mt-1">
                  Accepted formats: PDF, PNG, JPG, ZIP (max 50MB)
                </p>
              </div>

              <div>
                <label className="input-label" htmlFor="asgn-comment">Submission Notes (Optional)</label>
                <textarea
                  id="asgn-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="input min-h-[100px]"
                  rows="3"
                  placeholder="Write any additional explanation for the teacher here..."
                  disabled={submitting}
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !file}
                className="btn-primary w-full sm:w-auto px-6 py-3"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting…
                  </div>
                ) : (
                  <>
                    <FaUpload className="text-xs" />
                    <span>Submit Assignment</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Teacher Submissions Viewer */}
      {isTeacher && (
        <div className="bg-white rounded-3xl border border-surface-200/80 shadow-soft p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-surface-900">Student Submissions</h2>
              <p className="text-xs text-surface-500 mt-1">
                {submissions.length} {submissions.length === 1 ? 'submission' : 'submissions'} received
              </p>
            </div>
          </div>

          {submissions.length === 0 ? (
            <div className="text-center py-12 bg-surface-50 border border-dashed border-surface-200 rounded-2xl">
              <FaUpload className="text-3xl text-surface-300 mx-auto mb-3" />
              <p className="text-surface-500 text-sm font-semibold">No submissions received yet</p>
            </div>
          ) : (
            <div className="space-y-5">
              {submissions.map((submission) => (
                <div 
                  key={submission.id} 
                  className="bg-surface-50 border border-surface-200/60 rounded-2xl p-5 flex flex-col gap-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <FaUser className="text-primary-600 text-sm" />
                      </div>
                      <div>
                        <h3 className="font-bold text-surface-900 text-sm sm:text-base leading-tight">
                          {submission.student?.fullName}
                        </h3>
                        <p className="text-xs text-surface-500">
                          {submission.student?.email}
                        </p>
                      </div>
                    </div>

                    <div>
                      <span className={`badge ${
                        submission.status === 'LATE'
                          ? 'bg-red-50 text-red-700 border border-red-100'
                          : submission.status === 'GRADED'
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : submission.status === 'RETURNED'
                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : 'bg-blue-50 text-blue-700 border border-blue-100'
                      }`}>
                        {submission.status}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-surface-400 font-semibold flex items-center gap-1.5">
                    <FaClock className="text-surface-300" />
                    <span>Submitted: {format(new Date(submission.submittedAt), 'MMM dd, yyyy @ hh:mm a')}</span>
                  </div>

                  {submission.comment && (
                    <div className="bg-white border border-surface-200/60 rounded-xl p-3.5 flex items-start gap-2.5">
                      <FaComments className="text-surface-400 text-sm mt-0.5 flex-shrink-0" />
                      <p className="text-xs sm:text-sm text-surface-600 leading-normal">{submission.comment}</p>
                    </div>
                  )}

                  {submission.fileName && (
                    <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-surface-200/50">
                      <div className="flex items-center gap-2 text-xs font-bold text-surface-600 truncate">
                        <FaPaperclip className="text-surface-400 text-sm flex-shrink-0" />
                        <span className="truncate">{submission.fileName}</span>
                      </div>
                      
                      <button
                        onClick={() => handleDownloadFile(submission.id, submission.fileName)}
                        className="btn-ghost py-1.5 px-3 text-xs"
                      >
                        Download File
                      </button>
                    </div>
                  )}

                  {/* Graded Display */}
                  {submission.status === 'GRADED' && (
                    <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200/60">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-surface-700 flex items-center gap-1.5"><FaStar className="text-amber-500 text-xs" /> Score</span>
                        <span className="text-lg font-extrabold text-amber-600">{submission.points}<span className="text-xs text-surface-400 font-semibold">/{assignment.maxPoints}</span></span>
                      </div>
                      {submission.teacherFeedback && (
                        <p className="text-sm text-surface-600 italic mt-1">"{submission.teacherFeedback}"</p>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-surface-200/50">
                    {submission.status === 'GRADED' ? (
                      <button
                        onClick={() => handleReturnSubmission(submission.id)}
                        disabled={grading}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                      >
                        <FaUndoAlt className="text-[10px]" />
                        Return for Revision
                      </button>
                    ) : (
                      <>
                        {gradingId === submission.id ? (
                          <div className="w-full bg-white p-4 rounded-xl border border-surface-200 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <label className="text-xs font-bold text-surface-600 block mb-1">Score (max {assignment.maxPoints})</label>
                                <input
                                  type="number"
                                  min="0"
                                  max={assignment.maxPoints}
                                  value={gradePoints}
                                  onChange={(e) => setGradePoints(e.target.value)}
                                  className="input py-2 text-sm w-full"
                                  placeholder={`0 - ${assignment.maxPoints}`}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-bold text-surface-600 block mb-1">Feedback (optional)</label>
                              <textarea
                                value={gradeFeedback}
                                onChange={(e) => setGradeFeedback(e.target.value)}
                                className="input py-2 text-sm w-full min-h-[60px]"
                                placeholder="Write feedback for the student..."
                                rows="2"
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => { setGradingId(null); setGradePoints(''); setGradeFeedback(''); }}
                                className="btn-secondary py-1.5 px-3 text-xs"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleGradeSubmission(submission.id)}
                                disabled={grading || !gradePoints}
                                className="btn-primary py-1.5 px-4 text-xs"
                              >
                                {grading ? 'Saving...' : 'Save Grade'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setGradingId(submission.id); setGradePoints(submission.points || ''); setGradeFeedback(submission.teacherFeedback || ''); }}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-100"
                          >
                            <FaStar className="text-[10px]" />
                            Grade Submission
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Unsubmit Confirmation Modal */}
      {showUnsubmitConfirm && (
        <div className="modal-overlay">
          <div className="modal-content max-w-sm p-0 overflow-hidden animate-scale-in">
            <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #ef4444, #f97316, #f59e0b)' }} />
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                <FaTrash className="text-xl" />
              </div>
              <h3 className="text-lg font-bold text-surface-900 mb-2">Unsubmit Assignment?</h3>
              <p className="text-surface-500 text-sm leading-relaxed">
                Are you sure you want to unsubmit? This will permanently delete your current submission and uploaded file.
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowUnsubmitConfirm(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnsubmit}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <FaTrash className="text-xs" />
                  Unsubmit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AssignmentDetail

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client/dist/sockjs'
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash, FaComments, FaTimes, FaPaperPlane } from 'react-icons/fa'

import { recordTelemetry } from '../services/api'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}

export default function LiveRoom() {
  const { classroomId, sessionId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [localStream, setLocalStream] = useState(null)
  const [micEnabled, setMicEnabled] = useState(true)
  const [camEnabled, setCamEnabled] = useState(true)
  
  const [peers, setPeers] = useState([]) // Array of { peerId, stream }
  const [peerNames, setPeerNames] = useState({}) // peerId -> displayName
  const [chatMessages, setChatMessages] = useState([])
  const [showChat, setShowChat] = useState(false)
  const [msgInput, setMsgInput] = useState('')
  const [connectionState, setConnectionState] = useState('connecting') // connecting, connected, error
  
  const localVideoRef = useRef(null)
  const stompClientRef = useRef(null)
  const myPeerId = useRef(`peer_${Math.random().toString(36).substr(2, 9)}`)
  const peerConnections = useRef(new Map()) // peerId -> RTCPeerConnection
  const chatEndRef = useRef(null)

  // 1. Initialize Media & STOMP connection
  useEffect(() => {
    let stream = null
    let isMounted = true
    
    const init = async () => {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        })
        if (!isMounted) {
          // If unmounted while waiting for media, stop the tracks immediately
          newStream.getTracks().forEach(track => track.stop())
          return
        }
        
        stream = newStream
        setLocalStream(stream)
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }

        // Record telemetry for joining the live class
        try {
          await recordTelemetry({
            verb: 'JOINED',
            objectType: 'LIVE_CLASS',
            objectId: sessionId || 'session',
            classroomId: classroomId
          })
        } catch (e) {
          console.error('Telemetry failed:', e)
        }
        
        // Connect STOMP
        connectStomp(stream)
      } catch (err) {
        if (!isMounted) return
        console.error('Failed to get media devices', err)
        alert('Could not access camera or microphone. Please allow permissions.')
        setConnectionState('error')
      }
    }
    
    init()
    
    return () => {
      // Cleanup
      isMounted = false
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      peerConnections.current.forEach(pc => pc.close())
      if (stompClientRef.current) {
        // Send leave signal before disconnecting
        sendSignal({ type: 'leave' })
        stompClientRef.current.deactivate()
      }
    }
  }, [classroomId, sessionId])

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages, showChat])

  const connectStomp = (currentStream) => {
    const token = localStorage.getItem('token')
    
    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      connectHeaders: {
        Authorization: `Bearer ${token}` // The interceptor looks for the param but let's pass header just in case, though STOMP over SockJS usually needs token in URL. 
        // Wait, WsHandshakeInterceptor looks for ?token= in URL, so we must add it to the URL!
      },
      debug: (str) => console.log('STOMP: ', str),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000
    })

    // Override the factory to include token in query param for WsHandshakeInterceptor
    client.webSocketFactory = () => new SockJS(`/ws?token=${token}`)

    client.onConnect = () => {
      setConnectionState('connected')
      stompClientRef.current = client
      
      // Subscribe to chat
      client.subscribe(`/topic/live/${sessionId}/chat`, (msg) => {
        const chatMsg = JSON.parse(msg.body)
        setChatMessages(prev => [...prev, chatMsg])
      })
      
      // Subscribe to participant events (join/leave)
      client.subscribe(`/topic/live/${sessionId}/participants`, (msg) => {
        const payload = JSON.parse(msg.body)
        
        // Always update peer names map from the backend's current participant list
        if (payload.participants) {
          const namesMap = {}
          payload.participants.forEach(p => {
            namesMap[p.peerId] = p.displayName || p.username || 'Participant'
          })
          setPeerNames(namesMap)
        }

        if (payload.type === 'join' && payload.participant.peerId !== myPeerId.current) {
          // A new peer joined. We should create a PC and send them an offer
          handlePeerJoined(payload.participant.peerId, currentStream)
        } else if (payload.type === 'leave') {
          handlePeerLeft(payload.peerId)
        }
      })
      
      // Subscribe to signaling channel specifically for me
      client.subscribe(`/topic/live/${sessionId}/signal/${myPeerId.current}`, (msg) => {
        const signal = JSON.parse(msg.body)
        handleSignalingData(signal, currentStream)
      })
      
      // Announce myself to the room
      sendSignal({
        type: 'join',
        displayName: user?.fullName || 'Anonymous'
      })
    }

    client.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message'])
      console.error('Additional details: ' + frame.body)
      setConnectionState('error')
    }

    client.activate()
  }

  const sendSignal = (payload) => {
    if (!stompClientRef.current || !stompClientRef.current.connected) return
    const message = {
      ...payload,
      fromPeerId: myPeerId.current
    }
    stompClientRef.current.publish({
      destination: `/app/live/${sessionId}/signal`,
      body: JSON.stringify(message)
    })
  }

  // WebRTC Peer Connection Management
  const createPeerConnection = (peerId, currentStream) => {
    if (peerConnections.current.has(peerId)) {
      return peerConnections.current.get(peerId)
    }

    const pc = new RTCPeerConnection(ICE_SERVERS)
    peerConnections.current.set(peerId, pc)

    // Add local tracks
    if (currentStream) {
      currentStream.getTracks().forEach(track => {
        pc.addTrack(track, currentStream)
      })
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: 'ice',
          toPeerId: peerId,
          candidate: JSON.stringify(event.candidate)
        })
      }
    }

    // Handle incoming streams
    pc.ontrack = (event) => {
      setPeers(prev => {
        const existing = prev.find(p => p.peerId === peerId)
        if (existing) return prev
        return [...prev, { peerId, stream: event.streams[0] }]
      })
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        handlePeerLeft(peerId)
      }
    }

    return pc
  }

  const handlePeerJoined = async (peerId, currentStream) => {
    // New peer joined, create offer
    const pc = createPeerConnection(peerId, currentStream)
    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      sendSignal({
        type: 'offer',
        toPeerId: peerId,
        sdp: JSON.stringify(pc.localDescription)
      })
    } catch (err) {
      console.error('Error creating offer', err)
    }
  }

  const handleSignalingData = async (signal, currentStream) => {
    const peerId = signal.fromPeerId

    if (signal.type === 'offer') {
      const payload = signal.sdp ? JSON.parse(signal.sdp) : null
      const pc = createPeerConnection(peerId, currentStream)
      await pc.setRemoteDescription(new RTCSessionDescription(payload))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      sendSignal({
        type: 'answer',
        toPeerId: peerId,
        sdp: JSON.stringify(pc.localDescription)
      })
    } else if (signal.type === 'answer') {
      const payload = signal.sdp ? JSON.parse(signal.sdp) : null
      const pc = peerConnections.current.get(peerId)
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(payload))
      }
    } else if (signal.type === 'ice') {
      const payload = signal.candidate ? JSON.parse(signal.candidate) : null
      const pc = peerConnections.current.get(peerId)
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(payload))
      }
    }
  }

  const handlePeerLeft = (peerId) => {
    const pc = peerConnections.current.get(peerId)
    if (pc) {
      pc.close()
      peerConnections.current.delete(peerId)
    }
    setPeers(prev => prev.filter(p => p.peerId !== peerId))
  }

  // UI Actions
  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !micEnabled)
      setMicEnabled(!micEnabled)
    }
  }

  const toggleCam = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.enabled = !camEnabled)
      setCamEnabled(!camEnabled)
    }
  }

  const leaveRoom = () => {
    navigate(`/classroom/${classroomId}`)
  }

  const handleSendChat = (e) => {
    e.preventDefault()
    if (!msgInput.trim() || !stompClientRef.current) return
    
    const message = {
      fromPeerId: myPeerId.current,
      displayName: user?.fullName || 'User',
      message: msgInput.trim()
    }
    
    stompClientRef.current.publish({
      destination: `/app/live/${sessionId}/chat`,
      body: JSON.stringify(message)
    })
    
    setMsgInput('')
  }

  if (connectionState === 'error') {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-900 text-white">
        <div className="text-center">
          <FaVideoSlash className="text-5xl text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connection Failed</h2>
          <p className="text-surface-400 mb-6">Could not access devices or connect to the session.</p>
          <button onClick={leaveRoom} className="px-6 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg">Go Back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-surface-900 text-white overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-surface-800 flex justify-between items-center px-6 shrink-0 bg-surface-900 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
            Live
          </div>
          <h1 className="font-semibold truncate max-w-sm">Classroom Session</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowChat(!showChat)} className={`p-2 rounded-lg transition-colors ${showChat ? 'bg-primary-600' : 'bg-surface-800 hover:bg-surface-700'}`}>
            <FaComments />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Grid */}
        <div className="flex-1 p-4 overflow-y-auto custom-scroll relative">
          <div className={`grid gap-4 h-full ${
            peers.length === 0 ? 'grid-cols-1' : 
            peers.length === 1 ? 'grid-cols-2' : 
            peers.length <= 3 ? 'grid-cols-2' : 'grid-cols-3'
          }`}>
            {/* Local Video */}
            <div className="bg-surface-800 rounded-2xl overflow-hidden relative shadow-lg ring-1 ring-white/10 flex items-center justify-center">
              <video 
                ref={localVideoRef} 
                autoPlay 
                muted 
                playsInline
                className={`w-full h-full object-cover ${!camEnabled ? 'opacity-0' : ''}`}
                style={{ transform: 'scaleX(-1)' }}
              />
              {!camEnabled && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-surface-500">
                  <div className="w-20 h-20 rounded-full bg-surface-700 flex items-center justify-center mb-3">
                    <span className="text-3xl font-bold text-white">{user?.fullName?.charAt(0) || 'Y'}</span>
                  </div>
                  <FaVideoSlash className="text-2xl" />
                </div>
              )}
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                <div className="bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm font-medium">
                  You (Local)
                </div>
                {!micEnabled && (
                  <div className="bg-red-500/80 p-1.5 rounded-md text-white backdrop-blur-sm">
                    <FaMicrophoneSlash className="text-xs" />
                  </div>
                )}
              </div>
            </div>

            {/* Remote Videos */}
            {peers.map(peer => (
              <RemoteVideo key={peer.peerId} peer={peer} displayName={peerNames[peer.peerId] || 'Participant'} />
            ))}
          </div>
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-80 border-l border-surface-800 bg-surface-900 flex flex-col shrink-0 animate-slide-left">
            <div className="p-4 border-b border-surface-800 flex justify-between items-center">
              <h2 className="font-semibold">Session Chat</h2>
              <button onClick={() => setShowChat(false)} className="text-surface-400 hover:text-white p-1">
                <FaTimes />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scroll">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.fromPeerId === myPeerId.current ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-surface-500 mb-1 px-1">{msg.displayName}</span>
                  <div className={`px-3 py-2 rounded-2xl max-w-[90%] text-sm ${
                    msg.fromPeerId === myPeerId.current 
                      ? 'bg-primary-600 text-white rounded-tr-sm' 
                      : 'bg-surface-800 text-surface-100 rounded-tl-sm'
                  }`}>
                    {msg.message}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t border-surface-800 bg-surface-800/50">
              <form onSubmit={handleSendChat} className="flex gap-2">
                <input
                  type="text"
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-surface-900 border border-surface-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
                />
                <button 
                  type="submit" 
                  disabled={!msgInput.trim()}
                  className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                >
                  <FaPaperPlane className="text-xs" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="h-20 border-t border-surface-800 bg-surface-900/90 backdrop-blur-xl flex items-center justify-center gap-4 shrink-0 px-6 z-10 relative">
        <button 
          onClick={toggleMic}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
            micEnabled ? 'bg-surface-700 hover:bg-surface-600' : 'bg-red-500 hover:bg-red-600'
          }`}
        >
          {micEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </button>
        <button 
          onClick={toggleCam}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
            camEnabled ? 'bg-surface-700 hover:bg-surface-600' : 'bg-red-500 hover:bg-red-600'
          }`}
        >
          {camEnabled ? <FaVideo /> : <FaVideoSlash />}
        </button>
        <div className="w-px h-8 bg-surface-700 mx-2" />
        <button 
          onClick={leaveRoom}
          className="px-6 h-12 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center gap-2 font-semibold transition-all shadow-lg shadow-red-900/20"
        >
          <FaPhoneSlash />
          <span>Leave Room</span>
        </button>
      </div>
    </div>
  )
}

// Subcomponent for Remote Videos
function RemoteVideo({ peer, displayName }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current && peer.stream) {
      ref.current.srcObject = peer.stream
    }
  }, [peer.stream])

  return (
    <div className="bg-surface-800 rounded-2xl overflow-hidden relative shadow-lg ring-1 ring-white/10 flex items-center justify-center">
      <video 
        ref={ref} 
        autoPlay 
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
        <div className="bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm font-medium text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {displayName}
        </div>
      </div>
    </div>
  )
}

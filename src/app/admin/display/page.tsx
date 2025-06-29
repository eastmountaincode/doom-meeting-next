'use client'

import { useState, useEffect } from 'react'
import { 
  LiveKitRoom, 
  VideoTrack,
  useTracks,
  type TrackReference
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { useDebugBorders } from '../../../hooks/useDebugBorders'
import '@livekit/components-styles'

function ParticipantGrid() {
  useDebugBorders() // Enable Ctrl/Cmd + B to toggle debug borders
  
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  )

  // Filter out admin tracks and get only real participant video tracks
  const participantTracks = tracks.filter(
    track => track.participant.identity !== 'admin-display' && 
             track.participant.identity !== 'admin-observer' &&
             track.publication && 
             track.publication.isSubscribed
  )

  // Calculate grid columns based on number of participants
  const participantCount = participantTracks.length
  const getGridCols = (count: number) => {
    if (count <= 1) return 1
    if (count <= 4) return 2
    if (count <= 9) return 3
    if (count <= 16) return 4
    return 5
  }

  const gridCols = getGridCols(participantCount)

  if (participantCount === 0) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-6xl mb-8">📹</div>
          <h2 className="text-4xl mb-4">DOOM Meeting Display</h2>
          <p className="text-xl">Waiting for participants...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen bg-black p-4 flex items-center justify-center">
      <div 
        className="grid gap-4"
        style={{ 
          gridTemplateColumns: `repeat(${gridCols}, 300px)`,
          gridAutoRows: '300px'
        }}
      >
        {participantTracks.map((track) => {
          // Check if participant is using front camera from metadata
          let cameraFacing = 'back'
          try {
            const metadata = track.participant.metadata
            if (metadata) {
              const parsed = JSON.parse(metadata)
              cameraFacing = parsed.cameraFacing || 'back'
            }
          } catch (e) {
            // Metadata parsing failed, default to back camera
          }
          
          return (
            <div 
              key={`${track.participant.identity}-${track.publication?.trackSid || Math.random()}`} 
              className="relative bg-black overflow-hidden w-[300px] h-[300px]"
            >
              <VideoTrack 
                trackRef={track as TrackReference}
                className={`w-full h-full object-cover ${
                  cameraFacing === 'front' ? 'scale-x-[-1]' : ''
                }`}
              />
              
              {/* Participant name overlay */}
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-80 px-2 py-1 text-white text-xs font-medium">
                {track.participant.identity}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DisplayContent() {
  const [token, setToken] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')

  // Generate admin token
  useEffect(() => {
    const generateAdminToken = async () => {
      try {
        setIsLoading(true)
        setError('')
        
        const response = await fetch(
          `/api/token?room=doom&username=admin-display`
        )
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data.error) {
          throw new Error(data.error)
        }
        
        setToken(data.token)
      } catch (err) {
        console.error('Display token generation failed:', err)
        setError(err instanceof Error ? err.message : 'Failed to generate display token')
      } finally {
        setIsLoading(false)
      }
    }

    generateAdminToken()
  }, [])

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-8">🔗</div>
          <p className="text-2xl">Connecting to display...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-center text-red-400">
          <div className="text-6xl mb-8">⚠️</div>
          <p className="text-2xl mb-4">Display Connection Failed</p>
          <p className="text-lg">{error}</p>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-6xl mb-8">🎫</div>
          <p className="text-2xl">No display access token</p>
        </div>
      </div>
    )
  }

  return (
    <LiveKitRoom
      video={false} // Display doesn't publish video
      audio={false} // Display doesn't publish audio
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      onError={(error) => setError(`Connection failed: ${error.message}`)}
      className="h-screen w-screen"
    >
      <ParticipantGrid />
    </LiveKitRoom>
  )
}

export default function AdminDisplayPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Check for existing authentication
  useEffect(() => {
    const authenticated = sessionStorage.getItem('admin_authenticated')
    if (authenticated === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        sessionStorage.setItem('admin_authenticated', 'true')
        setIsAuthenticated(true)
      } else {
        setError(data.error || 'Authentication failed')
      }
    } catch (error) {
      setError('Authentication failed')
      console.error('Auth error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="bg-gray-900 p-8 rounded-lg border border-gray-700 max-w-md w-full mx-4">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">Display Access</h1>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin password"
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 caret-white"
                required
                disabled={isLoading}
              />
            </div>
            
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
            
            <button
              type="submit"
              className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Authenticating...' : 'Access Display'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return <DisplayContent />
} 
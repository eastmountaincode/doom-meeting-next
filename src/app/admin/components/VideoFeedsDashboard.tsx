'use client'

import { useState, useEffect } from 'react'
import { 
  LiveKitRoom, 
  GridLayout,
  ParticipantTile,
  useTracks,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import '@livekit/components-styles'

function VideoGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  )

  return (
    <div className="h-full">
      <GridLayout tracks={tracks} style={{ height: '100%' }}>
        <ParticipantTile />
      </GridLayout>
      
      {tracks.length === 0 && (
        <div className="h-full flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-4">📹</div>
            <h3 className="text-lg mb-2">No Active Participants</h3>
            <p>Waiting for participants to join the DOOM meeting...</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function VideoFeedsDashboard() {
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
          `/api/token?room=doom&username=admin-observer`
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
        console.error('Admin token generation failed:', err)
        setError(err instanceof Error ? err.message : 'Failed to generate admin token')
      } finally {
        setIsLoading(false)
      }
    }

    generateAdminToken()
  }, [])

  const handleConnectionError = (error: Error) => {
    console.error('LiveKit admin connection error:', error)
    setError(`Connection failed: ${error.message}`)
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-3xl mb-4">🔗</div>
          <p className="text-lg">Connecting to video feeds...</p>
          <p className="text-sm text-gray-400 mt-2">Generating admin access</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-red-400 max-w-md">
          <div className="text-3xl mb-4">⚠️</div>
          <p className="text-lg mb-2">Connection Failed</p>
          <p className="text-sm mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-3xl mb-4">🎫</div>
          <p>No admin access token available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Live Video Feeds</h2>
          <p className="text-gray-400">Real-time view of all participant cameras</p>
        </div>
        <div className="text-sm text-gray-400">
          Room: <span className="text-white font-mono">doom</span>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg overflow-hidden" style={{ height: 'calc(100% - 80px)' }}>
        <LiveKitRoom
          video={false} // Admin doesn't publish video
          audio={false} // Admin doesn't publish audio
          token={token}
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://doom-meeting-6yvggm4d.livekit.cloud'}
          data-lk-theme="default"
          style={{ height: '100%' }}
          onError={handleConnectionError}
        >
          <VideoGrid />
        </LiveKitRoom>
      </div>
    </div>
  )
} 
'use client'

import { useState, useEffect } from 'react'
import { 
  LiveKitRoom, 
  useParticipants
} from '@livekit/components-react'
import '@livekit/components-styles'

function ParticipantsList() {
  const participants = useParticipants()

  return (
    <div className="h-full">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white mb-2">Room Participants</h3>
        <p className="text-gray-400 text-sm">Total: {participants.length}</p>
      </div>
      
      {participants.length === 0 ? (
        <div className="h-full flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg mb-2">No Participants</h3>
            <p>Waiting for users to join the DOOM meeting...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {participants.map((participant) => (
            <div 
              key={participant.identity} 
              className="bg-gray-700 rounded-lg p-4 border border-gray-600"
            >
              <div className="flex items-center justify-between">
                {/* Left group: Name and joined date */}
                <div className="flex flex-col">
                  <h4 className="text-white font-medium">
                    {(() => {
                      // Try to get display name from participant metadata, fallback to identity
                      try {
                        const metadata = participant.metadata
                        if (metadata) {
                          const parsed = JSON.parse(metadata)
                          return parsed.displayName || participant.identity
                        }
                      } catch {
                        // Metadata parsing failed
                      }
                      return participant.identity
                    })()}
                  </h4>
                  <div className="text-xs text-gray-500">
                    Joined: {new Date(participant.joinedAt || Date.now()).toLocaleTimeString()}
                  </div>
                </div>
                
                {/* Right group: Status indicators */}
                <div className="flex items-center space-x-4">
                  {/* Camera status */}
                  <div className="flex flex-col items-center">
                    <div className="text-xs text-gray-400 mb-1">C</div>
                    <div className={`w-5 h-5 rounded-full ${
                      participant.isCameraEnabled ? 'bg-green-500' : 'bg-gray-500'
                    }`} title={participant.isCameraEnabled ? 'Camera On' : 'Camera Off'} />
                  </div>
                  
                  {/* Camera direction */}
                  <div className="flex flex-col items-center">
                    <div className="text-xs text-gray-400 mb-1">Dir</div>
                    {(() => {
                      try {
                        const metadata = participant.metadata ? JSON.parse(participant.metadata) : {}
                        const facing = metadata.cameraFacing
                        if (facing && participant.identity !== 'admin-observer') {
                          return (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              facing === 'front' ? 'bg-blue-500/20 text-blue-400' : 
                              facing === 'back' ? 'bg-purple-500/20 text-purple-400' : ''
                            }`}>
                              {facing === 'front' ? 'Front' : facing === 'back' ? 'Back' : ''}
                            </span>
                          )
                        }
                        return <div className="w-12 h-5"></div> // Placeholder to maintain spacing
                      } catch {
                        return <div className="w-12 h-5"></div> // Placeholder to maintain spacing
                      }
                    })()}
                  </div>
                  
                  {/* Connection quality */}
                  <div className="flex flex-col items-center">
                    <div className="text-xs text-gray-400 mb-1">Q</div>
                    <div className={`w-5 h-5 rounded-full ${
                      participant.connectionQuality === 'excellent' ? 'bg-green-500' :
                      participant.connectionQuality === 'good' ? 'bg-yellow-500' :
                      participant.connectionQuality === 'poor' ? 'bg-red-500' : 'bg-gray-500'
                    }`} title={`Connection: ${participant.connectionQuality || 'unknown'}`} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminParticipants() {
  const [token, setToken] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [adminId] = useState(() => `admin-observer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

  // Generate admin token
  useEffect(() => {
    const generateAdminToken = async () => {
      try {
        setIsLoading(true)
        setError('')
        
        const response = await fetch(
          `/api/token?room=doom&username=${adminId}`
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
  }, [adminId])

  const handleConnectionError = (error: Error) => {
    console.error('LiveKit admin connection error:', error)
    setError(`Connection failed: ${error.message}`)
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-3xl mb-4">🔗</div>
          <p className="text-lg">Connecting to room...</p>
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
    <LiveKitRoom
      video={false} // Admin doesn't publish video
      audio={false} // Admin doesn't publish audio
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      onError={handleConnectionError}
      className="bg-transparent"
    >
      <ParticipantsList />
    </LiveKitRoom>
  )
} 
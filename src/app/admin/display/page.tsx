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

function ParticipantGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
    ],
    { onlySubscribed: false },
  )

  return (
    <div className="h-screen w-screen bg-black p-4">
      <GridLayout tracks={tracks} style={{ height: '100%', width: '100%' }}>
        <ParticipantTile />
      </GridLayout>
      
      {tracks.length === 0 && (
        <div className="h-full flex items-center justify-center text-white">
          <div className="text-center">
            <div className="text-6xl mb-8">📹</div>
            <h2 className="text-4xl mb-4">DOOM Meeting Display</h2>
            <p className="text-xl">Waiting for participants...</p>
          </div>
        </div>
      )}
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
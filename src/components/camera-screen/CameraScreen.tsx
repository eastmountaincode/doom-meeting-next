'use client'

import { useAtomValue, useSetAtom } from 'jotai'
import { screenNameAtom, navigateToLandingAtom } from '../../store'
import { useState, useEffect } from 'react'
import { LiveKitRoom } from '@livekit/components-react'
import LiveKitCameraView from './LiveKitCameraView'
import '@livekit/components-styles'

function CameraScreen() {
  const screenName = useAtomValue(screenNameAtom)
  const navigateToLanding = useSetAtom(navigateToLandingAtom)
  
  const [token, setToken] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')

  // Generate user token
  useEffect(() => {
    const generateUserToken = async () => {
      try {
        setIsLoading(true)
        setError('')
        
        const response = await fetch(
          `/api/token?room=doom&username=${encodeURIComponent(screenName)}&displayName=${encodeURIComponent(screenName)}&makeUnique=true`
        )
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data.error) {
          throw new Error(data.error)
        }
        
        setToken(data.token)
        console.log(`🎫 Generated token for user: ${screenName}`)
      } catch (err) {
        console.error('User token generation failed:', err)
        setError(err instanceof Error ? err.message : 'Failed to generate user token')
      } finally {
        setIsLoading(false)
      }
    }

    if (screenName) {
      generateUserToken()
    }
  }, [screenName])

  const handleConnectionError = (error: Error) => {
    console.error('LiveKit user connection error:', error)
    setError(`Connection failed: ${error.message}`)
  }

  const handleDisconnected = () => {
    console.log('🔴 Disconnected from room - returning to landing')
    navigateToLanding()
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="text-3xl mb-4">🔗</div>
          <p className="text-lg">Joining DOOM meeting...</p>
          <p className="text-sm text-gray-400 mt-2">Connecting as {screenName}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center text-red-400 max-w-md">
          <div className="text-3xl mb-4">⚠️</div>
          <p className="text-lg mb-2">Connection Failed</p>
          <p className="text-sm mb-6">{error}</p>
          <div className="space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              onClick={() => navigateToLanding()}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center text-gray-400">
          <div className="text-3xl mb-4">🎫</div>
          <p>No access token available</p>
        </div>
      </div>
    )
  }

  return (
    <LiveKitRoom
      video={false} // We'll enable camera manually with custom constraints
      audio={false} // No audio for this app
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      data-lk-theme="default"
      style={{ height: '100%' }}
      onError={handleConnectionError}
      onDisconnected={handleDisconnected}
      className="bg-gray-900"
    >
      <LiveKitCameraView />
    </LiveKitRoom>
  )
}

export default CameraScreen 
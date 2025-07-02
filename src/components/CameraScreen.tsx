'use client'

import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { screenNameAtom, selectedCameraAtom, navigateToLandingAtom } from '../store'
import { useState, useEffect } from 'react'
import { 
  LiveKitRoom, 
  VideoTrack,
  useLocalParticipant,
  useTracks,
  type TrackReference
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { VIDEO_CONSTRAINTS, CAMERA_SWITCH_DELAY } from '../config/constants'
import '@livekit/components-styles'

function LiveKitCameraView() {
  const screenName = useAtomValue(screenNameAtom)
  const [selectedCamera, setSelectedCamera] = useAtom(selectedCameraAtom)
  const navigateToLanding = useSetAtom(navigateToLandingAtom)
  
  const { localParticipant } = useLocalParticipant()
  
  // Get the local video track
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: false },
  ], { onlySubscribed: false })
  
  const localVideoTrack = tracks.find(track => track.participant.isLocal && track.publication)

  const handleEndMeeting = () => {
    console.log('🔴 User clicked End - leaving room')
    navigateToLanding()
  }

  // Dynamic button text based on camera state
  const frontButtonText = selectedCamera === null ? 'LOOK AT ME' : 'ME'
  const backButtonText = selectedCamera === null ? 'LOOK AT YOU' : 'YOU'

  // Handle camera switching
  const handleCameraSwitch = async (facingMode: 'front' | 'back') => {
    if (!localParticipant) return
    
    try {
      console.log(`🔄 Switching to ${facingMode} camera...`)
      
      // Get current video track if exists
      const currentTrack = localParticipant.getTrackPublication(Track.Source.Camera)
      
      // Unpublish current track completely
      if (currentTrack) {
        console.log('🔴 Unpublishing current video track...')
        await localParticipant.unpublishTrack(currentTrack.track!)
      }
      
      // Stop current track if it exists
      if (currentTrack?.track) {
        console.log('🔴 Stopping current video track...')
        currentTrack.track.stop()
      }
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, CAMERA_SWITCH_DELAY))
      
      // Create constraints with our compressed settings
      const constraints = {
        width: VIDEO_CONSTRAINTS.WIDTH,
        height: VIDEO_CONSTRAINTS.HEIGHT,
        aspectRatio: { ideal: VIDEO_CONSTRAINTS.ASPECT_RATIO },
        facingMode: (facingMode === 'front' ? 'user' : 'environment') as 'user' | 'environment',
        frameRate: VIDEO_CONSTRAINTS.FRAME_RATE,
      }
      
      console.log('🟢 Getting new camera with constraints:', constraints)
      
      // Get new media stream with new constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: constraints,
        audio: false
      })
      
      // Publish the new video track
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        console.log('🔄 Publishing new video track to LiveKit...')
        await localParticipant.publishTrack(videoTrack, {
          source: Track.Source.Camera,
          name: 'camera'
        })
      }
      
      // Send camera facing mode as metadata so admin can see it
      try {
        await localParticipant.setMetadata(JSON.stringify({ 
          cameraFacing: facingMode 
        }))
        console.log(`📡 Camera facing metadata sent: ${facingMode}`)
      } catch (metadataError) {
        console.warn('Failed to update metadata:', metadataError)
        // Continue anyway - camera still works, just admin won't see facing mode
      }
      
      setSelectedCamera(facingMode)
      console.log(`✅ ${facingMode} camera activated`)
      
    } catch (error) {
      console.error('Camera switch error:', error)
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        })
      }
    }
  }

  const renderVideoContent = () => {
    if (localVideoTrack && localVideoTrack.publication) {
      return (
        <VideoTrack
          trackRef={localVideoTrack as TrackReference}
          className={`w-full h-full object-cover ${
            selectedCamera === 'front' ? 'scale-x-[-1]' : ''
          }`}
        />
      )
    }

    if (selectedCamera) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-3xl mb-2">📹</div>
            <p>Starting camera...</p>
          </div>
        </div>
      )
    }

    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-3xl mb-2">📷</div>
          <p>Select a camera to start</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Video Feed Area - SQUARE ASPECT RATIO for consistency */}
      <div className="flex-1 p-4 pb-0 flex items-center justify-center">
        <div className="relative w-full max-w-lg aspect-square bg-gray-900 border-2 border-gray-600 rounded-lg overflow-hidden">
          {/* Video content */}
          {renderVideoContent()}
          
          {/* Screen name overlay (bottom left of video) */}
          <div className="absolute bottom-0 left-0 bg-black bg-opacity-80 px-2 py-1 text-white text-sm font-medium">
            {screenName}
          </div>
        </div>
      </div>

      {/* Alert Zone - Fixed height to prevent layout shifts */}
      <div className="px-4 h-16 min-h-16 flex items-center justify-center flex-shrink-0">
        {/* Alert content will go here - currently empty */}
                  <div className="text-center text-gray-500 w-full">
            <p className="px-2">
              <span className="font-bold text-red-500 text-xs sm:text-sm md:text-base break-words">YOU ARE THE EMPLOYEE OF THE MONTH !!!</span>
            </p>
          </div>
      </div>    

      {/* Camera Selection Buttons */}
      <div className="p-4 pt-2">
        <div className="flex gap-4 mb-4 justify-center">
          <button
            onClick={() => handleCameraSwitch('front')}
            className={`w-full max-w-xs p-4 text-lg font-bold rounded-lg border-2 cursor-pointer ${
              selectedCamera === 'front'
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'bg-gray-800 border-gray-600 text-white hover:border-blue-500'
            }`}
          >
            {frontButtonText}
          </button>
          
          <button
            onClick={() => handleCameraSwitch('back')}
            className={`w-full max-w-xs p-4 text-lg font-bold rounded-lg border-2 cursor-pointer ${
              selectedCamera === 'back'
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'bg-gray-800 border-gray-600 text-white hover:border-blue-500'
            }`}
          >
            {backButtonText}
          </button>
        </div>

        {/* End button in bottom right */}
        <div className="flex justify-end">
          <button
            onClick={handleEndMeeting}
            className="bg-red-500 text-white px-6 py-2 rounded-full font-bold hover:bg-red-600 cursor-pointer"
          >
            End
          </button>
        </div>
      </div>
    </div>
  )
}

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
          `/api/token?room=doom&username=${encodeURIComponent(screenName)}`
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
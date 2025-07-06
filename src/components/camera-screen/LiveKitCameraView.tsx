'use client'

import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { screenNameAtom, selectedCameraAtom, navigateToLandingAtom } from '../../store'
import { useEffect } from 'react'
import { 
  VideoTrack,
  useLocalParticipant,
  useTracks,
  type TrackReference
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { VIDEO_CONSTRAINTS, CAMERA_SWITCH_DELAY } from '../../config/constants'
import { SpeakSection, CameraControls, VideoDisplay } from './index'

export default function LiveKitCameraView() {
  const screenName = useAtomValue(screenNameAtom)
  const [selectedCamera, setSelectedCamera] = useAtom(selectedCameraAtom)
  const navigateToLanding = useSetAtom(navigateToLandingAtom)
  
  const { localParticipant } = useLocalParticipant()
  
  // Get the local video track
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: false },
  ], { onlySubscribed: false })
  
  const localVideoTrack = tracks.find(track => track.participant.isLocal && track.publication)

  // Set initial metadata with display name when participant joins and connection is ready
  useEffect(() => {
    if (localParticipant && screenName) {
      // Wait a bit for connection to establish, then set metadata
      const timeoutId = setTimeout(async () => {
        try {
          const metadataObj = { displayName: screenName }
          const metadataString = JSON.stringify(metadataObj)
          
          await localParticipant.setMetadata(metadataString)
          console.log(`📡 Set initial metadata for: ${screenName}`)
        } catch (error) {
          console.error('Failed to set initial metadata:', error)
        }
      }, 2000) // Wait 2 seconds for connection to establish
      
      return () => clearTimeout(timeoutId)
    }
  }, [localParticipant, screenName])

  const handleEndMeeting = () => {
    console.log('🔴 User clicked End - leaving room')
    navigateToLanding()
  }

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
      
      // Send camera facing mode as metadata so admin can see it, preserving existing metadata
      try {
        // Get current metadata to preserve displayName
        let currentMetadata = {}
        try {
          if (localParticipant.metadata) {
            currentMetadata = JSON.parse(localParticipant.metadata)
          }
        } catch {
          // If parsing fails, start with empty metadata
        }
        
        // Update with camera facing while preserving other metadata
        const newMetadata = {
          ...currentMetadata,
          displayName: screenName, // Ensure displayName is always set
          cameraFacing: facingMode 
        }
        
        await localParticipant.setMetadata(JSON.stringify(newMetadata))
        console.log(`📡 Updated metadata for ${screenName}`)
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
    <div className="safe-area-height flex flex-col min-h-0">
      {/* Video Feed Area */}
      <VideoDisplay 
        screenName={screenName}
        renderVideoContent={renderVideoContent}
      />

      {/* UI Controls Container - Max width to prevent stretching on large screens */}
      <div className="w-full max-w-xl mx-auto px-1 sm:px-2 pb-2 sm:pb-4 mb-2 sm:mb-4 flex-shrink-0">
        {/* Speak Section */}
        <SpeakSection 
          participantId={localParticipant?.identity}
        />

        {/* Camera Controls */}
        <CameraControls 
          selectedCamera={selectedCamera}
          onCameraSwitch={handleCameraSwitch}
          onEndMeeting={handleEndMeeting}
        />
      </div>
    </div>
  )
} 
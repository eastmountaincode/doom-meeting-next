import { useState, useEffect, useRef, useCallback } from 'react'
import { VIDEO_CONSTRAINTS } from '../config/constants'

export function useCamera(selectedCamera: 'front' | 'back' | null) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Keep streamRef in sync with stream state
  useEffect(() => {
    streamRef.current = stream
  }, [stream])

  // Stop current stream with logging
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      console.log('🔴 Stopping camera stream...')
      streamRef.current.getTracks().forEach(track => {
        console.log(`Stopping ${track.kind} track`)
        track.stop()
      })
      streamRef.current = null
      setStream(null)
      console.log('✅ Camera stream stopped')
    }
  }, []) // No dependencies - uses ref instead

  // Check if camera API is available
  const isCameraSupported = () => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  }

  // Start camera with COMPRESSED settings to save LiveKit resources
  const startCamera = useCallback(async (facingMode: 'front' | 'back') => {
    try {
      setIsLoading(true)
      setError(null)

      // Check for camera support first
      if (!isCameraSupported()) {
        throw new Error('Camera access requires HTTPS. Please use HTTPS or localhost.')
      }

      // Stop any existing stream first
      stopStream()

      console.log(`🟢 Starting ${facingMode} camera (compressed for server)...`)

      // COMPRESSED VIDEO CONSTRAINTS to save bandwidth/resources
      const constraints: MediaStreamConstraints = {
        video: {
          width: VIDEO_CONSTRAINTS.WIDTH,
          height: VIDEO_CONSTRAINTS.HEIGHT,
          aspectRatio: { ideal: VIDEO_CONSTRAINTS.ASPECT_RATIO },
          facingMode: facingMode === 'front' ? 'user' : 'environment',
          frameRate: VIDEO_CONSTRAINTS.FRAME_RATE,
        },
        audio: false
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      
      // Additional compression: Set low bitrate on video track
      const videoTrack = newStream.getVideoTracks()[0]
      if (videoTrack && 'applyConstraints' in videoTrack) {
        try {
          await videoTrack.applyConstraints({
            width: { ideal: VIDEO_CONSTRAINTS.WIDTH.ideal },
            height: { ideal: VIDEO_CONSTRAINTS.HEIGHT.ideal },
            frameRate: { ideal: VIDEO_CONSTRAINTS.FRAME_RATE.ideal },
          })
          console.log('📉 Applied additional compression constraints')
        } catch (constraintError) {
          console.warn('Could not apply additional constraints:', constraintError)
        }
      }

      streamRef.current = newStream
      setStream(newStream)
      console.log(`✅ ${facingMode} camera started (compressed: ~${VIDEO_CONSTRAINTS.WIDTH.ideal}x${VIDEO_CONSTRAINTS.HEIGHT.ideal}@${VIDEO_CONSTRAINTS.FRAME_RATE.ideal}fps)`)

      // Set video source
      if (videoRef.current) {
        videoRef.current.srcObject = newStream
      }

    } catch (err: unknown) {
      console.error('Camera access error:', err)
      
      // Provide more helpful error messages
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access.')
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.')
        } else if (err.message.includes('HTTPS')) {
          setError('HTTPS required for camera access.')
        } else {
          setError(err.message)
        }
      } else {
        setError('Unknown camera error occurred.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [stopStream])

  // Effect to handle camera switching
  useEffect(() => {
    if (selectedCamera) {
      startCamera(selectedCamera)
    } else {
      stopStream()
    }

    // Cleanup function - runs when component unmounts or selectedCamera changes
    return () => {
      stopStream()
    }
  }, [selectedCamera, startCamera, stopStream])

  // Additional cleanup for page unload and app backgrounding
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('🔴 Page unloading - cleaning up camera')
      stopStream()
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('🔴 App went to background - cleaning up camera')
        stopStream()
      }
    }

    // Add event listeners for cleanup scenarios
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup event listeners
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [stopStream])

  // Update video element when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return {
    videoRef,
    stream,
    error,
    isLoading,
    stopStream,
    isCameraSupported: isCameraSupported()
  }
} 
import { useState, useEffect, useRef, useCallback } from 'react'

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

  // Start camera with specified facing mode - ALWAYS SQUARE for consistency
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

      console.log(`🟢 Starting ${facingMode} camera (square format)...`)

      // SQUARE VIDEO CONSTRAINTS for consistent server feeds
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 512, min: 320, max: 1024 },
          height: { ideal: 512, min: 320, max: 1024 },
          aspectRatio: { ideal: 1.0 }, // Force square aspect ratio
          facingMode: facingMode === 'front' ? 'user' : 'environment',
          frameRate: { ideal: 30, max: 30 } // Consistent frame rate
        },
        audio: false
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = newStream
      setStream(newStream)
      console.log(`✅ ${facingMode} camera started (square format)`)

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
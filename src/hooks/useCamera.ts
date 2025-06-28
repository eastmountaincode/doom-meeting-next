import { useState, useEffect, useRef } from 'react'

export function useCamera(selectedCamera: 'front' | 'back' | null) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Stop current stream with logging
  const stopStream = () => {
    if (stream) {
      console.log('🔴 Stopping camera stream...')
      stream.getTracks().forEach(track => {
        console.log(`Stopping ${track.kind} track`)
        track.stop()
      })
      setStream(null)
      console.log('✅ Camera stream stopped')
    }
  }

  // Check if camera API is available
  const isCameraSupported = () => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  }

  // Start camera with specified facing mode
  const startCamera = async (facingMode: 'front' | 'back') => {
    try {
      setIsLoading(true)
      setError(null)

      // Check for camera support first
      if (!isCameraSupported()) {
        throw new Error('Camera access requires HTTPS. Please use HTTPS or localhost.')
      }

      // Stop any existing stream first
      stopStream()

      console.log(`🟢 Starting ${facingMode} camera...`)

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: facingMode === 'front' ? 'user' : 'environment'
        },
        audio: false
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(newStream)
      console.log(`✅ ${facingMode} camera started`)

      // Set video source
      if (videoRef.current) {
        videoRef.current.srcObject = newStream
      }

    } catch (err: any) {
      console.error('Camera access error:', err)
      
      // Provide more helpful error messages
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access.')
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.')
      } else if (err.message.includes('HTTPS')) {
        setError('HTTPS required for camera access.')
      } else {
        setError(err.message)
      }
    } finally {
      setIsLoading(false)
    }
  }

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
  }, [selectedCamera])

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
  }, [])

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
'use client'

import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { useEffect, useState, useRef } from "react"
import * as THREE from "three"
import { 
    LiveKitRoom, 
    VideoTrack, 
    useRemoteParticipants,
    useTracks,
    TrackReferenceOrPlaceholder,
} from "@livekit/components-react"
import { Track } from "livekit-client"
import { useVideoSquares } from '../../../hooks/useVideoSquares'
import { VideoSquare as VideoSquareType } from '../../../types/videoSquare'

// Simple square component for physics - video will be overlaid via DOM
function VideoSquare({ square }: { square: VideoSquareType }) {
  const meshRef = useRef<THREE.Mesh>(null)

  // Update position every frame  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(...square.position)
    }
  })

  return (
    <mesh ref={meshRef} position={square.position}>
      <planeGeometry args={[square.size, square.size]} />
      <meshBasicMaterial 
        color="#000000" // Black squares for video overlay
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// Main squares component with physics  
function MovingSquares({ participantTracks, onSquaresUpdate, baseSpeed }: { 
  participantTracks: TrackReferenceOrPlaceholder[], 
  onSquaresUpdate?: (squares: VideoSquareType[]) => void,
  baseSpeed: number
}) {
  const { 
    squares, 
    addParticipant, 
    removeParticipant, 
    updateSquareVideo,
    manager 
  } = useVideoSquares()

  const squareVelocities = useRef<Map<string, [number, number]>>(new Map())

  const { size, camera, gl } = useThree()
  
  // Get actual participants from LiveKit (more reliable than tracks)
  const remoteParticipants = useRemoteParticipants()
  
  // Time-based frame rate control (same as webgl-test-3)
  const TARGET_FPS = 30
  const targetFrameTime = 1000 / TARGET_FPS // milliseconds per frame
  const lastUpdateTime = useRef(0)

  // Update world bounds when canvas size changes
  useEffect(() => {
    if (manager) {
      const worldHeight = 16
      const worldWidth = worldHeight * (size.width / size.height)
      manager.updateWorldBounds(worldWidth, worldHeight)
    }
  }, [size, manager])

  // Sync participants with VideoSquare system using actual participants (not tracks)
  useEffect(() => {
    const currentParticipantIds = new Set(squares.map(s => s.participantId))
    
    // Use actual LiveKit participants (they persist during camera switches)
    const liveParticipantIds = new Set(
      remoteParticipants
        .filter(participant => !participant.identity.startsWith('admin') && !participant.identity.startsWith('display'))
        .map(participant => participant.identity)
    )

    // Only remove participants who have actually left the room
    for (const id of currentParticipantIds) {
      if (!liveParticipantIds.has(id)) {
        removeParticipant(id)
      }
    }

    // Add new participants who joined
    for (const participant of remoteParticipants) {
      const id = participant.identity
      if (!id.startsWith('admin') && !id.startsWith('display') && !currentParticipantIds.has(id)) {
        addParticipant(id, { color: generateParticipantColor(id) })
      }
    }

    // Update video tracks for all participants with active tracks
    for (const track of participantTracks) {
      const id = track.participant.identity
      const videoTrack = track.publication?.track
      if (videoTrack instanceof MediaStreamTrack) {
        updateSquareVideo(id, videoTrack)
      }
    }
    
  }, [participantTracks, remoteParticipants, squares, addParticipant, removeParticipant, updateSquareVideo])

  // Update velocities when base speed changes
  useEffect(() => {
    squares.forEach(square => {
      const currentVel = squareVelocities.current.get(square.participantId)
      if (currentVel) {
        // Scale existing velocity to new base speed
        const currentSpeed = Math.sqrt(currentVel[0] * currentVel[0] + currentVel[1] * currentVel[1])
        if (currentSpeed > 0) {
          const scale = baseSpeed / currentSpeed
          squareVelocities.current.set(square.participantId, [
            currentVel[0] * scale,
            currentVel[1] * scale
          ])
        }
      } else {
        // Generate new velocity with current base speed
        squareVelocities.current.set(square.participantId, [
          (Math.random() - 0.5) * baseSpeed * 2,
          (Math.random() - 0.5) * baseSpeed * 2
        ])
      }
    })
  }, [baseSpeed, squares])

  // Physics animation loop (same frame rate control as webgl-test-3)
  useFrame(() => {
    const currentTime = performance.now()
    
    // Only update if enough time has passed for target frame rate
    if (currentTime - lastUpdateTime.current < targetFrameTime) {
      return
    }
    
    lastUpdateTime.current = currentTime

    if (!manager) return

    const worldHeight = 16
    const worldWidth = worldHeight * (size.width / size.height)
    const halfWidth = worldWidth / 2
    const halfHeight = worldHeight / 2

    squares.forEach(square => {
      // Get or initialize velocity
      let velocity = squareVelocities.current.get(square.participantId)
      if (!velocity) {
        velocity = [...square.velocity]
        squareVelocities.current.set(square.participantId, velocity)
      }

      // Update position
      square.position[0] += velocity[0]
      square.position[1] += velocity[1]

      const halfSize = square.size / 2
      
      // Bounce off walls
      if (square.position[0] + halfSize > halfWidth) {
        square.position[0] = halfWidth - halfSize
        velocity[0] = -Math.abs(velocity[0])
      } else if (square.position[0] - halfSize < -halfWidth) {
        square.position[0] = -halfWidth + halfSize
        velocity[0] = Math.abs(velocity[0])
      }
      
      if (square.position[1] + halfSize > halfHeight) {
        square.position[1] = halfHeight - halfSize
        velocity[1] = -Math.abs(velocity[1])
      } else if (square.position[1] - halfSize < -halfHeight) {
        square.position[1] = -halfHeight + halfSize
        velocity[1] = Math.abs(velocity[1])
      }

      // Update stored velocity
      squareVelocities.current.set(square.participantId, velocity)
      
      // Update video overlay position for this square
      const videoElement = document.querySelector(`.video-overlay-${square.participantId}`) as HTMLElement
      const canvas = gl.domElement
      if (videoElement && canvas) {
        // Get canvas position on the page
        const canvasRect = canvas.getBoundingClientRect()
        
        // Convert 3D world coordinates to screen coordinates
        const vector = new THREE.Vector3(square.position[0], square.position[1], square.position[2])
        vector.project(camera)
        
        // Convert to screen pixels relative to canvas
        const screenX = (vector.x * 0.5 + 0.5) * canvasRect.width
        const screenY = (-vector.y * 0.5 + 0.5) * canvasRect.height
        
        // Calculate video size based on square's world size and current zoom
        const squarePixelSize = (square.size / worldHeight) * canvasRect.height
        
        // Position relative to the canvas container
        videoElement.style.left = `${screenX}px`
        videoElement.style.top = `${screenY}px`
        videoElement.style.width = `${squarePixelSize}px`
        videoElement.style.height = `${squarePixelSize}px`
        videoElement.style.transform = 'translate(-50%, -50%)'
      }
    })

    // Square-to-square collision detection (exact same as webgl-test-3)
    for (let i = 0; i < squares.length; i++) {
      for (let j = i + 1; j < squares.length; j++) {
        const squareA = squares[i]
        const squareB = squares[j]
        
        const x1 = squareA.position[0]
        const y1 = squareA.position[1] 
        const x2 = squareB.position[0]
        const y2 = squareB.position[1]
        const size1 = squareA.size
        const size2 = squareB.size

        // AABB collision detection with different sizes (same as webgl-test-3)
        if (
          Math.abs(x1 - x2) < (size1 + size2) / 2 &&
          Math.abs(y1 - y2) < (size1 + size2) / 2
        ) {
          // Small separation push to prevent sticking (same as webgl-test-3)
          const dx = x2 - x1
          const dy = y2 - y1
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance > 0.001) {
            // Normalize and apply tiny separation (same force as webgl-test-3)
            const separationForce = 0.02
            const separationX = (dx / distance) * separationForce
            const separationY = (dy / distance) * separationForce
            
            // Calculate new positions after separation
            let newX1 = squareA.position[0] - separationX
            let newY1 = squareA.position[1] - separationY
            let newX2 = squareB.position[0] + separationX
            let newY2 = squareB.position[1] + separationY
            
            // Clamp positions to stay within world bounds (same as webgl-test-3)
            newX1 = Math.max(-halfWidth + size1/2, Math.min(halfWidth - size1/2, newX1))
            newY1 = Math.max(-halfHeight + size1/2, Math.min(halfHeight - size1/2, newY1))
            newX2 = Math.max(-halfWidth + size2/2, Math.min(halfWidth - size2/2, newX2))
            newY2 = Math.max(-halfHeight + size2/2, Math.min(halfHeight - size2/2, newY2))
            
            // Apply the clamped positions
            squareA.position[0] = newX1
            squareA.position[1] = newY1
            squareB.position[0] = newX2
            squareB.position[1] = newY2

            // Collision detected: swap velocities (same as webgl-test-3)
            const velA = squareVelocities.current.get(squareA.participantId) || [0, 0]
            const velB = squareVelocities.current.get(squareB.participantId) || [0, 0]
            
            squareVelocities.current.set(squareA.participantId, [velB[0], velB[1]])
            squareVelocities.current.set(squareB.participantId, [velA[0], velA[1]])
          }
        }
      }
    }
  })

  // Cleanup velocities when squares are removed
  useEffect(() => {
    const currentIds = new Set(squares.map(s => s.participantId))
    for (const [id] of squareVelocities.current) {
      if (!currentIds.has(id)) {
        squareVelocities.current.delete(id)
      }
    }
  }, [squares])
  
  // Notify parent component about squares updates
  useEffect(() => {
    if (onSquaresUpdate) {
      onSquaresUpdate(squares)
    }
  }, [squares, onSquaresUpdate])

  return (
    <>
      {squares.map(square => {
        return (
          <VideoSquare 
            key={square.participantId}
            square={square}
          />
        )
      })}
    </>
  )
}

// Responsive camera
function ResponsiveCamera() {
  const { camera, size } = useThree()
  
  useEffect(() => {
    if (camera.type === 'OrthographicCamera') {
      const worldHeight = 16
      camera.zoom = size.height / worldHeight
      camera.updateProjectionMatrix()
    }
  }, [camera, size])
  
  return null
}

// Canvas size hook
function useCanvasSize() {
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 480 })
  
  useEffect(() => {
    const updateSize = () => {
      const maxWidth = window.innerWidth // Full viewport width
      const maxHeight = window.innerHeight // Full viewport height
      
      setCanvasSize({ 
        width: Math.round(maxWidth), 
        height: Math.round(maxHeight) 
      })
    }
    
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])
  
  return canvasSize
}

// Video overlays component (renders outside Canvas)
function LiveKitVideoOverlays({ squares, participantTracks, canvasSize }: { 
  squares: VideoSquareType[], 
  participantTracks: TrackReferenceOrPlaceholder[], 
  canvasSize: { width: number, height: number } 
}) {
  const worldHeight = 16
  const worldWidth = worldHeight * (canvasSize.width / canvasSize.height)
  
  // Convert world coordinates to pixel coordinates
  const worldToPixel = (worldPos: [number, number, number], size: number) => {
    const pixelX = ((worldPos[0] + worldWidth / 2) / worldWidth) * canvasSize.width
    const pixelY = ((-worldPos[1] + worldHeight / 2) / worldHeight) * canvasSize.height // Flip Y
    const pixelSize = (size / worldHeight) * canvasSize.height
    
    return {
      left: pixelX - pixelSize / 2,
      top: pixelY - pixelSize / 2,
      width: pixelSize,
      height: pixelSize
    }
  }
  
  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{
        width: canvasSize.width,
        height: canvasSize.height,
      }}
    >
      {squares.map(square => {
        // Find corresponding video track
        const trackRef = participantTracks.find(
          track => track.participant.identity === square.participantId
        )
        
        const position = worldToPixel(square.position, square.size)
        
        // Check camera facing from metadata
        let cameraFacing = 'back'
        try {
          const metadata = trackRef?.participant.metadata
          if (metadata) {
            const parsed = JSON.parse(metadata)
            cameraFacing = parsed.cameraFacing || 'back'
          }
        } catch {
          // Metadata parsing failed, default to back camera
        }
        
        return (
          <div
            key={square.participantId}
            className={`absolute video-overlay-${square.participantId}`}
            style={{
              left: position.left,
              top: position.top,
              width: position.width,
              height: position.height,
              borderRadius: '4px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              backgroundColor: trackRef?.publication?.isSubscribed ? 'transparent' : '#000'
            }}
          >
            {/* Only render video if track is subscribed */}
            {trackRef?.publication?.isSubscribed && (
              <VideoTrack
                trackRef={trackRef}
                className={`w-full h-full object-cover ${
                  cameraFacing === 'front' ? 'scale-x-[-1]' : ''
                }`}
              />
            )}
            
            {/* Always show participant name label */}
            <div 
              className="absolute bottom-0 left-0 bg-black bg-opacity-80 px-1 py-0.5 text-white font-medium"
              style={{ fontSize: Math.max(8, position.width * 0.08) }}
            >
              {square.participantId}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Generate consistent color for participant
function generateParticipantColor(participantId: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F39C12',
    '#E74C3C', '#9B59B6', '#3498DB', '#1ABC9C'
  ]
  
  // Simple hash to get consistent color
  let hash = 0
  for (let i = 0; i < participantId.length; i++) {
    hash = participantId.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}

// LiveKit integration component with video overlay system
function VideoSquareDisplay() {
  const canvasSize = useCanvasSize()
  const [squares, setSquares] = useState<VideoSquareType[]>([])
  const [currentBaseSpeed, setCurrentBaseSpeed] = useState(0.06)
  
  // Listen for admin base speed changes via Pusher
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pusher: any = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null

    const connectToPusher = async () => {
      try {
        const Pusher = (await import('pusher-js')).default
        
        pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        })
        
        channel = pusher.subscribe('display-channel')
        
        channel.bind('display-screen-event', (data: { type: string; baseSpeed?: number }) => {
          console.log('Received display event:', data)
          
          if (data.type === 'SET_BASE_SPEED' && data.baseSpeed !== undefined) {
            console.log('Updating base speed to:', data.baseSpeed)
            setCurrentBaseSpeed(data.baseSpeed)
          }
        })
        
        pusher.connection.bind('connected', () => {
          console.log('Pusher connected for speed control!')
        })
        
      } catch (error) {
        console.error('Failed to initialize Pusher:', error)
      }
    }

    connectToPusher()

    return () => {
      if (channel) {
        channel.unbind_all()
        pusher?.unsubscribe('display-channel')
      }
      if (pusher) {
        pusher.disconnect()
      }
    }
  }, [])
  
  // Get participant video tracks (excluding admin)
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: false },
  ], { onlySubscribed: false })
  
  const participantTracks = tracks.filter(
    track => !track.participant.identity.startsWith('admin') &&
             !track.participant.identity.startsWith('display') &&
             track.publication && 
             track.publication.isSubscribed
  )
  
  // Also include unsubscribed tracks for broader compatibility
  const allParticipantTracks = tracks.filter(
    track => !track.participant.identity.startsWith('admin') &&
             !track.participant.identity.startsWith('display') &&
             track.publication
  )
  
  const tracksToUse = participantTracks.length > 0 ? participantTracks : allParticipantTracks
  
  return (
    <div className="h-screen w-screen bg-white">
      <div 
        style={{ 
          width: canvasSize.width, 
          height: canvasSize.height 
        }}
        className="relative"
      >
        <Canvas
          orthographic
          camera={{ position: [0, 0, 100] }}
          className="bg-white"
          style={{ width: "100%", height: "100%" }}
        >
          <ResponsiveCamera />
                      <MovingSquares 
              participantTracks={tracksToUse} 
              onSquaresUpdate={setSquares}
              baseSpeed={currentBaseSpeed}
            />
        </Canvas>
        
        {/* Video Overlays */}
        <LiveKitVideoOverlays 
          squares={squares}
          participantTracks={tracksToUse}
          canvasSize={canvasSize}
        />
      </div>
    </div>
  )
}

// Main page component with LiveKit connection
export default function DisplayNewPage() {
  const [token, setToken] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [displayId] = useState(() => `display-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

  // Generate token for display with unique identity
  useEffect(() => {
    const generateToken = async () => {
      try {
        setIsLoading(true)
        setError('')
        
        const response = await fetch(
          `/api/token?room=doom&username=${displayId}`
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
        console.error('Token generation failed:', err)
        setError(err instanceof Error ? err.message : 'Failed to generate token')
      } finally {
        setIsLoading(false)
      }
    }

    generateToken()
  }, [displayId])

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-white flex items-center justify-center">
        <div className="text-center text-black">
          <div className="text-6xl mb-8">🔗</div>
          <p className="text-2xl font-semibold">Connecting to DOOM Meeting...</p>
          <p className="text-lg text-gray-600 mt-2">Initializing video squares system</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen w-screen bg-white flex items-center justify-center">
        <div className="text-center text-red-600">
          <div className="text-6xl mb-8">⚠️</div>
          <p className="text-2xl mb-4">Connection Failed</p>
          <p className="text-lg bg-red-50 p-4 rounded">{error}</p>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="h-screen w-screen bg-white flex items-center justify-center">
        <div className="text-center text-gray-600">
          <div className="text-6xl mb-8">🎫</div>
          <p className="text-2xl">No access token</p>
        </div>
      </div>
    )
  }

  return (
    <LiveKitRoom
      video={false}
      audio={false}
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      onError={(error) => setError(`LiveKit connection failed: ${error.message}`)}
      data-lk-theme="default"
      style={{ height: "100vh" }}
    >
      <VideoSquareDisplay />
    </LiveKitRoom>
  )
} 
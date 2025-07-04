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
import QRCode from '../../../components/QRCode'

// Store collision shapes for each participant
const participantCollisionShapes = new Map<string, Array<{x: number, y: number}>>()

// Polygon collision detection using SAT (Separating Axis Theorem)
function getPolygonAxes(vertices: Array<{x: number, y: number}>): Array<{x: number, y: number}> {
  const axes: Array<{x: number, y: number}> = []
  for (let i = 0; i < vertices.length; i++) {
    const v1 = vertices[i]
    const v2 = vertices[(i + 1) % vertices.length]
    const edge = { x: v2.x - v1.x, y: v2.y - v1.y }
    const normal = { x: -edge.y, y: edge.x }
    const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y)
    axes.push({ x: normal.x / length, y: normal.y / length })
  }
  return axes
}

function projectPolygon(vertices: Array<{x: number, y: number}>, axis: {x: number, y: number}): {min: number, max: number} {
  let min = vertices[0].x * axis.x + vertices[0].y * axis.y
  let max = min
  for (let i = 1; i < vertices.length; i++) {
    const dot = vertices[i].x * axis.x + vertices[i].y * axis.y
    if (dot < min) min = dot
    if (dot > max) max = dot
  }
  return { min, max }
}

function polygonsCollide(vertices1: Array<{x: number, y: number}>, pos1: [number, number], size1: number,
                        vertices2: Array<{x: number, y: number}>, pos2: [number, number], size2: number): boolean {
  // Transform vertices to world positions
  const worldVertices1 = vertices1.map(v => ({
    x: pos1[0] + v.x * size1,
    y: pos1[1] + v.y * size1
  }))
  const worldVertices2 = vertices2.map(v => ({
    x: pos2[0] + v.x * size2,
    y: pos2[1] + v.y * size2
  }))
  
  // Get all axes to test
  const axes1 = getPolygonAxes(worldVertices1)
  const axes2 = getPolygonAxes(worldVertices2)
  const allAxes = [...axes1, ...axes2]
  
  // Test separation on each axis
  for (const axis of allAxes) {
    const proj1 = projectPolygon(worldVertices1, axis)
    const proj2 = projectPolygon(worldVertices2, axis)
    
    if (proj1.max < proj2.min || proj2.max < proj1.min) {
      return false // Separating axis found
    }
  }
  
  return true // No separating axis found, polygons collide
}

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
        color="#000000"
        side={THREE.DoubleSide}
        transparent={true}
        opacity={0} // Completely invisible - only blobs visible
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
        // Clean up collision shape
        participantCollisionShapes.delete(id)
      }
    }

    // Add new participants who joined
    for (const participant of remoteParticipants) {
      const id = participant.identity
      if (!id.startsWith('admin') && !id.startsWith('display') && !currentParticipantIds.has(id)) {
        // Generate and store collision shape for this participant
        const shapeData = generateParticipantShape(id)
        participantCollisionShapes.set(id, shapeData.collisionVertices)
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

  // Store previous base speed to detect changes
  const prevBaseSpeed = useRef(baseSpeed)
  
  // Update velocities when base speed changes (not when squares change)
  useEffect(() => {
    if (prevBaseSpeed.current !== baseSpeed) {
      // Only update if base speed actually changed - scale all existing velocities
      for (const [participantId, currentVel] of squareVelocities.current) {
        const currentSpeed = Math.sqrt(currentVel[0] * currentVel[0] + currentVel[1] * currentVel[1])
        if (currentSpeed > 0) {
          const scale = baseSpeed / currentSpeed
          squareVelocities.current.set(participantId, [
            currentVel[0] * scale,
            currentVel[1] * scale
          ])
        }
      }
      // If resuming from 0, give a random kick to stationary squares
      if (prevBaseSpeed.current === 0 && baseSpeed > 0) {
        for (const [participantId, currentVel] of squareVelocities.current) {
          if (currentVel[0] === 0 && currentVel[1] === 0) {
            // Random direction
            const angle = Math.random() * 2 * Math.PI
            squareVelocities.current.set(participantId, [
              Math.cos(angle) * baseSpeed,
              Math.sin(angle) * baseSpeed
            ])
          }
        }
      }
      prevBaseSpeed.current = baseSpeed
    }
  }, [baseSpeed])

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
      const videoElement = document.querySelector(`[data-participant-id="${square.participantId}"]`) as HTMLElement
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

    // Polygon-to-polygon collision detection using actual blob shapes
    for (let i = 0; i < squares.length; i++) {
      for (let j = i + 1; j < squares.length; j++) {
        const squareA = squares[i]
        const squareB = squares[j]
        
        // Get collision shapes for both participants
        const shapeA = participantCollisionShapes.get(squareA.participantId)
        const shapeB = participantCollisionShapes.get(squareB.participantId)
        
        let collision = false
        
        if (shapeA && shapeB) {
          // Use actual polygon collision detection
          collision = polygonsCollide(
            shapeA, [squareA.position[0], squareA.position[1]], squareA.size,
            shapeB, [squareB.position[0], squareB.position[1]], squareB.size
          )
        } else {
          // Fallback to distance-based collision if shapes not available
          const dx = squareB.position[0] - squareA.position[0]
          const dy = squareB.position[1] - squareA.position[1]
          const distance = Math.sqrt(dx * dx + dy * dy)
          const minDistance = (squareA.size + squareB.size) / 2.2
          collision = distance < minDistance
        }
        
        if (collision) {
          // Collision detected - apply separation and velocity swap
          const dx = squareB.position[0] - squareA.position[0]
          const dy = squareB.position[1] - squareA.position[1]
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance > 0.001) {
            // Normalize and apply separation
            const separationForce = 0.02
            const separationX = (dx / distance) * separationForce
            const separationY = (dy / distance) * separationForce
            
            // Calculate new positions after separation
            let newX1 = squareA.position[0] - separationX
            let newY1 = squareA.position[1] - separationY
            let newX2 = squareB.position[0] + separationX
            let newY2 = squareB.position[1] + separationY
            
            // Clamp positions to stay within world bounds
            const size1 = squareA.size
            const size2 = squareB.size
            newX1 = Math.max(-halfWidth + size1/2, Math.min(halfWidth - size1/2, newX1))
            newY1 = Math.max(-halfHeight + size1/2, Math.min(halfHeight - size1/2, newY1))
            newX2 = Math.max(-halfWidth + size2/2, Math.min(halfWidth - size2/2, newX2))
            newY2 = Math.max(-halfHeight + size2/2, Math.min(halfHeight - size2/2, newY2))
            
            // Apply the clamped positions
            squareA.position[0] = newX1
            squareA.position[1] = newY1
            squareB.position[0] = newX2
            squareB.position[1] = newY2

            // Collision detected: swap velocities
            const velA = squareVelocities.current.get(squareA.participantId) || [0, 0]
            const velB = squareVelocities.current.get(squareB.participantId) || [0, 0]
            
            squareVelocities.current.set(squareA.participantId, [velB[0], velB[1]])
            squareVelocities.current.set(squareB.participantId, [velA[0], velA[1]])
          }
        }
      }
    }
  })

  // Cleanup velocities and collision shapes when squares are removed
  useEffect(() => {
    const currentIds = new Set(squares.map(s => s.participantId))
    for (const [id] of squareVelocities.current) {
      if (!currentIds.has(id)) {
        squareVelocities.current.delete(id)
        participantCollisionShapes.delete(id)
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
function LiveKitVideoOverlays({ squares, participantTracks, canvasSize, showNameLabels }: { 
  squares: VideoSquareType[], 
  participantTracks: TrackReferenceOrPlaceholder[], 
  canvasSize: { width: number, height: number },
  showNameLabels: boolean
}) {
  // Get remote participants to access metadata directly
  const remoteParticipants = useRemoteParticipants()
  
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
        
        // Find participant from remoteParticipants for metadata (more reliable)
        const participant = remoteParticipants.find(
          p => p.identity === square.participantId
        )
        
        // Check camera facing from metadata
        let cameraFacing = 'back'
        try {
          const metadata = participant?.metadata
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
            className="absolute"
            data-participant-id={square.participantId}
            style={{ width: '100%', height: '100%' }}
          >
            <div className="relative flex flex-col items-center w-full h-full">
              {/* Blob video shape */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  clipPath: generateParticipantShape(square.participantId).clipPath,
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  backgroundColor: trackRef?.publication?.isSubscribed ? 'transparent' : '#000',
                }}
              >
                {trackRef?.publication?.isSubscribed && (
                  <VideoTrack
                    trackRef={trackRef}
                    className={`w-full h-full object-cover ${
                      cameraFacing === 'front' ? 'scale-x-[-1]' : ''
                    }`}
                  />
                )}
              </div>
              {/* Name label conditionally visible below the blob */}
              {showNameLabels && (() => {
                const displayName = getParticipantDisplayName(participant || {})
                if (displayName) {
                  return (
                    <div
                      className="bg-black bg-opacity-80 px-0 py-0 text-white font-medium rounded text-center"
                      style={{
                        fontSize: '1.1em',
                        pointerEvents: 'auto',
                        zIndex: 10,
                        minWidth: '60px',
                        maxWidth: '120px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginTop: '-2.5em',
                      }}
                    >
                      {displayName}
                    </div>
                  )
                }
                return null
              })()}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Helper function to extract display name from participant metadata
function getParticipantDisplayName(participant: { metadata?: string }): string {
  try {
    const metadata = participant.metadata
    if (metadata) {
      const parsed = JSON.parse(metadata)
      // Only return the displayName if it exists in metadata
      if (parsed.displayName) {
        return parsed.displayName
      }
    }
  } catch {
    // Metadata parsing failed
  }
  
  // Don't show the long unique identifier - return empty string instead
  return ''
}

// Generate round/circular shape and return both CSS and collision data
function generateParticipantShape(participantId: string): { 
  clipPath: string, 
  collisionVertices: Array<{x: number, y: number}> 
} {
  // Use participant ID as seed for consistent shapes
  let seed = 0
  for (let i = 0; i < participantId.length; i++) {
    seed = participantId.charCodeAt(i) + ((seed << 5) - seed)
  }
  
  // Seeded random function
  const seededRandom = (min: number, max: number) => {
    seed = (seed * 9301 + 49297) % 233280
    return min + (seed / 233280) * (max - min)
  }
  
  // Generate 16-24 points for very smooth, round shapes
  const numPoints = Math.floor(seededRandom(16, 25))
  const cssPoints: string[] = []
  const collisionVertices: Array<{x: number, y: number}> = []
  
  for (let i = 0; i < numPoints; i++) {
    // Even angle distribution for circular shape
    const baseAngle = (i / numPoints) * 360
    const angleVariation = seededRandom(-2, 2) // Minimal variation for round shapes
    const angle = baseAngle + angleVariation
    
    // Keep radius very consistent for circular shapes: 46% to 49% from center
    const radius = seededRandom(46, 49)
    
    // Convert polar to cartesian, centered at 50%, 50%
    const cssX = Math.max(5, Math.min(95, 50 + radius * Math.cos(angle * Math.PI / 180)))
    const cssY = Math.max(5, Math.min(95, 50 + radius * Math.sin(angle * Math.PI / 180)))
    
    // CSS points (percentages)
    cssPoints.push(`${cssX.toFixed(1)}% ${cssY.toFixed(1)}%`)
    
    // Collision vertices (normalized -0.5 to 0.5 for square size)
    const collisionX = (cssX - 50) / 100 // Convert from 0-100% to -0.5 to 0.5
    const collisionY = (cssY - 50) / 100
    collisionVertices.push({ x: collisionX, y: collisionY })
  }
  
  return {
    clipPath: `polygon(${cssPoints.join(', ')})`,
    collisionVertices
  }
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

function hslToHex(h: number, s: number, l: number) {
  // Convert h,s,l (0-360, 0-100, 0-100) to hex string
      s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }
  const toHex = (v: number) => {
    const h = Math.round((v + m) * 255).toString(16)
    return h.length === 1 ? '0' + h : h
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// LiveKit integration component with video overlay system
function VideoSquareDisplay() {
  const canvasSize = useCanvasSize()
  const [squares, setSquares] = useState<VideoSquareType[]>([])
  const [currentBaseSpeed, setCurrentBaseSpeed] = useState(0.06)
  const [showNameLabels, setShowNameLabels] = useState(true)
  const [showQrCode, setShowQrCode] = useState(true)
  const [qrCodeColor, setQrCodeColor] = useState<'black' | 'white'>('white')
  const [backgroundColor, setBackgroundColor] = useState<string>('#000000')
  const [colorCycleActive, setColorCycleActive] = useState(false)
  const [colorCycleSaturation, setColorCycleSaturation] = useState(0) // Start with 0, will be set by admin
  const [colorCycleLightness, setColorCycleLightness] = useState(100) // Start with 100, will be set by admin
  const [colorCycleSpeed, setColorCycleSpeed] = useState(30)
  const [colorCycleStartTime, setColorCycleStartTime] = useState(0)
  const colorCycleRef = useRef(false)
  const animationFrameRef = useRef<number | null>(null)
  const currentDisplayedColorRef = useRef<string>('#000000') // Track the actual displayed color at all times
  
  // Color transition state
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionStartColor, setTransitionStartColor] = useState('#000000')
  const [transitionTargetColor, setTransitionTargetColor] = useState('#000000')
  const [transitionStartTime, setTransitionStartTime] = useState(0)
  const transitionDuration = 1000 // 1000ms transition (1 second)

  // Function to interpolate between two hex colors
  const interpolateColors = (color1: string, color2: string, factor: number): string => {
    // Convert hex to RGB
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 }
    }
    
    // Convert RGB to hex
    const rgbToHex = (r: number, g: number, b: number) => {
      const toHex = (n: number) => {
        const hex = Math.round(n).toString(16)
        return hex.length === 1 ? '0' + hex : hex
      }
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`
    }
    
    const rgb1 = hexToRgb(color1)
    const rgb2 = hexToRgb(color2)
    
    const r = rgb1.r + (rgb2.r - rgb1.r) * factor
    const g = rgb1.g + (rgb2.g - rgb1.g) * factor
    const b = rgb1.b + (rgb2.b - rgb1.b) * factor
    
    return rgbToHex(r, g, b)
  }

  // Function to send current color back to admin
  const sendColorUpdateToAdmin = async (color: string) => {
    try {
      await fetch('/api/admin/trigger-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'DISPLAY_COLOR_UPDATE',
          backgroundColor: color,
        }),
      })
    } catch (error) {
      console.error('Failed to send color update to admin:', error)
    }
  }

  // Color cycling animation (display side)
  useEffect(() => {
    if (!colorCycleActive || isTransitioning) {
      colorCycleRef.current = false
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      return
    }
    colorCycleRef.current = true
    const animate = () => {
      if (!colorCycleRef.current || isTransitioning) return
      const now = Date.now()
      const elapsed = now - colorCycleStartTime
      const hue = (elapsed / colorCycleSpeed) % 360
      const hexColor = hslToHex(hue, colorCycleSaturation, colorCycleLightness)
      setBackgroundColor(hexColor)
      currentDisplayedColorRef.current = hexColor // Track the actual displayed color
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    animate()
    return () => {
      colorCycleRef.current = false
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [colorCycleActive, colorCycleSaturation, colorCycleLightness, colorCycleSpeed, colorCycleStartTime, isTransitioning])

  // Color transition animation
  useEffect(() => {
    if (!isTransitioning) return
    
    const animateTransition = () => {
      const now = Date.now()
      const elapsed = now - transitionStartTime
      const progress = Math.min(elapsed / transitionDuration, 1)
      
      // Use ease-in-out easing
      const easedProgress = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2
      
      const currentColor = interpolateColors(transitionStartColor, transitionTargetColor, easedProgress)
      setBackgroundColor(currentColor)
      
      if (progress < 1) {
        requestAnimationFrame(animateTransition)
      } else {
        setIsTransitioning(false)
      }
    }
    
    animateTransition()
  }, [isTransitioning, transitionStartColor, transitionTargetColor, transitionStartTime, transitionDuration])

  // Track the actual displayed color whenever backgroundColor changes
  useEffect(() => {
    currentDisplayedColorRef.current = backgroundColor
  }, [backgroundColor])

  // Listen for admin events via Pusher
  useEffect(() => {
    let pusher: { subscribe: (channel: string) => { bind: (event: string, callback: (data: { type: string; baseSpeed?: number; showNameLabels?: boolean; showQrCode?: boolean; qrCodeColor?: 'black' | 'white'; backgroundColor?: string; saturation?: number; lightness?: number; speed?: number; startHue?: number }) => void) => void; unbind_all: () => void }; connection: { bind: (event: string, callback: () => void) => void }; unsubscribe: (channel: string) => void; disconnect: () => void } | null = null
    let channel: { bind: (event: string, callback: (data: { type: string; baseSpeed?: number; showNameLabels?: boolean; showQrCode?: boolean; qrCodeColor?: 'black' | 'white'; backgroundColor?: string; saturation?: number; lightness?: number; speed?: number; startHue?: number }) => void) => void; unbind_all: () => void } | null = null

    const connectToPusher = async () => {
      try {
        const Pusher = (await import('pusher-js')).default
        pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        }) as typeof pusher
        if (pusher) {
          channel = pusher.subscribe('display-channel')
          channel.bind('display-screen-event', (data: { type: string; baseSpeed?: number; showNameLabels?: boolean; showQrCode?: boolean; qrCodeColor?: 'black' | 'white'; backgroundColor?: string; saturation?: number; lightness?: number; speed?: number; startHue?: number }) => {
          console.log('Received display event:', data)
          if (data.type === 'SET_BASE_SPEED' && data.baseSpeed !== undefined) {
            setCurrentBaseSpeed(data.baseSpeed)
          }
          if (data.type === 'TOGGLE_NAME_LABELS' && data.showNameLabels !== undefined) {
            setShowNameLabels(data.showNameLabels)
          }
          if (data.type === 'TOGGLE_QR_CODE' && data.showQrCode !== undefined) {
            setShowQrCode(data.showQrCode)
          }
          if (data.type === 'SET_QR_CODE_COLOR' && data.qrCodeColor !== undefined) {
            setQrCodeColor(data.qrCodeColor)
          }
          if (data.type === 'SET_BACKGROUND_COLOR' && data.backgroundColor) {
            setBackgroundColor(data.backgroundColor)
            setColorCycleActive(false)
            colorCycleRef.current = false
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
          }
          if (data.type === 'SET_BACKGROUND_COLOR_TRANSITION' && data.backgroundColor) {
            // Start smooth transition to new color
            // Use the actual current displayed color
            const currentColor = currentDisplayedColorRef.current
            console.log('Starting transition from:', currentColor, 'to:', data.backgroundColor)
            setTransitionStartColor(currentColor)
            setTransitionTargetColor(data.backgroundColor)
            setTransitionStartTime(Date.now())
            setIsTransitioning(true)
            // Don't immediately change backgroundColor - let transition handle it
            setColorCycleActive(false)
            colorCycleRef.current = false
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
          }
          if (data.type === 'START_COLOR_CYCLE') {
            console.log('Display received START_COLOR_CYCLE with:', { 
              saturation: data.saturation, 
              lightness: data.lightness,
              speed: data.speed,
              startHue: data.startHue
            })
            setColorCycleActive(true)
            if (data.saturation !== undefined) setColorCycleSaturation(data.saturation)
            if (data.lightness !== undefined) setColorCycleLightness(data.lightness)
            if (data.speed !== undefined) setColorCycleSpeed(data.speed)
            // Calculate start time so animation begins from the current hue position
            if (data.startHue !== undefined && data.speed !== undefined) {
              const now = Date.now()
              const startTime = now - (data.startHue * data.speed)
              setColorCycleStartTime(startTime)
            }
          }
          if (data.type === 'STOP_COLOR_CYCLE') {
            setColorCycleActive(false)
            colorCycleRef.current = false
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
            // Send back the actual color that was showing during the animation
            sendColorUpdateToAdmin(currentDisplayedColorRef.current)
          }
          if (data.type === 'SET_COLOR_CYCLE_SPEED' && data.speed !== undefined) {
            console.log('Display received SET_COLOR_CYCLE_SPEED with:', { speed: data.speed })
            setColorCycleSpeed(data.speed)
          }
          })
          pusher.connection.bind('connected', () => {
            console.log('Pusher connected for speed control!')
          })
        }
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
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
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
    <div className="h-screen w-screen" style={{ background: backgroundColor }}>
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
          style={{ width: "100%", height: "100%", background: backgroundColor }}
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
          showNameLabels={showNameLabels}
        />
      </div>
      
      {/* QR Code */}
      <QRCode show={showQrCode} color={qrCodeColor} />
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
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

// Define our world boundaries (in scene units)
const WORLD_WIDTH = 30
const WORLD_HEIGHT = 16
const SQUARE_SIZE = 4

// Animation settings - consistent speed with 30fps timing
const BASE_SPEED = 0.06

// Capacity calculation
const calculateMaxCapacity = () => {
    // More realistic estimate: less conservative spacing
    const usableArea = (WORLD_WIDTH - SQUARE_SIZE) * (WORLD_HEIGHT - SQUARE_SIZE)
    const squareAreaWithSpacing = (SQUARE_SIZE * 1.1) ** 2 // Reduced from 1.5 to 1.2
    return Math.floor(usableArea / squareAreaWithSpacing)
}

const MAX_CAPACITY = calculateMaxCapacity()

// One square's data
type SquareData = {
    color: string
    position: [number, number, number]
    velocity: [number, number]
    size?: number // Optional size override
    isVideoSquare?: boolean // Special flag for video square
    participantIdentity?: string // LiveKit participant identity for video squares
}

function ResponsiveCamera() {
    const { camera, size } = useThree()
    
    useEffect(() => {
        if (camera.type === 'OrthographicCamera') {
            // Since our canvas now exactly matches world bounds, we can use a simpler zoom calculation
            camera.zoom = size.height / WORLD_HEIGHT
            camera.updateProjectionMatrix()
        }
    }, [camera, size])
    
    return null
}

// Video square component
function VideoSquare({ position, size, meshRef }: { position: [number, number, number], size: number, meshRef: any }) {
    return (
        <mesh ref={meshRef} position={position}>
            <planeGeometry args={[size, size]} />
            <meshBasicMaterial color="#000000" />
            {/* Black square - we'll overlay LiveKit video on top */}
        </mesh>
    )
}

// LiveKit Video Overlays Component (renders outside Canvas)
function LiveKitVideoOverlays({ participantTracks }: { participantTracks: any[] }) {
    return (
        <div 
            className="absolute inset-0 pointer-events-none"
            style={{
                width: '100%',
                height: '100%',
            }}
        >
            {participantTracks.map((track, index) => {
                // Check if participant is using front camera from metadata
                let cameraFacing = 'back'
                try {
                    const metadata = track.participant.metadata
                    if (metadata) {
                        const parsed = JSON.parse(metadata)
                        cameraFacing = parsed.cameraFacing || 'back'
                    }
                } catch {
                    // Metadata parsing failed, default to back camera
                }
                
                return (
                    <div
                        key={`${track.participant.identity}-${index}`}
                        className={`absolute video-overlay-${index}`}
                        style={{
                            border: '1px solid white',
                            pointerEvents: 'none',
                            borderRadius: '4px',
                            overflow: 'hidden',
                        }}
                    >
                        <VideoTrack
                            trackRef={track}
                            className={`w-full h-full object-cover ${
                                cameraFacing === 'front' ? 'scale-x-[-1]' : ''
                            }`}
                        />
                        
                        {/* Participant name overlay */}
                        <div className="absolute bottom-1 left-1 bg-black bg-opacity-80 px-1 py-0.5 text-white text-xs font-medium">
                            {(() => {
                                // Try to get display name from participant metadata, fallback to identity
                                try {
                                    const metadata = track.participant.metadata
                                    if (metadata) {
                                        const parsed = JSON.parse(metadata)
                                        return parsed.displayName || track.participant.identity
                                    }
                                } catch {
                                    // Metadata parsing failed
                                }
                                return track.participant.identity
                            })()}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// The moving squares parent logic
function MovingSquares({ participantCount }: { participantCount: number }) {
    // Dynamic squares state based on participant count
    const [squares, setSquares] = useState<SquareData[]>([])

    // Initialize or update squares based on participant count
    useEffect(() => {
        const currentCount = squares.length
        const targetCount = participantCount // Exactly match participant count
        
        if (currentCount === targetCount) return
        
        if (currentCount < targetCount) {
            // Add squares
            const newSquares = [...squares]
            for (let i = currentCount; i < targetCount; i++) {
                let position = findValidPosition(newSquares)
                if (!position) {
                    // Fallback positioning
                    const angle = (i / targetCount) * 2 * Math.PI
                    const radius = Math.min(WORLD_WIDTH, WORLD_HEIGHT) * 0.2
                    position = [
                        Math.cos(angle) * radius,
                        Math.sin(angle) * radius,
                        0
                    ]
                }
                
                newSquares.push({
                    color: "black",
                    position,
                    velocity: [
                        (Math.random() - 0.5) * BASE_SPEED * 2,
                        (Math.random() - 0.5) * BASE_SPEED * 2
                    ],
                    size: SQUARE_SIZE,
                    isVideoSquare: true,
                    participantIdentity: `participant-${i}`
                })
            }
            setSquares(newSquares)
        } else {
            // Remove squares
            setSquares(prev => prev.slice(0, targetCount))
        }
    }, [participantCount])

    // Initialize squares on first load
    useEffect(() => {
        if (squares.length === 0 && participantCount > 0) {
            const initialCount = participantCount
            const initialSquares: SquareData[] = []
            
            const positions = [
                [-5, 0, 0] as [number, number, number],
                [5, 0, 0] as [number, number, number], 
                [0, -2, 0] as [number, number, number],
                [0, 3, 0] as [number, number, number],
                [-3, -3, 0] as [number, number, number],
                [3, 3, 0] as [number, number, number]
            ]
            
            for (let i = 0; i < initialCount; i++) {
                const position = positions[i] || [
                    (Math.random() - 0.5) * WORLD_WIDTH * 0.8,
                    (Math.random() - 0.5) * WORLD_HEIGHT * 0.8,
                    0
                ] as [number, number, number]
                
                initialSquares.push({
                    color: "black",
                    position,
                    velocity: [
                        (Math.random() - 0.5) * BASE_SPEED * 2,
                        (Math.random() - 0.5) * BASE_SPEED * 2
                    ],
                    size: SQUARE_SIZE,
                    isVideoSquare: true,
                    participantIdentity: `participant-${i}`
                })
            }
            
            setSquares(initialSquares)
        }
    }, [participantCount])

    // Smart position finding with fallbacks
    function findValidPosition(existingSquares: SquareData[], attempts = 100): [number, number, number] | null {
        let separationMultiplier = 1.5 // Start with ideal spacing
        
        while (separationMultiplier >= 1.0) {
            for (let attempt = 0; attempt < attempts; attempt++) {
                const position: [number, number, number] = [
                    (Math.random() - 0.5) * (WORLD_WIDTH - SQUARE_SIZE * 2),
                    (Math.random() - 0.5) * (WORLD_HEIGHT - SQUARE_SIZE * 2),
                    0
                ]
                
                const hasCollision = existingSquares.some(existing => {
                    const existingSize = existing.size || SQUARE_SIZE
                    const dx = Math.abs(existing.position[0] - position[0])
                    const dy = Math.abs(existing.position[1] - position[1])
                    return dx < (existingSize + SQUARE_SIZE) * separationMultiplier && 
                           dy < (existingSize + SQUARE_SIZE) * separationMultiplier
                })
                
                if (!hasCollision) {
                    return position
                }
            }
            separationMultiplier -= 0.1 // Reduce spacing requirement
        }
        
        return null // No valid position found
    }

    // Squares are now automatically managed based on participant count
    // No manual add/remove functions needed

    // Store current positions for physics calculations
    const positions = useRef(squares.map(sq => [...sq.position] as [number, number, number]))
    // Store refs to the actual mesh objects
    const meshRefs = useRef<any[]>([])
    
    // Update refs when squares array changes
    useEffect(() => {
        const currentLength = positions.current.length
        const newLength = squares.length
        
        if (newLength > currentLength) {
            // Adding squares - append new positions
            for (let i = currentLength; i < newLength; i++) {
                positions.current.push([...squares[i].position] as [number, number, number])
            }
        } else if (newLength < currentLength) {
            // Removing squares - trim positions array
            positions.current = positions.current.slice(0, newLength)
        }
        
        // Update mesh refs array size
        meshRefs.current = meshRefs.current.slice(0, squares.length)
    }, [squares.length])
    
    // Get Three.js context for coordinate conversion
    const { camera, size, gl } = useThree()
    
    // Time-based frame rate control
    const TARGET_FPS = 30
    const targetFrameTime = 1000 / TARGET_FPS // milliseconds per frame
    const lastUpdateTime = useRef(0)

    useFrame(() => {
        const currentTime = performance.now()
        
        // Only update if enough time has passed for target frame rate
        if (currentTime - lastUpdateTime.current < targetFrameTime) {
            return
        }
        
        lastUpdateTime.current = currentTime
        
        // Move all squares with consistent speed
        for (let i = 0; i < positions.current.length; i++) {
            let [x, y, z] = positions.current[i]
            let [vx, vy] = squares[i].velocity
            const squareSize = squares[i].size || SQUARE_SIZE

            // Update position
            x += vx
            y += vy

            // Bounce off left/right
            if (x + squareSize / 2 > WORLD_WIDTH / 2 || x - squareSize / 2 < -WORLD_WIDTH / 2) {
                squares[i].velocity[0] *= -1
                x += squares[i].velocity[0] // Move back after bounce
            }
            // Bounce off top/bottom
            if (y + squareSize / 2 > WORLD_HEIGHT / 2 || y - squareSize / 2 < -WORLD_HEIGHT / 2) {
                squares[i].velocity[1] *= -1
                y += squares[i].velocity[1]
            }

            positions.current[i][0] = x
            positions.current[i][1] = y

            // Update the actual mesh position
            if (meshRefs.current[i]) {
                meshRefs.current[i].position.set(x, y, z)
            }
            
            // Update video overlay position for video squares
            if (squares[i].isVideoSquare) {
                const videoElement = document.querySelector(`.video-overlay-${i}`) as HTMLElement
                const canvas = gl.domElement // Get the actual canvas element
                if (videoElement && canvas) {
                    // Get canvas position on the page
                    const canvasRect = canvas.getBoundingClientRect()
                    
                    // Convert 3D world coordinates to screen coordinates
                    const vector = new THREE.Vector3(x, y, z)
                    vector.project(camera)
                    
                    // Convert to screen pixels relative to canvas
                    const screenX = (vector.x * 0.5 + 0.5) * canvasRect.width
                    const screenY = (-vector.y * 0.5 + 0.5) * canvasRect.height
                    
                    // Calculate video size based on square's world size and current zoom
                    const squareSize = squares[i].size || SQUARE_SIZE
                    const squarePixelSize = (squareSize / WORLD_HEIGHT) * canvasRect.height
                    
                    // Position relative to the canvas container (accounting for border)
                    videoElement.style.left = `${screenX + 4}px` // +4px for border-4 border
                    videoElement.style.top = `${screenY + 4}px`  // +4px for border-4 border
                    videoElement.style.width = `${squarePixelSize}px`
                    videoElement.style.height = `${squarePixelSize}px`
                    videoElement.style.transform = 'translate(-50%, -50%)'
                }
            }
        }

        // Square-to-square collision detection (brute-force: check each pair once)
        for (let i = 0; i < positions.current.length; i++) {
            for (let j = i + 1; j < positions.current.length; j++) {
                const [x1, y1] = positions.current[i]
                const [x2, y2] = positions.current[j]
                const size1 = squares[i].size || SQUARE_SIZE
                const size2 = squares[j].size || SQUARE_SIZE

                // AABB collision detection with different sizes
                if (
                    Math.abs(x1 - x2) < (size1 + size2) / 2 &&
                    Math.abs(y1 - y2) < (size1 + size2) / 2
                ) {
                    // Small separation push to prevent sticking
                    const dx = x2 - x1
                    const dy = y2 - y1
                    const distance = Math.sqrt(dx * dx + dy * dy)
                    
                    if (distance > 0.001) {
                        // Normalize and apply tiny separation
                        const separationForce = 0.02
                        const separationX = (dx / distance) * separationForce
                        const separationY = (dy / distance) * separationForce
                        
                        // Calculate new positions after separation
                        let newX1 = positions.current[i][0] - separationX
                        let newY1 = positions.current[i][1] - separationY
                        let newX2 = positions.current[j][0] + separationX
                        let newY2 = positions.current[j][1] + separationY
                        
                        // Clamp positions to stay within world bounds (accounting for square size)
                        const squareSize1 = squares[i].size || SQUARE_SIZE
                        const squareSize2 = squares[j].size || SQUARE_SIZE
                        
                        newX1 = Math.max(-WORLD_WIDTH/2 + squareSize1/2, Math.min(WORLD_WIDTH/2 - squareSize1/2, newX1))
                        newY1 = Math.max(-WORLD_HEIGHT/2 + squareSize1/2, Math.min(WORLD_HEIGHT/2 - squareSize1/2, newY1))
                        newX2 = Math.max(-WORLD_WIDTH/2 + squareSize2/2, Math.min(WORLD_WIDTH/2 - squareSize2/2, newX2))
                        newY2 = Math.max(-WORLD_HEIGHT/2 + squareSize2/2, Math.min(WORLD_HEIGHT/2 - squareSize2/2, newY2))
                        
                        // Apply the clamped positions
                        positions.current[i][0] = newX1
                        positions.current[i][1] = newY1
                        positions.current[j][0] = newX2
                        positions.current[j][1] = newY2

                        // Collision detected: swap velocities
                        const tempVx = squares[i].velocity[0]
                        const tempVy = squares[i].velocity[1]
                        squares[i].velocity[0] = squares[j].velocity[0]
                        squares[i].velocity[1] = squares[j].velocity[1]
                        squares[j].velocity[0] = tempVx
                        squares[j].velocity[1] = tempVy
                    }
                }
            }
        }
    })

    return (
        <>
            {squares.map((sq, idx) => {
                const squareSize = sq.size || SQUARE_SIZE
                
                if (sq.isVideoSquare) {
                    return (
                        <VideoSquare 
                            key={idx} 
                            position={sq.position} 
                            size={squareSize} 
                            meshRef={(ref: any) => { meshRefs.current[idx] = ref }} 
                        />
                    )
                }
                
                return (
                    <mesh 
                        key={idx} 
                        ref={(ref) => { meshRefs.current[idx] = ref }}
                        position={sq.position}
                    >
                        <planeGeometry args={[squareSize, squareSize]} />
                        <meshBasicMaterial color={sq.color} />
                    </mesh>
                )
            })}
        </>
    )
}

// Calculates the pixel dimensions of the canvas based on the viewport size
function useCanvasSize() {
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 480 })
    
    useEffect(() => {
        const updateSize = () => {
            const maxWidth = window.innerWidth * 0.99 // 99% of viewport width
            const maxHeight = window.innerHeight * 0.92 // 92% of viewport height
            
            const worldAspectRatio = WORLD_WIDTH / WORLD_HEIGHT
            
            let width, height
            
            if (maxWidth / maxHeight > worldAspectRatio) {
                // Constrain by height
                height = maxHeight
                width = height * worldAspectRatio
            } else {
                // Constrain by width  
                width = maxWidth
                height = width / worldAspectRatio
            }
            
            setCanvasSize({ width: Math.round(width), height: Math.round(height) })
        }
        
        updateSize()
        window.addEventListener('resize', updateSize)
        return () => window.removeEventListener('resize', updateSize)
    }, [])
    
    return canvasSize
}

// LiveKit Room Component
function WebGLWithLiveKit() {
    const canvasSize = useCanvasSize()
    
    // Get participant video tracks (excluding admin)
    const tracks = useTracks([
        { source: Track.Source.Camera, withPlaceholder: false },
    ], { onlySubscribed: false })
    
    const participantTracks = tracks.filter(
        track => !track.participant.identity.startsWith('admin') &&
                 track.publication && 
                 track.publication.isSubscribed
    )
    
    const squareCount = participantTracks.length // Exactly match number of participants
    
    return (
        <div className="h-screen w-screen bg-white flex items-center justify-center p-1">
            <div className="text-center">
                {/* Header content */}
                <div className="flex items-center justify-center gap-4 mb-1 text-sm">
                    <h1 className="text-lg font-bold text-black">WebGL Test 3 - LiveKit</h1>
                    <span className="text-gray-500">World bounds: {WORLD_WIDTH} × {WORLD_HEIGHT} units</span>
                    <span className="text-xs text-gray-600">
                        {participantTracks.length === 0 ? 'No video participants' : `${participantTracks.length} video participant${participantTracks.length === 1 ? '' : 's'}`}
                    </span>
                    <span className="text-xs text-blue-600">
                        Squares: {squareCount}
                    </span>
                    <span className="text-xs text-green-600">
                        Total tracks: {tracks.length}
                    </span>
                </div>
                
                <div 
                    style={{ 
                        width: canvasSize.width, 
                        height: canvasSize.height 
                    }}
                    className="mx-auto relative"
                >
                    <Canvas
                        orthographic
                        camera={{ position: [0, 0, 100] }}
                        className="border-4 border-black bg-white"
                        style={{ width: "100%", height: "100%" }}
                    >
                        <ResponsiveCamera />
                        <MovingSquares participantCount={participantTracks.length} />
                    </Canvas>
                    
                    {/* LiveKit video overlays - positioned over the canvas */}
                    <LiveKitVideoOverlays participantTracks={participantTracks} />
                </div>
            </div>
        </div>
    )
}

export default function WebGLTest3Page() {
    const [token, setToken] = useState<string>('')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string>('')

    // Generate token for WebGL test
    useEffect(() => {
        const generateToken = async () => {
            try {
                setIsLoading(true)
                setError('')
                
                const response = await fetch(
                    `/api/token?room=doom&username=webgl-test-3`
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
    }, [])

    if (isLoading) {
        return (
            <div className="h-screen w-screen bg-white flex items-center justify-center">
                <div className="text-center text-black">
                    <div className="text-6xl mb-8">🔗</div>
                    <p className="text-2xl">Connecting to LiveKit...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="h-screen w-screen bg-white flex items-center justify-center">
                <div className="text-center text-red-600">
                    <div className="text-6xl mb-8">⚠️</div>
                    <p className="text-2xl mb-4">LiveKit Connection Failed</p>
                    <p className="text-lg">{error}</p>
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
            onError={(error) => setError(`Connection failed: ${error.message}`)}
            data-lk-theme="default"
            style={{ height: "100vh" }}
        >
            <WebGLWithLiveKit />
        </LiveKitRoom>
    )
} 
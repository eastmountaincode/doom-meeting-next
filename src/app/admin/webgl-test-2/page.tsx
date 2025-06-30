'use client'

import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { useEffect, useState, useRef } from "react"
import * as THREE from "three"

// Define our world boundaries (in scene units)
const WORLD_WIDTH = 30
const WORLD_HEIGHT = 16
const SQUARE_SIZE = 4

// Animation settings
const BASE_SPEED = 0.02

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
    videoId?: string // YouTube video ID for video squares
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
            {/* Black square - we'll overlay YouTube iframe on top */}
        </mesh>
    )
}

// The moving squares parent logic
function MovingSquares() {
    // Dynamic squares state
    const [squares, setSquares] = useState<SquareData[]>(() => {
        return initializeSquares()
    })

    // Initialize squares with smart positioning
    function initializeSquares(): SquareData[] {
        const colors = ["hotpink", "blue", "green", "orange", "purple", "cyan", "red", "yellow"]
        const squareArray: SquareData[] = []
        
        // Add the initial video squares
        const initialSquares = [
            { position: [-5, 0, 0] as [number, number, number], velocity: [BASE_SPEED * 0.5, BASE_SPEED * 0.75] as [number, number] },
            { position: [5, 0, 0] as [number, number, number], velocity: [-BASE_SPEED * 0.625, BASE_SPEED * 0.5] as [number, number] },
            { position: [0, -2, 0] as [number, number, number], velocity: [BASE_SPEED * 0.75, -BASE_SPEED * 0.5] as [number, number] }
        ]
        
        initialSquares.forEach((square, i) => {
            squareArray.push({
                color: "black",
                position: square.position,
                velocity: square.velocity,
                size: SQUARE_SIZE,
                isVideoSquare: true,
                videoId: "hKnuDloDCF8"
            })
        })
        
        return squareArray
    }

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

    // Add square function
    const addSquare = () => {
        if (squares.length >= MAX_CAPACITY) {
            console.warn(`Max capacity (${MAX_CAPACITY}) reached!`)
            return
        }
        
        let position = findValidPosition(squares)
        if (!position) {
            // Fallback: spawn at edge and let physics sort it out
            const edge = Math.random() * 4
            
            if (edge < 1) position = [-WORLD_WIDTH/2 + SQUARE_SIZE, 0, 0] // Left edge
            else if (edge < 2) position = [WORLD_WIDTH/2 - SQUARE_SIZE, 0, 0] // Right edge  
            else if (edge < 3) position = [0, -WORLD_HEIGHT/2 + SQUARE_SIZE, 0] // Bottom edge
            else position = [0, WORLD_HEIGHT/2 - SQUARE_SIZE, 0] // Top edge
        }
        
        const newSquare: SquareData = {
            color: "black",
            position,
            velocity: [
                (Math.random() - 0.5) * BASE_SPEED * 2,
                (Math.random() - 0.5) * BASE_SPEED * 2
            ],
            size: SQUARE_SIZE,
            isVideoSquare: true,
            videoId: "hKnuDloDCF8"
        }
        
        setSquares(prev => [...prev, newSquare])
    }

    // Remove square function
    const removeSquare = () => {
        if (squares.length <= 1) {
            console.warn("Cannot remove last square!")
            return
        }
        
        setSquares(prev => prev.slice(0, -1)) // Remove last square
    }

    // Expose functions to parent component
    useEffect(() => {
        (window as any).addSquare = addSquare;
        (window as any).removeSquare = removeSquare;
        (window as any).currentCount = squares.length;
        (window as any).maxCapacity = MAX_CAPACITY;
    }, [squares.length])

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

    useFrame(() => {
        // Move all squares first
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
            
            // Update iframe position for video square
            if (squares[i].isVideoSquare && squares[i].videoId) {
                const iframe = document.querySelector(`.youtube-overlay-${i}`) as HTMLElement
                const canvas = gl.domElement // Get the actual canvas element
                if (iframe && canvas) {
                    // Get canvas position on the page
                    const canvasRect = canvas.getBoundingClientRect()
                    
                    // Convert 3D world coordinates to screen coordinates
                    const vector = new THREE.Vector3(x, y, z)
                    vector.project(camera)
                    
                    // Convert to screen pixels relative to canvas
                    const screenX = (vector.x * 0.5 + 0.5) * canvasRect.width
                    const screenY = (-vector.y * 0.5 + 0.5) * canvasRect.height
                    
                    // Calculate iframe size based on square's world size and current zoom
                    const squareSize = squares[i].size || SQUARE_SIZE
                    const squarePixelSize = (squareSize / WORLD_HEIGHT) * canvasRect.height
                    
                    // Position relative to the canvas container (accounting for border)
                    iframe.style.left = `${screenX + 4}px` // +4px for border-4 border
                    iframe.style.top = `${screenY + 4}px`  // +4px for border-4 border
                    iframe.style.width = `${squarePixelSize}px`
                    iframe.style.height = `${squarePixelSize}px`
                    iframe.style.transform = 'translate(-50%, -50%)'
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
// Constrain width to 90% of viewport width or 1200px
// What is the viewport? The browser window.
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

export default function WebGLTest2Page() {
    const canvasSize = useCanvasSize()
    const [squareCount, setSquareCount] = useState(3) // Track square count for UI
    
    // Update square count when window functions are called
    useEffect(() => {
        const interval = setInterval(() => {
            if ((window as any).currentCount !== undefined) {
                setSquareCount((window as any).currentCount)
            }
        }, 100)
        
        return () => clearInterval(interval)
    }, [])
    
    return (
        <div className="h-screen w-screen bg-white flex items-center justify-center p-1">
            <div className="text-center">
                {/* All header content on one line */}
                <div className="flex items-center justify-center gap-4 mb-1 text-sm">
                    <h1 className="text-lg font-bold text-black">WebGL Test 2</h1>
                    <span className="text-gray-500">World bounds: {WORLD_WIDTH} × {WORLD_HEIGHT} units</span>
                    <button 
                        onClick={() => (window as any).removeSquare?.()}
                        className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                        disabled={squareCount <= 1}
                    >
                        Remove
                    </button>
                    <span className="text-xs text-gray-600">
                        {squareCount} / {MAX_CAPACITY}
                    </span>
                    <button 
                        onClick={() => (window as any).addSquare?.()}
                        className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                        disabled={squareCount >= MAX_CAPACITY}
                    >
                        Add
                    </button>
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
                        <MovingSquares />
                    </Canvas>
                    
                    {/* YouTube embed overlays - one for each square */}
                    <div 
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            width: '100%',
                            height: '100%',
                        }}
                    >
                        {Array.from({ length: squareCount }, (_, index) => {
                            return (
                                <iframe
                                    key={index}
                                    src="https://www.youtube.com/embed/hKnuDloDCF8?autoplay=1&mute=1&controls=0"
                                    className={`absolute bg-black rounded youtube-overlay-${index}`}
                                    style={{
                                        border: '1px solid white',
                                        pointerEvents: 'none',
                                    }}
                                    allow="autoplay; encrypted-media"
                                    allowFullScreen
                                />
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
} 
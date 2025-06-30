'use client'

import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { useEffect, useState, useRef } from "react"
import * as THREE from "three"

// Define our world boundaries (in scene units)
const WORLD_WIDTH = 30
const WORLD_HEIGHT = 16

// Configurable size thresholds
const SIZE_THRESHOLDS = {
    XL: { maxSquares: 10, size: 5, name: "XL" },
    LARGE: { maxSquares: 19, size: 4, name: "Large" },
    MEDIUM: { maxSquares: 35, size: 3, name: "Medium" },
    SMALL: { maxSquares: 75, size: 2, name: "Small" }
}

// Animation settings - consistent speed with 30fps timing
const BASE_SPEED = 0.05

// Calculate square size based on count
const getSquareSize = (squareCount: number) => {
    const thresholds = Object.values(SIZE_THRESHOLDS)
    for (const threshold of thresholds) {
        if (squareCount <= threshold.maxSquares) {
            return { size: threshold.size, threshold: threshold.name }
        }
    }
    // Fallback to smallest size
    return { size: SIZE_THRESHOLDS.SMALL.size, threshold: SIZE_THRESHOLDS.SMALL.name }
}

// Calculate theoretical capacity
const calculateCapacity = (size: number) => {
    const usableArea = (WORLD_WIDTH - size) * (WORLD_HEIGHT - size)
    const squareAreaWithSpacing = (size * 1.2) ** 2 // Some spacing between squares
    return Math.floor(usableArea / squareAreaWithSpacing)
}

// One square's data
type SquareData = {
    color: string
    position: [number, number, number]
    velocity: [number, number]
    size: number
}

function ResponsiveCamera() {
    const { camera, size } = useThree()
    
    useEffect(() => {
        if (camera.type === 'OrthographicCamera') {
            camera.zoom = size.height / WORLD_HEIGHT
            camera.updateProjectionMatrix()
        }
    }, [camera, size])
    
    return null
}

// The moving squares parent logic
function MovingSquares({ squareCount }: { squareCount: number }) {
    // Dynamic squares state based on square count
    const [squares, setSquares] = useState<SquareData[]>([])

    // Get current square size
    const { size: currentSquareSize } = getSquareSize(squareCount)

    // Smart position finding with fallbacks
    function findValidPosition(existingSquares: SquareData[], squareSize: number, attempts = 100): [number, number, number] | null {
        let separationMultiplier = 1.5 // Start with ideal spacing
        
        while (separationMultiplier >= 1.0) {
            for (let attempt = 0; attempt < attempts; attempt++) {
                const position: [number, number, number] = [
                    (Math.random() - 0.5) * (WORLD_WIDTH - squareSize * 2),
                    (Math.random() - 0.5) * (WORLD_HEIGHT - squareSize * 2),
                    0
                ]
                
                const hasCollision = existingSquares.some(existing => {
                    const dx = Math.abs(existing.position[0] - position[0])
                    const dy = Math.abs(existing.position[1] - position[1])
                    return dx < (existing.size + squareSize) * separationMultiplier && 
                           dy < (existing.size + squareSize) * separationMultiplier
                })
                
                if (!hasCollision) {
                    return position
                }
            }
            separationMultiplier -= 0.1 // Reduce spacing requirement
        }
        
        return null // No valid position found
    }

    // Initialize or update squares based on square count
    useEffect(() => {
        const currentCount = squares.length
        const targetCount = squareCount
        
        if (currentCount === targetCount) {
            // Same count, but update sizes if needed
            setSquares(prev => prev.map(square => ({
                ...square,
                size: currentSquareSize
            })))
            return
        }
        
        if (currentCount < targetCount) {
            // Add squares
            const newSquares = [...squares]
            // Update existing squares with new size
            newSquares.forEach(square => {
                square.size = currentSquareSize
            })
            
            for (let i = currentCount; i < targetCount; i++) {
                let position = findValidPosition(newSquares, currentSquareSize)
                if (!position) {
                    // Fallback positioning - circular arrangement
                    const angle = (i / targetCount) * 2 * Math.PI
                    const radius = Math.min(WORLD_WIDTH, WORLD_HEIGHT) * 0.3
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
                    size: currentSquareSize
                })
            }
            setSquares(newSquares)
        } else {
            // Remove squares and update sizes
            const newSquares = squares.slice(0, targetCount)
            newSquares.forEach(square => {
                square.size = currentSquareSize
            })
            setSquares(newSquares)
        }
    }, [squareCount, currentSquareSize])

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
        
        // Ensure arrays are in sync
        const maxIndex = Math.min(positions.current.length, squares.length)
        
        // Move all squares with consistent speed
        for (let i = 0; i < maxIndex; i++) {
            // Safety check - make sure square exists
            if (!squares[i]) continue
            
            let [x, y, z] = positions.current[i]
            let [vx, vy] = squares[i].velocity
            const squareSize = squares[i].size

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
        }

        // Square-to-square collision detection (brute-force: check each pair once)
        for (let i = 0; i < maxIndex; i++) {
            for (let j = i + 1; j < maxIndex; j++) {
                // Safety check - make sure both squares exist
                if (!squares[i] || !squares[j]) continue
                
                const [x1, y1] = positions.current[i]
                const [x2, y2] = positions.current[j]
                const size1 = squares[i].size
                const size2 = squares[j].size

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
                        newX1 = Math.max(-WORLD_WIDTH/2 + size1/2, Math.min(WORLD_WIDTH/2 - size1/2, newX1))
                        newY1 = Math.max(-WORLD_HEIGHT/2 + size1/2, Math.min(WORLD_HEIGHT/2 - size1/2, newY1))
                        newX2 = Math.max(-WORLD_WIDTH/2 + size2/2, Math.min(WORLD_WIDTH/2 - size2/2, newX2))
                        newY2 = Math.max(-WORLD_HEIGHT/2 + size2/2, Math.min(WORLD_HEIGHT/2 - size2/2, newY2))
                        
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
            {squares.map((sq, idx) => (
                <mesh 
                    key={idx} 
                    ref={(ref) => { meshRefs.current[idx] = ref }}
                    position={sq.position}
                >
                    <planeGeometry args={[sq.size, sq.size]} />
                    <meshBasicMaterial color={sq.color} />
                </mesh>
            ))}
        </>
    )
}

// Calculates the pixel dimensions of the canvas based on the viewport size
function useCanvasSize() {
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 480 })
    
    useEffect(() => {
        const updateSize = () => {
            // Simulate fullscreen - use almost entire viewport
            const maxWidth = window.innerWidth * 0.98
            const maxHeight = window.innerHeight * 0.95 // Leave tiny space for controls
            
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

export default function WebGLTest4Page() {
    const canvasSize = useCanvasSize()
    const [squareCount, setSquareCount] = useState(8) // Start with 8 squares
    
    // Get current sizing info
    const { size: currentSquareSize, threshold: currentThreshold } = getSquareSize(squareCount)
    const theoreticalCapacity = calculateCapacity(currentSquareSize)
    const utilizationPercent = Math.round((squareCount / theoreticalCapacity) * 100)
    
    return (
        <div className="h-screen w-screen bg-white flex flex-col items-center justify-center p-1">
            {/* Tiny Controls */}
            <div className="w-full mb-2">
                <div className="bg-gray-50 px-3 py-1 rounded border text-xs">
                    <div className="flex items-center justify-center gap-4">
                        <span className="font-medium text-black">WebGL Test 4</span>
                        
                        {/* Compact Slider with +/- buttons */}
                        <div className="flex items-center gap-2">
                            <span className="text-gray-600">Squares:</span>
                            <button
                                onClick={() => setSquareCount(Math.max(1, squareCount - 1))}
                                className="w-5 h-5 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded text-xs flex items-center justify-center"
                                disabled={squareCount <= 1}
                            >
                                −
                            </button>
                            <input
                                type="range"
                                min="1"
                                max="75"
                                value={squareCount}
                                onChange={(e) => setSquareCount(parseInt(e.target.value))}
                                className="w-20 h-1 bg-gray-200 rounded appearance-none cursor-pointer"
                            />
                            <button
                                onClick={() => setSquareCount(Math.min(75, squareCount + 1))}
                                className="w-5 h-5 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded text-xs flex items-center justify-center"
                                disabled={squareCount >= 75}
                            >
                                +
                            </button>
                            <span className="text-black font-medium w-8">{squareCount}</span>
                        </div>
                        
                        {/* Compact Status */}
                        <span className="text-blue-600">Size: {currentSquareSize}</span>
                        <span className="text-green-600">{currentThreshold}</span>
                        <span className="text-purple-600">{squareCount}/{theoreticalCapacity}</span>
                        <span className="text-orange-600">{utilizationPercent}%</span>
                        
                        {/* Threshold indicators */}
                        <div className="flex gap-1">
                            {Object.values(SIZE_THRESHOLDS).map((threshold, idx) => (
                                <span 
                                    key={idx} 
                                    className={`px-1 rounded text-xs ${
                                        threshold.name === currentThreshold 
                                            ? 'bg-blue-300 text-blue-900' 
                                            : 'bg-gray-200 text-gray-600'
                                    }`}
                                >
                                    {threshold.name[0]}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Near-Fullscreen Canvas */}
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
                    className="border-2 border-black bg-white"
                    style={{ width: "100%", height: "100%" }}
                >
                    <ResponsiveCamera />
                    <MovingSquares squareCount={squareCount} />
                </Canvas>
            </div>
        </div>
    )
} 
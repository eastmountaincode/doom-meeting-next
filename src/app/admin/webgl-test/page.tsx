'use client'

import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { useEffect, useState, useRef } from "react"

// Define our world boundaries (in scene units)
const WORLD_WIDTH = 30
const WORLD_HEIGHT = 16
const SQUARE_SIZE = 2

// Animation settings
const NUM_SQUARES = 3
const BASE_SPEED = 0.04

// Audio context for collision sounds
let audioContext: AudioContext | null = null

// Initialize audio context (must be done after user interaction)
const initAudio = () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
}

// Play collision sound
const playCollisionSound = () => {
    if (!audioContext) return
    
    // Create oscillator for beep sound
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    // Connect nodes
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    // Configure sound
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime) // 800Hz beep
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1) // Drop to 400Hz
    
    // Volume envelope (quick attack, quick decay)
    gainNode.gain.setValueAtTime(0, audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01) // Quick attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1) // Quick decay
    
    // Play sound
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.1)
}

// One square's data
type SquareData = {
    color: string
    position: [number, number, number]
    velocity: [number, number]
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

// The moving squares parent logic
function MovingSquares() {
    // Initialize squares dynamically
    const [squares] = useState<SquareData[]>(() => {
        const colors = ["hotpink", "blue", "green", "orange", "purple", "cyan", "red", "yellow"]
        const squareArray: SquareData[] = []
        
        for (let i = 0; i < NUM_SQUARES; i++) {
            let position: [number, number, number]
            let attempts = 0
            const maxAttempts = 100
            
            // Keep trying until we find a position that doesn't overlap with existing squares
            do {
                position = [
                    (Math.random() - 0.5) * (WORLD_WIDTH - SQUARE_SIZE * 2), // Extra margin
                    (Math.random() - 0.5) * (WORLD_HEIGHT - SQUARE_SIZE * 2), // Extra margin
                    0
                ]
                attempts++
            } while (
                attempts < maxAttempts &&
                squareArray.some(existing => {
                    const dx = Math.abs(existing.position[0] - position[0])
                    const dy = Math.abs(existing.position[1] - position[1])
                    return dx < SQUARE_SIZE * 1.5 && dy < SQUARE_SIZE * 1.5 // Minimum distance = 1.5x square size
                })
            )
            
            squareArray.push({
                color: colors[i % colors.length],
                position,
                velocity: [
                    (Math.random() - 0.5) * BASE_SPEED * 2, // Random velocity between -BASE_SPEED and +BASE_SPEED
                    (Math.random() - 0.5) * BASE_SPEED * 2
                ]
            })
        }
        
        return squareArray
    })

    // Store current positions for physics calculations
    const positions = useRef(squares.map(sq => [...sq.position] as [number, number, number]))
    // Store refs to the actual mesh objects
    const meshRefs = useRef<any[]>([])

    useFrame(() => {
        // Move all squares first
        for (let i = 0; i < positions.current.length; i++) {
            let [x, y, z] = positions.current[i]
            let [vx, vy] = squares[i].velocity

            // Update position
            x += vx
            y += vy

            // Bounce off left/right
            if (x + SQUARE_SIZE / 2 > WORLD_WIDTH / 2 || x - SQUARE_SIZE / 2 < -WORLD_WIDTH / 2) {
                squares[i].velocity[0] *= -1
                x += squares[i].velocity[0] // Move back after bounce
            }
            // Bounce off top/bottom
            if (y + SQUARE_SIZE / 2 > WORLD_HEIGHT / 2 || y - SQUARE_SIZE / 2 < -WORLD_HEIGHT / 2) {
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
        for (let i = 0; i < positions.current.length; i++) {
            for (let j = i + 1; j < positions.current.length; j++) {
                const [x1, y1] = positions.current[i]
                const [x2, y2] = positions.current[j]

                // AABB collision detection
                if (
                    Math.abs(x1 - x2) < SQUARE_SIZE &&
                    Math.abs(y1 - y2) < SQUARE_SIZE
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
                        
                        positions.current[i][0] -= separationX
                        positions.current[i][1] -= separationY
                        positions.current[j][0] += separationX
                        positions.current[j][1] += separationY
                    }
                    
                    // Collision detected: swap velocities
                    const tempVx = squares[i].velocity[0]
                    const tempVy = squares[i].velocity[1]
                    squares[i].velocity[0] = squares[j].velocity[0]
                    squares[i].velocity[1] = squares[j].velocity[1]
                    squares[j].velocity[0] = tempVx
                    squares[j].velocity[1] = tempVy

                    // Play collision sound
                    playCollisionSound()
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
                    <planeGeometry args={[SQUARE_SIZE, SQUARE_SIZE]} />
                    <meshBasicMaterial color={sq.color} />
                </mesh>
            ))}
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
            const maxWidth = window.innerWidth * 0.9 // 90% of viewport width
            const maxHeight = window.innerHeight * 0.6 // 60% of viewport height
            
            const worldAspectRatio = WORLD_WIDTH / WORLD_HEIGHT
            
            let width, height
            
            if (maxWidth / maxHeight > worldAspectRatio) {
                // Constrain by height
                height = Math.min(maxHeight, 800) // Max 800px height
                width = height * worldAspectRatio
            } else {
                // Constrain by width  
                width = Math.min(maxWidth, 1200) // Max 1200px width
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

export default function WebGLTestPage() {
    const canvasSize = useCanvasSize()
    
    return (
        <div className="h-screen w-screen bg-white flex items-center justify-center p-4">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-black mb-4">WebGL Test Page</h1>
                <p className="text-xl text-gray-600 mb-2">Ready for experimentation</p>
                <p className="text-sm text-gray-500 mb-2">
                    World bounds: {WORLD_WIDTH} × {WORLD_HEIGHT} units (black border = bounce area)
                </p>
                <p className="text-xs text-blue-600 mb-6">
                    🔊 Click the canvas to enable collision sound effects!
                </p>
                <div 
                    style={{ 
                        width: canvasSize.width, 
                        height: canvasSize.height 
                    }}
                    className="mx-auto"
                >
                    <Canvas
                        orthographic
                        camera={{ position: [0, 0, 100] }}
                        className="border-4 border-black bg-white cursor-pointer"
                        style={{ width: "100%", height: "100%" }}
                        onClick={initAudio}
                    >
                        <ResponsiveCamera />
                        <MovingSquares />
                    </Canvas>
                </div>
            </div>
        </div>
    )
} 
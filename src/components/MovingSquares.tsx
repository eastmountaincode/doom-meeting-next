import React, { useEffect, useRef } from 'react'
import { useThree, useFrame } from "@react-three/fiber"
import { useRemoteParticipants, TrackReferenceOrPlaceholder } from "@livekit/components-react"
import * as THREE from "three"
import { useVideoSquares } from '../hooks/useVideoSquares'
import { VideoSquare as VideoSquareType } from '../types/videoSquare'
import { polygonsCollide, participantCollisionShapes } from '../lib/collisionUtils'
import { generateParticipantShape, generateParticipantColor } from '../lib/participantUtils'

// Simple square component for physics - video will be overlaid via DOM
function VideoSquare({ square, physicsPositions }: { square: VideoSquareType, physicsPositions: React.MutableRefObject<Map<string, [number, number, number]>> }) {
  const meshRef = useRef<THREE.Mesh>(null)

  // Update position every frame using physics position
  useFrame(() => {
    if (meshRef.current) {
      const physicsPos = physicsPositions.current.get(square.participantId)
      if (physicsPos) {
        meshRef.current.position.set(...physicsPos)
      } else {
        meshRef.current.position.set(...square.position)
      }
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

interface MovingSquaresProps {
  participantTracks: TrackReferenceOrPlaceholder[]
  onSquaresUpdate?: (squares: VideoSquareType[]) => void
  baseSpeed: number
  useSquareShapes?: boolean
}

// Main squares component with physics  
export default function MovingSquares({ 
  participantTracks, 
  onSquaresUpdate, 
  baseSpeed,
  useSquareShapes = true
}: MovingSquaresProps) {
  const { 
    squares, 
    addParticipant, 
    addPlaceholder,
    removeParticipant, 
    updateSquareVideo,
    convertPlaceholderToParticipant,
    convertParticipantToPlaceholder,
    manager 
  } = useVideoSquares()

  const squareVelocities = useRef<Map<string, [number, number]>>(new Map())
  const squarePositions = useRef<Map<string, [number, number, number]>>(new Map())
  const { size, camera, gl } = useThree()
  
  // Get actual participants from LiveKit (more reliable than tracks)
  const remoteParticipants = useRemoteParticipants()
  
  // Time-based frame rate control
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

  // Create initial placeholder squares
  useEffect(() => {
    if (manager && squares.length === 0) {
      // Create 3 initial placeholder squares with collision shapes
      const placeholders = [
        { id: 'placeholder-1', color: '#FF6B6B' },
        { id: 'placeholder-2', color: '#4ECDC4' },
        { id: 'placeholder-3', color: '#45B7D1' }
      ]
      
      placeholders.forEach(placeholder => {
        // Generate collision shape for placeholder
        const shapeData = generateParticipantShape(placeholder.id, useSquareShapes)
        participantCollisionShapes.set(placeholder.id, shapeData.collisionVertices)
        addPlaceholder(placeholder.id, { color: placeholder.color })
      })
    }
  }, [manager, squares, addPlaceholder, useSquareShapes])

  // Regenerate collision shapes when shape preference changes
  useEffect(() => {
    squares.forEach(square => {
      const shapeData = generateParticipantShape(square.participantId, useSquareShapes)
      participantCollisionShapes.set(square.participantId, shapeData.collisionVertices)
    })
  }, [useSquareShapes, squares])

  // Sync participants with VideoSquare system using actual participants (not tracks)
  useEffect(() => {
    // Get current squares from the manager instead of from state to avoid stale closure
    const currentSquares = manager?.getSquares() || []
    const currentParticipantIds = new Set(currentSquares.map((s: VideoSquareType) => s.participantId))
    
    // Use actual LiveKit participants (they persist during camera switches)
    const liveParticipantIds = new Set(
      remoteParticipants
        .filter(participant => !participant.identity.startsWith('admin') && !participant.identity.startsWith('display'))
        .map(participant => participant.identity)
    )

    // Debug logging
    console.log('=== MovingSquares Debug ===')
    console.log('Current squares:', currentSquares.map(s => `${s.participantId} (${s.type})`))
    console.log('Live participants:', Array.from(liveParticipantIds))
    console.log('Participant count:', currentSquares.filter(s => s.type === 'participant').length)
    console.log('Placeholder count:', currentSquares.filter(s => s.type === 'placeholder').length)

    // Only remove REAL participants who have actually left the room (not placeholders)
    for (const id of currentParticipantIds) {
      const square = currentSquares.find((s: VideoSquareType) => s.participantId === id)
      // Only remove if it's a real participant (not placeholder) and they've left
      if (square && square.type === 'participant' && !liveParticipantIds.has(id)) {
        // Check if we would have less than 3 total squares after removal
        const currentTotal = currentSquares.length
        const wouldHaveLessThanThree = currentTotal - 1 < 3
        
        if (wouldHaveLessThanThree) {
          // Convert participant to placeholder instead of removing
          // Use proper placeholder ID format to match admin settings (placeholder-1, placeholder-2, etc.)
          const existingPlaceholderIds = currentSquares
            .filter((s: VideoSquareType) => s.type === 'placeholder')
            .map((s: VideoSquareType) => s.participantId)
          
          // Find the next available placeholder ID (1, 2, or 3)
          let nextPlaceholderIndex = 1
          while (existingPlaceholderIds.includes(`placeholder-${nextPlaceholderIndex}`) && nextPlaceholderIndex <= 3) {
            nextPlaceholderIndex++
          }
          
          const newPlaceholderId = `placeholder-${nextPlaceholderIndex}`
          
          // Preserve current physics position and velocity
          const currentPosition = squarePositions.current.get(id)
          const currentVelocity = squareVelocities.current.get(id)
          
          // Reuse existing collision shape
          const existingShape = participantCollisionShapes.get(id)
          if (existingShape) {
            // Transfer the collision shape from participant to placeholder
            participantCollisionShapes.delete(id)
            participantCollisionShapes.set(newPlaceholderId, existingShape)
          }
          
          console.log(`Converting participant ${id} to placeholder ${newPlaceholderId}`)
          convertParticipantToPlaceholder(id, newPlaceholderId)
          
          // Restore physics position and velocity after conversion
          if (currentPosition) {
            squarePositions.current.set(newPlaceholderId, currentPosition)
          }
          if (currentVelocity) {
            squareVelocities.current.set(newPlaceholderId, currentVelocity)
          }
          
          // Clean up old physics data
          squarePositions.current.delete(id)
          squareVelocities.current.delete(id)
        } else {
          // Remove participant normally
          console.log(`Removing participant ${id}`)
          removeParticipant(id)
          // Clean up collision shape
          participantCollisionShapes.delete(id)
        }
      }
    }

    // Add new participants who joined
    for (const participant of remoteParticipants) {
      const id = participant.identity
      if (!id.startsWith('admin') && !id.startsWith('display') && !currentParticipantIds.has(id)) {
        console.log(`Found new participant: ${id}`)
        // Generate and store collision shape for this participant
        const shapeData = generateParticipantShape(id, useSquareShapes)
        participantCollisionShapes.set(id, shapeData.collisionVertices)
        
        // Check if we have placeholders to convert
        const firstPlaceholder = currentSquares.find((square: VideoSquareType) => square.type === 'placeholder')
        if (firstPlaceholder) {
          console.log(`Converting placeholder ${firstPlaceholder.participantId} to participant ${id}`)
          // Preserve current physics position and velocity
          const currentPosition = squarePositions.current.get(firstPlaceholder.participantId)
          const currentVelocity = squareVelocities.current.get(firstPlaceholder.participantId)
          
          // Convert placeholder to participant - reuse existing collision shape
          const existingShape = participantCollisionShapes.get(firstPlaceholder.participantId)
          if (existingShape) {
            // Transfer the collision shape from placeholder to participant
            participantCollisionShapes.delete(firstPlaceholder.participantId)
            participantCollisionShapes.set(id, existingShape)
          }
          
          convertPlaceholderToParticipant(firstPlaceholder.participantId, id)
          
          // Restore physics position and velocity after conversion
          if (currentPosition) {
            squarePositions.current.set(id, currentPosition)
          }
          if (currentVelocity) {
            squareVelocities.current.set(id, currentVelocity)
          }
          
          // Clean up old physics data
          squarePositions.current.delete(firstPlaceholder.participantId)
          squareVelocities.current.delete(firstPlaceholder.participantId)
        } else {
          console.log(`No placeholders available, adding new participant ${id}`)
          // No placeholders, add new participant normally
          addParticipant(id, { color: generateParticipantColor(id) })
        }
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
    
  }, [participantTracks, remoteParticipants, addParticipant, removeParticipant, updateSquareVideo, convertPlaceholderToParticipant, convertParticipantToPlaceholder, useSquareShapes, manager])

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

  // Physics animation loop
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

      // Get or initialize physics position
      let position = squarePositions.current.get(square.participantId)
      if (!position) {
        position = [...square.position]
        squarePositions.current.set(square.participantId, position)
      }

      // Update physics position (not the React state)
      position[0] += velocity[0]
      position[1] += velocity[1]

      const halfSize = square.size / 2
      
      // Bounce off walls
      if (position[0] + halfSize > halfWidth) {
        position[0] = halfWidth - halfSize
        velocity[0] = -Math.abs(velocity[0])
      } else if (position[0] - halfSize < -halfWidth) {
        position[0] = -halfWidth + halfSize
        velocity[0] = Math.abs(velocity[0])
      }
      
      if (position[1] + halfSize > halfHeight) {
        position[1] = halfHeight - halfSize
        velocity[1] = -Math.abs(velocity[1])
      } else if (position[1] - halfSize < -halfHeight) {
        position[1] = -halfHeight + halfSize
        velocity[1] = Math.abs(velocity[1])
      }

      // Update stored velocity and position
      squareVelocities.current.set(square.participantId, velocity)
      squarePositions.current.set(square.participantId, position)
      
      // Update video overlay position using physics position
      const videoElement = document.querySelector(`[data-participant-id="${square.participantId}"]`) as HTMLElement
      const canvas = gl.domElement
      if (videoElement && canvas) {
        // Get canvas position on the page
        const canvasRect = canvas.getBoundingClientRect()
        
        // Convert 3D world coordinates to screen coordinates using physics position
        const vector = new THREE.Vector3(position[0], position[1], position[2])
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
        
        // Get physics positions for collision detection
        const positionA = squarePositions.current.get(squareA.participantId) || squareA.position
        const positionB = squarePositions.current.get(squareB.participantId) || squareB.position
        
        // Get collision shapes for both participants
        const shapeA = participantCollisionShapes.get(squareA.participantId)
        const shapeB = participantCollisionShapes.get(squareB.participantId)
        
        let collision = false
        
        if (shapeA && shapeB) {
          // Use actual polygon collision detection with physics positions
          collision = polygonsCollide(
            shapeA, [positionA[0], positionA[1]], squareA.size,
            shapeB, [positionB[0], positionB[1]], squareB.size
          )
        } else {
          // Fallback to distance-based collision if shapes not available
          const dx = positionB[0] - positionA[0]
          const dy = positionB[1] - positionA[1]
          const distance = Math.sqrt(dx * dx + dy * dy)
          const minDistance = (squareA.size + squareB.size) / 2.2
          collision = distance < minDistance
        }
        
        if (collision) {
          // Collision detected - apply separation and velocity swap
          const dx = positionB[0] - positionA[0]
          const dy = positionB[1] - positionA[1]
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance > 0.001) {
            // Normalize and apply separation
            const separationForce = 0.02
            const separationX = (dx / distance) * separationForce
            const separationY = (dy / distance) * separationForce
            
            // Calculate new positions after separation
            let newX1 = positionA[0] - separationX
            let newY1 = positionA[1] - separationY
            let newX2 = positionB[0] + separationX
            let newY2 = positionB[1] + separationY
            
            // Clamp positions to stay within world bounds
            const size1 = squareA.size
            const size2 = squareB.size
            newX1 = Math.max(-halfWidth + size1/2, Math.min(halfWidth - size1/2, newX1))
            newY1 = Math.max(-halfHeight + size1/2, Math.min(halfHeight - size1/2, newY1))
            newX2 = Math.max(-halfWidth + size2/2, Math.min(halfWidth - size2/2, newX2))
            newY2 = Math.max(-halfHeight + size2/2, Math.min(halfHeight - size2/2, newY2))
            
            // Apply the clamped positions to physics positions
            squarePositions.current.set(squareA.participantId, [newX1, newY1, positionA[2]])
            squarePositions.current.set(squareB.participantId, [newX2, newY2, positionB[2]])

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

  // Cleanup velocities, positions, and collision shapes when squares are removed
  useEffect(() => {
    const currentIds = new Set(squares.map(s => s.participantId))
    for (const [id] of squareVelocities.current) {
      if (!currentIds.has(id)) {
        squareVelocities.current.delete(id)
        squarePositions.current.delete(id)
        participantCollisionShapes.delete(id)
      }
    }
  }, [squares])
  
  // Notify parent component about squares updates (use ref to avoid infinite loops)
  const onSquaresUpdateRef = useRef(onSquaresUpdate)
  onSquaresUpdateRef.current = onSquaresUpdate
  
  useEffect(() => {
    if (onSquaresUpdateRef.current) {
      onSquaresUpdateRef.current(squares)
    }
  }, [squares])

  return (
    <>
      {squares.map(square => {
        return (
          <VideoSquare 
            key={square.participantId}
            square={square}
            physicsPositions={squarePositions}
          />
        )
      })}
    </>
  )
} 
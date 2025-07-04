import { VideoSquare, SquareConfig, VideoSquareEvent } from '../types/videoSquare'
import { EventBus } from './EventBus'

export class VideoSquareManager {
  private squares: Map<string, VideoSquare> = new Map()
  private eventBus: EventBus = new EventBus()
  private config: SquareConfig

  constructor(config: SquareConfig) {
    this.config = config
  }

  // Core lifecycle methods
  addParticipant(participantId: string, options?: { color?: string }): VideoSquare | null {
    if (this.squares.has(participantId)) {
      console.warn(`Participant ${participantId} already exists`)
      return null
    }

    const position = this.findOptimalPosition()
    const newSize = this.getCurrentSquareSize()
    
    // Update ALL existing squares to the new size
    this.squares.forEach(square => {
      square.size = newSize
    })
    
    const square: VideoSquare = {
      participantId,
      position,
      velocity: this.generateRandomVelocity(),
      size: newSize,
      color: options?.color || this.generateRandomColor(),
      timestamp: Date.now(),
      type: 'participant'
    }

    this.squares.set(participantId, square)
    this.eventBus.emit('square.added', { square })
    this.eventBus.emit('squares.updated', { squares: Array.from(this.squares.values()) })

    return square
  }

  removeParticipant(participantId: string): boolean {
    const existed = this.squares.has(participantId)
    if (existed) {
      const square = this.squares.get(participantId)
      this.squares.delete(participantId)
      
      // Update ALL remaining squares to the new size
      const newSize = this.getSquareSizeForCount(this.squares.size)
      this.squares.forEach(remainingSquare => {
        remainingSquare.size = newSize
      })
      
      this.eventBus.emit('square.removed', { square, participantId })
      this.eventBus.emit('squares.updated', { squares: Array.from(this.squares.values()) })
    }
    return existed
  }

  updateSquareVideo(participantId: string, videoTrack?: MediaStreamTrack): boolean {
    const square = this.squares.get(participantId)
    if (square) {
      square.videoTrack = videoTrack
      this.eventBus.emit('squares.updated', { squares: Array.from(this.squares.values()) })
      return true
    }
    return false
  }

  // Getters
  getSquares(): VideoSquare[] {
    return Array.from(this.squares.values())
  }

  getSquare(participantId: string): VideoSquare | undefined {
    return this.squares.get(participantId)
  }

  getSquareCount(): number {
    return this.squares.size
  }

  // Clear all squares
  clear(): void {
    this.squares.clear()
    this.eventBus.emit('squares.updated', { squares: [] })
  }

  // Update world bounds dynamically
  updateWorldBounds(width: number, height: number): void {
    this.config.worldWidth = width
    this.config.worldHeight = height
  }

  // Event system
  on(eventType: string, callback: (event: VideoSquareEvent) => void): void {
    this.eventBus.on(eventType, callback)
  }

  off(eventType: string, callback: (event: VideoSquareEvent) => void): void {
    this.eventBus.off(eventType, callback)
  }

  // Smart placement algorithm
  private findOptimalPosition(): [number, number, number] {
    const existingSquares = Array.from(this.squares.values())
    
    if (existingSquares.length === 0) {
      return [0, 0, 0] // Center for first square
    }

    // Simplified grid-based placement
    const gridSize = 20
    let bestPosition: [number, number, number] = [0, 0, 0]
    let bestScore = -Infinity
    const currentSize = this.getCurrentSquareSize()

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x = (i / (gridSize - 1) - 0.5) * (this.config.worldWidth - currentSize)
        const y = (j / (gridSize - 1) - 0.5) * (this.config.worldHeight - currentSize)
        const candidatePosition: [number, number, number] = [x, y, 0]

        let minDistance = Infinity
        let hasOverlap = false

        for (const existing of existingSquares) {
          const dx = x - existing.position[0]
          const dy = y - existing.position[1]
          const centerDistance = Math.sqrt(dx * dx + dy * dy)
          const edgeDistance = centerDistance - (existing.size + currentSize) / 2

          if (edgeDistance < 0) {
            hasOverlap = true
            break
          }
          minDistance = Math.min(minDistance, edgeDistance)
        }

        if (!hasOverlap && minDistance > bestScore) {
          bestScore = minDistance
          bestPosition = candidatePosition
        }
      }
    }

    return bestPosition
  }

  private getCurrentSquareSize(): number {
    return this.getSquareSizeForCount(this.squares.size + 1)
  }

  private getSquareSizeForCount(count: number): number {
    const thresholds = Object.values(this.config.sizeThresholds)
    
    for (const threshold of thresholds) {
      if (count <= threshold.maxSquares) {
        return threshold.size
      }
    }
    
    // Fallback to smallest size
    return thresholds[thresholds.length - 1].size
  }

  private generateRandomVelocity(): [number, number] {
    return [
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.1
    ]
  }

  private generateRandomColor(): string {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']
    return colors[Math.floor(Math.random() * colors.length)]
  }

  destroy(): void {
    this.squares.clear()
    this.eventBus.removeAllListeners()
  }
} 
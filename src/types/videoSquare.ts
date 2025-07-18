export interface VideoSquare {
  participantId: string
  position: [number, number, number]
  velocity: [number, number]
  size: number
  videoTrack?: MediaStreamTrack
  color: string
  timestamp: number // When this square was created
  type: 'participant' | 'placeholder'
  placeholderData?: {
    name: string
    url: string
  }
}

export interface PlaceholderStream {
  id: string
  name: string
  url: string
  enabled: boolean
  createdAt: number
}

export interface VideoSquareEvent {
  type: 'squares.updated' | 'square.added' | 'square.removed' | 'physics.updated'
  data?: unknown
  timestamp: number
}

export interface SquareConfig {
  worldWidth: number
  worldHeight: number
  baseSpeed: number
  gridSize: number
  sizeThresholds: {
    [key: string]: {
      maxSquares: number
      size: number
      name: string
    }
  }
}

export type EventCallback = (event: VideoSquareEvent) => void 
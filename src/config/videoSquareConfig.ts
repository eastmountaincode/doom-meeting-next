import { SquareConfig } from '../types/videoSquare'

// Single configuration for video squares - the source of truth
export const VIDEO_SQUARE_CONFIG: SquareConfig = {
  worldWidth: 30,
  worldHeight: 16,
  baseSpeed: 0.06, // Consistent with webgl-test-3 BASE_SPEED
  gridSize: 20, // Good balance between performance and placement quality
  sizeThresholds: {
    XL: { maxSquares: 10, size: 5, name: "XL" },
    LARGE: { maxSquares: 15, size: 4, name: "Large" },
    MEDIUM: { maxSquares: 32, size: 3, name: "Medium" },
    SMALL: { maxSquares: 75, size: 2, name: "Small" }
  }
} 
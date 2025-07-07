// Video compression settings to save LiveKit resources
export const VIDEO_CONSTRAINTS = {
  // Compressed resolution - much smaller than default
  WIDTH: {
    ideal: 240,
    min: 160,
    max: 320
  },
  HEIGHT: {
    ideal: 240,
    min: 160,
    max: 320
  },
  // Lower frame rate = less bandwidth
  FRAME_RATE: {
    ideal: 10,
    max: 15
  },
  // Keep square aspect ratio
  ASPECT_RATIO: 1.0
}

// Camera switching delay for proper cleanup (in milliseconds)
export const CAMERA_SWITCH_DELAY = 400

// Reserved screen name that cannot be chosen by regular users
export const RESERVED_SCREEN_NAME = 'Laila'

// Password for the reserved screen name (from environment variable)
export const RESERVED_SCREEN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD 
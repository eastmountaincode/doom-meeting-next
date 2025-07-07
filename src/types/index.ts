export interface DisplayScreenEvent {
  type: 'EMPLOYEE_OF_MONTH' | 'HIGH_FIVE' | 'RESET' | 'CUSTOM' | 'TOGGLE_NAME_LABELS' | 'SET_BACKGROUND_COLOR' | 'TOGGLE_QR_CODE' | 'START_COLOR_CYCLE' | 'STOP_COLOR_CYCLE' | 'SET_COLOR_CYCLE_SPEED' | 'SPEAK_MESSAGE' | 'SET_YOUTUBE_BACKGROUND' | 'CLEAR_YOUTUBE_BACKGROUND' | 'START_EVENT' | 'STOP_EVENT' | 'TOGGLE_VIDEO_SHAPES' | 'TOGGLE_INVERT_COLORS' | 'HIGHLIGHT_LAILA'
  participantId?: string
  participantIds?: string[]
  message?: string
  duration?: number // Optional - just metadata for live shows
  showNameLabels?: boolean // For TOGGLE_NAME_LABELS event
  backgroundColor?: string // For SET_BACKGROUND_COLOR event
  showQrCode?: boolean // For TOGGLE_QR_CODE event
  useSquareShapes?: boolean // For TOGGLE_VIDEO_SHAPES event
  invertColors?: boolean // For TOGGLE_INVERT_COLORS event
  saturation?: number // For START_COLOR_CYCLE event
  lightness?: number // For START_COLOR_CYCLE event
  speed?: number // For START_COLOR_CYCLE and SET_COLOR_CYCLE_SPEED events
  startHue?: number // For START_COLOR_CYCLE event
  videoId?: string // For SET_YOUTUBE_BACKGROUND event
  eventType?: string // For START_EVENT and STOP_EVENT
  timestamp: number
} 
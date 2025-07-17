export interface DisplayScreenEvent {
  type: 'EMPLOYEE_OF_MONTH' | 'HIGH_FIVE' | 'RESET' | 'CUSTOM' | 'TOGGLE_NAME_LABELS' | 'SET_BACKGROUND_COLOR' | 'TOGGLE_QR_CODE' | 'START_COLOR_CYCLE' | 'STOP_COLOR_CYCLE' | 'SET_COLOR_CYCLE_SPEED' | 'SPEAK_MESSAGE' | 'SET_YOUTUBE_BACKGROUND' | 'CLEAR_YOUTUBE_BACKGROUND' | 'START_EVENT' | 'STOP_EVENT' | 'TOGGLE_VIDEO_SHAPES' | 'TOGGLE_INVERT_COLORS' | 'HIGHLIGHT_LAILA' | 'SET_DISPLAY_TEXT' | 'CLEAR_DISPLAY_TEXT' | 'SET_TEXT_FONT'
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
  text?: string // For SET_DISPLAY_TEXT event
  fontFamily?: string // For SET_TEXT_FONT event
  // Trivia-specific properties
  question?: string // For TRIVIA_QUESTION event
  choices?: string[] // For TRIVIA_QUESTION event
  correctAnswer?: number // For TRIVIA_QUESTION event
  topicName?: string // For TRIVIA_QUESTION event
  showAnswerStats?: boolean // For TRIVIA_QUESTION event
  timestamp: number
}

// Trivia-related types
export interface TriviaAnswer {
  participantId: string
  selectedAnswer: number
  isCorrect: boolean
  submittedAt: number
}

export interface TriviaStats {
  totalAnswers: number
  correctAnswers: number
  question?: string
  isActive?: boolean
}

export interface TriviaAnswerSubmission {
  action: 'submit-answer'
  participantId: string
  selectedAnswer: number
}

export interface TriviaSessionStart {
  action: 'start-session'
  question: string
  correctAnswer: number
  choices: string[]
  topicName: string
}

export interface TriviaSessionEnd {
  action: 'end-session'
}

export interface TriviaStatsEvent {
  totalAnswers: number
  correctAnswers: number
  question: string
} 
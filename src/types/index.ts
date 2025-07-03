export interface DisplayScreenEvent {
  type: 'EMPLOYEE_OF_MONTH' | 'HIGH_FIVE' | 'RESET' | 'CUSTOM' | 'TOGGLE_NAME_LABELS' | 'SET_BACKGROUND_COLOR'
  participantId?: string
  participantIds?: string[]
  message?: string
  duration?: number // Optional - just metadata for live shows
  showNameLabels?: boolean // For TOGGLE_NAME_LABELS event
  backgroundColor?: string // For SET_BACKGROUND_COLOR event
  timestamp: number
} 
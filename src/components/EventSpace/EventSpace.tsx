'use client'

import HighlightLailaEvent from './HighlightLailaEvent'
import SamePictureEvent from './SamePictureEvent/SamePictureEvent'

interface EventSpaceProps {
  show: boolean
  eventType: string
  participantId?: string
  canvasSize: { width: number; height: number }
}

export default function EventSpace({ show, eventType, participantId, canvasSize }: EventSpaceProps) {
  if (!show) {
    return null
  }

  // Handle different event types by delegating to specific components
  switch (eventType) {
    case 'HIGHLIGHT_LAILA':
      return (
        <HighlightLailaEvent
          participantId={participantId}
          canvasSize={canvasSize}
        />
      )
    
    case 'SAME_PICTURE_EVENT':
      return (
        <SamePictureEvent
          canvasSize={canvasSize}
        />
      )
    
    default:
      return null
  }
} 
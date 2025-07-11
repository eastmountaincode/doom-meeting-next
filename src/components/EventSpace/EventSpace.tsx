'use client'

import HighlightLailaEvent from './HighlightLailaEvent'
import SamePictureEvent from './SamePictureEvent/SamePictureEvent'
import EvolutionOfUniverseEvent from './EvolutionOfUniverseEvent'

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
    
    case 'EVOLUTION_OF_UNIVERSE':
      return (
        <EvolutionOfUniverseEvent
          canvasSize={canvasSize}
        />
      )
    
    default:
      return null
  }
} 
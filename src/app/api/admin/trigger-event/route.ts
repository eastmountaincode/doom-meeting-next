import Pusher from 'pusher'
import { NextRequest } from 'next/server'

// Initialize Pusher server
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
})

export interface DisplayEvent {
  type: 'EMPLOYEE_OF_MONTH' | 'HIGH_FIVE' | 'RESET' | 'CUSTOM'
  participantId?: string
  participantIds?: string[]
  message?: string
  duration?: number
  timestamp: number
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const event: DisplayEvent = {
      type: body.type,
      participantId: body.participantId,
      participantIds: body.participantIds,
      message: body.message,
      duration: body.duration || 10000, // Default 10 seconds
      timestamp: Date.now()
    }
    
    // Broadcast to display screen
    await pusher.trigger('display-channel', 'admin-event', event)
    
    console.log('Event triggered:', event)
    
    return Response.json({ 
      success: true, 
      event,
      message: 'Event broadcasted to display screen'
    })
    
  } catch (error) {
    console.error('Error triggering event:', error)
    return Response.json(
      { error: 'Failed to trigger event' },
      { status: 500 }
    )
  }
} 
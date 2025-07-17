import { NextRequest } from 'next/server'
import Pusher from 'pusher'
import { DisplayScreenEvent } from '../../../../types'

// Initialize Pusher with environment variables
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Admin trigger request body:', body)
    
    // Validate basic structure
    if (!body.type) {
      return Response.json({ error: 'Event type is required' }, { status: 400 })
    }

    // Create the event with timestamp
    const event: DisplayScreenEvent = {
      ...body,
      timestamp: Date.now()
    }

    console.log('Broadcasting display screen event:', event)
    
    // Handle different event types
    if (body.type === 'DISPLAY_COLOR_UPDATE') {
      // Send color update to admin channel
      await pusher.trigger('admin-channel', 'display-color-update', {
        backgroundColor: body.backgroundColor
      })
    } else if (body.type === 'REVEAL_ANSWER') {
      // Send reveal answer event to display channel
      await pusher.trigger('display-channel', 'trivia-reveal-answer', {
        eventType: body.eventType
      })
    } else {
      // Send other events to display channel
    await pusher.trigger('display-channel', 'display-screen-event', event)
    }
    
    return Response.json({ 
      success: true, 
      message: 'Event triggered successfully',
      event 
    })
    
  } catch (error) {
    console.error('Admin trigger error:', error)
    return Response.json(
      { error: 'Failed to trigger event' }, 
      { status: 500 }
    )
  }
} 
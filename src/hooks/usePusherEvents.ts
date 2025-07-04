import { useEffect, useState } from 'react'

interface PusherEventData {
  type: string
  baseSpeed?: number
  showNameLabels?: boolean
  showQrCode?: boolean
  qrCodeColor?: 'black' | 'white'
  backgroundColor?: string
  saturation?: number
  lightness?: number
  speed?: number
  startHue?: number
  text?: string
}

interface PusherEventHandlers {
  onSetBaseSpeed?: (speed: number) => void
  onToggleNameLabels?: (show: boolean) => void
  onToggleQrCode?: (show: boolean) => void
  onSetQrCodeColor?: (color: 'black' | 'white') => void
  onSetBackgroundColor?: (color: string) => void
  onSetBackgroundColorTransition?: (color: string) => void
  onStartColorCycle?: (data: { saturation?: number, lightness?: number, speed?: number, startHue?: number }) => void
  onStopColorCycle?: () => void
  onSetColorCycleSpeed?: (speed: number) => void
  onSetDisplayText?: (text: string) => void
  onClearDisplayText?: () => void
}

export function usePusherEvents(handlers: PusherEventHandlers) {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    let pusher: any = null
    let channel: any = null

    const connectToPusher = async () => {
      try {
        const Pusher = (await import('pusher-js')).default
        pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        })
        
        if (pusher) {
          channel = pusher.subscribe('display-channel')
          
          channel.bind('display-screen-event', (data: PusherEventData) => {
            console.log('Received display event:', data)
            
            if (data.type === 'SET_BASE_SPEED' && data.baseSpeed !== undefined) {
              handlers.onSetBaseSpeed?.(data.baseSpeed)
            }
            
            if (data.type === 'TOGGLE_NAME_LABELS' && data.showNameLabels !== undefined) {
              handlers.onToggleNameLabels?.(data.showNameLabels)
            }
            
            if (data.type === 'TOGGLE_QR_CODE' && data.showQrCode !== undefined) {
              handlers.onToggleQrCode?.(data.showQrCode)
            }
            
            if (data.type === 'SET_QR_CODE_COLOR' && data.qrCodeColor !== undefined) {
              handlers.onSetQrCodeColor?.(data.qrCodeColor)
            }
            
            if (data.type === 'SET_BACKGROUND_COLOR' && data.backgroundColor) {
              handlers.onSetBackgroundColor?.(data.backgroundColor)
            }
            
            if (data.type === 'SET_BACKGROUND_COLOR_TRANSITION' && data.backgroundColor) {
              handlers.onSetBackgroundColorTransition?.(data.backgroundColor)
            }
            
            if (data.type === 'START_COLOR_CYCLE') {
              console.log('Display received START_COLOR_CYCLE with:', { 
                saturation: data.saturation, 
                lightness: data.lightness,
                speed: data.speed,
                startHue: data.startHue
              })
              handlers.onStartColorCycle?.({
                saturation: data.saturation,
                lightness: data.lightness,
                speed: data.speed,
                startHue: data.startHue
              })
            }
            
            if (data.type === 'STOP_COLOR_CYCLE') {
              handlers.onStopColorCycle?.()
            }
            
            if (data.type === 'SET_COLOR_CYCLE_SPEED' && data.speed !== undefined) {
              console.log('Display received SET_COLOR_CYCLE_SPEED with:', { speed: data.speed })
              handlers.onSetColorCycleSpeed?.(data.speed)
            }
            
            if (data.type === 'SET_DISPLAY_TEXT' && data.text !== undefined) {
              console.log('Display received SET_DISPLAY_TEXT with:', { text: data.text })
              handlers.onSetDisplayText?.(data.text)
            }
            
            if (data.type === 'CLEAR_DISPLAY_TEXT') {
              console.log('Display received CLEAR_DISPLAY_TEXT')
              handlers.onClearDisplayText?.()
            }
          })
          
          pusher.connection.bind('connected', () => {
            console.log('Pusher connected for display events!')
            setIsConnected(true)
          })
          
          pusher.connection.bind('disconnected', () => {
            console.log('Pusher disconnected')
            setIsConnected(false)
          })
        }
      } catch (error) {
        console.error('Failed to initialize Pusher:', error)
      }
    }

    connectToPusher()

    return () => {
      if (channel) {
        channel.unbind_all()
        pusher?.unsubscribe('display-channel')
      }
      if (pusher) {
        pusher.disconnect()
      }
      setIsConnected(false)
    }
  }, [handlers])

  return { isConnected }
} 
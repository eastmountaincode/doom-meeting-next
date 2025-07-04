/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from 'react'

function isFunction(value: unknown): value is (...args: any[]) => any {
  return typeof value === 'function';
}

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
  const handlersRef = useRef(handlers)

  // Update handlers ref when handlers change
  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  useEffect(() => {
    let pusher: any = null
    let channel: any = null

    const connectToPusher = async () => {
      try {
        const Pusher = (await import('pusher-js')).default
        pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        })
        
        if (pusher && typeof pusher.subscribe === 'function') {
          channel = pusher.subscribe('display-channel')
          
          if (channel && typeof channel.bind === 'function') {
            channel.bind('display-screen-event', (data: PusherEventData) => {
              console.log('Received display event:', data)
              
              if (data.type === 'SET_BASE_SPEED' && data.baseSpeed !== undefined) {
                handlersRef.current.onSetBaseSpeed?.(data.baseSpeed)
              }
              
              if (data.type === 'TOGGLE_NAME_LABELS' && data.showNameLabels !== undefined) {
                handlersRef.current.onToggleNameLabels?.(data.showNameLabels)
              }
              
              if (data.type === 'TOGGLE_QR_CODE' && data.showQrCode !== undefined) {
                handlersRef.current.onToggleQrCode?.(data.showQrCode)
              }
              
              if (data.type === 'SET_QR_CODE_COLOR' && data.qrCodeColor !== undefined) {
                handlersRef.current.onSetQrCodeColor?.(data.qrCodeColor)
              }
              
              if (data.type === 'SET_BACKGROUND_COLOR' && data.backgroundColor) {
                handlersRef.current.onSetBackgroundColor?.(data.backgroundColor)
              }
              
              if (data.type === 'SET_BACKGROUND_COLOR_TRANSITION' && data.backgroundColor) {
                handlersRef.current.onSetBackgroundColorTransition?.(data.backgroundColor)
              }
              
              if (data.type === 'START_COLOR_CYCLE') {
                console.log('Display received START_COLOR_CYCLE with:', { 
                  saturation: data.saturation, 
                  lightness: data.lightness,
                  speed: data.speed,
                  startHue: data.startHue
                })
                handlersRef.current.onStartColorCycle?.({
                  saturation: data.saturation,
                  lightness: data.lightness,
                  speed: data.speed,
                  startHue: data.startHue
                })
              }
              
              if (data.type === 'STOP_COLOR_CYCLE') {
                handlersRef.current.onStopColorCycle?.()
              }
              
              if (data.type === 'SET_COLOR_CYCLE_SPEED' && data.speed !== undefined) {
                console.log('Display received SET_COLOR_CYCLE_SPEED with:', { speed: data.speed })
                handlersRef.current.onSetColorCycleSpeed?.(data.speed)
              }
              
              if (data.type === 'SET_DISPLAY_TEXT' && data.text !== undefined) {
                console.log('Display received SET_DISPLAY_TEXT with:', { text: data.text })
                handlersRef.current.onSetDisplayText?.(data.text)
              }
              
              if (data.type === 'CLEAR_DISPLAY_TEXT') {
                console.log('Display received CLEAR_DISPLAY_TEXT')
                handlersRef.current.onClearDisplayText?.()
              }
            })
          }
          if (pusher.connection && typeof pusher.connection.bind === 'function') {
            pusher.connection.bind('connected', () => {
              console.log('Pusher connected for display events!')
              setIsConnected(true)
            })
            pusher.connection.bind('disconnected', () => {
              console.log('Pusher disconnected')
              setIsConnected(false)
            })
          }
        }
      } catch (error) {
        console.error('Failed to initialize Pusher:', error)
      }
    }

    connectToPusher()

    return () => {
      if (channel && isFunction(channel.unbind_all)) {
        channel.unbind_all();
      }
      if (pusher && isFunction(pusher.unsubscribe)) {
        pusher.unsubscribe('display-channel');
      }
      if (pusher && isFunction(pusher.disconnect)) {
        pusher.disconnect();
      }
      setIsConnected(false);
    }
  }, []) // Empty dependency array - only run once

  return { isConnected }
} 
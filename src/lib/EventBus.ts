import { VideoSquareEvent, EventCallback } from '../types/videoSquare'

export class EventBus {
  private listeners: Map<string, EventCallback[]> = new Map()

  on(eventType: string, callback: EventCallback): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, [])
    }
    this.listeners.get(eventType)!.push(callback)
  }

  off(eventType: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(eventType)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  emit(eventType: string, data?: any): void {
    const callbacks = this.listeners.get(eventType)
    if (callbacks) {
      const event: VideoSquareEvent = {
        type: eventType as any,
        data,
        timestamp: Date.now()
      }
      callbacks.forEach(callback => callback(event))
    }
  }

  removeAllListeners(eventType?: string): void {
    if (eventType) {
      this.listeners.delete(eventType)
    } else {
      this.listeners.clear()
    }
  }
} 
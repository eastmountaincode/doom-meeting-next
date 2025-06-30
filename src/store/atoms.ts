import { atom } from 'jotai'

// Screen navigation atom
export const currentScreenAtom = atom<'landing' | 'camera'>('landing')

// User data atoms
export const screenNameAtom = atom('')

// Camera state atoms
export const selectedCameraAtom = atom<null | 'front' | 'back'>(null)

// Actions (derived atoms for state updates)
export const navigateToLandingAtom = atom(
  null,
  (get, set) => {
    set(currentScreenAtom, 'landing')
    set(screenNameAtom, '')
    set(selectedCameraAtom, null)
  }
)

export const joinMeetingAtom = atom(
  null,
  (get, set, screenName: string) => {
    set(screenNameAtom, screenName)
    set(currentScreenAtom, 'camera')
  }
)

// Display Event types
export interface DisplayEvent {
  type: 'EMPLOYEE_OF_MONTH' | 'HIGH_FIVE' | 'RESET' | 'CUSTOM'
  participantId?: string
  participantIds?: string[]
  message?: string
  duration?: number
  timestamp: number
}

// Display state atoms
export const displayModeAtom = atom<'idle' | 'default' | 'event'>('idle')
export const currentEventAtom = atom<DisplayEvent | null>(null)
export const participantCountAtom = atom(0)

// Display actions
export const triggerEventAtom = atom(
  null,
  (get, set, event: DisplayEvent) => {
    set(currentEventAtom, event)
    set(displayModeAtom, 'event')
    
    // Auto-clear event after duration
    if (event.duration) {
      setTimeout(() => {
        set(currentEventAtom, null)
        const participantCount = get(participantCountAtom)
        set(displayModeAtom, participantCount > 0 ? 'default' : 'idle')
      }, event.duration)
    }
  }
)

export const resetDisplayAtom = atom(
  null,
  (get, set) => {
    set(currentEventAtom, null)
    const participantCount = get(participantCountAtom)
    set(displayModeAtom, participantCount > 0 ? 'default' : 'idle')
  }
) 
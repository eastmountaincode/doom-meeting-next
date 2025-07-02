import { atom } from 'jotai'
import { DisplayScreenEvent } from '../types'
import { 
  currentScreenAtom,
  screenNameAtom,
  selectedCameraAtom,
  displayModeAtom,
  currentEventAtom,
  participantCountAtom
} from './state'

// Navigation actions
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

// Display actions
export const setEventAtom = atom(
  null,
  (get, set, event: DisplayScreenEvent | null) => {
    set(currentEventAtom, event)
    if (event) {
      set(displayModeAtom, 'event')
    } else {
      const participantCount = get(participantCountAtom)
      set(displayModeAtom, participantCount > 0 ? 'default' : 'idle')
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
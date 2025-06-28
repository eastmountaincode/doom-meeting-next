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
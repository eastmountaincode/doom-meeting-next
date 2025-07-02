import { atom } from 'jotai'
import { DisplayScreenEvent } from '../types'

// Screen navigation atom
export const currentScreenAtom = atom<'landing' | 'camera'>('landing')

// User data atoms
export const screenNameAtom = atom('')

// Camera state atoms
export const selectedCameraAtom = atom<null | 'front' | 'back'>(null)

// Display screen state atoms
export const displayModeAtom = atom<'idle' | 'default' | 'event'>('idle')
export const currentEventAtom = atom<DisplayScreenEvent | null>(null)
export const participantCountAtom = atom(0) 
/**
 * Window CustomEvents used to signal dunning-page UI state across sibling
 * client components (SequenceEditor <-> StuckHelper) without lifting state
 * into a shared parent. Same pattern as the tour's REPLAY_EVENT.
 */
export const DUNNING_UNSAVED_EVENT = 'dunning:unsaved';   // detail: boolean
export const DUNNING_ERROR_EVENT = 'dunning:error';       // detail: string | null

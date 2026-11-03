export type EditHistory<T> = {present: T; past: T[]; future?: T[]; grouping: boolean; captured: boolean};
export type EditAction<T> = {type: 'set'; value: T | ((previous: T) => T)} | {type: 'undo' | 'redo' | 'begin' | 'end' | 'reset'};
export function editHistory<T>(state: EditHistory<T>, action: EditAction<T>): EditHistory<T> {
  if (action.type === 'reset') return {...state, past: [], future: [], grouping: false, captured: false};
  if (action.type === 'begin') return {...state, grouping: true, captured: false};
  if (action.type === 'end') return {...state, grouping: false, captured: false};
  if (action.type === 'redo') {
    if (!state.future?.length) return state;
    return {...state,present:state.future[0],past:[...state.past,state.present],future:state.future.slice(1),grouping:false,captured:false};
  }
  if (action.type === 'undo') {
    if (!state.past.length) return state;
    return {present: state.past[state.past.length - 1], past: state.past.slice(0, -1), future: [state.present,...(state.future || [])], grouping: false, captured: false};
  }
  if (action.type !== 'set') return state;
  const next = typeof action.value === 'function' ? (action.value as (previous: T) => T)(state.present) : action.value;
  if (Object.is(next, state.present)) return state;
  // Settings are immutable. Avoid history entries for top-level no-op updates.
  if (next && state.present && typeof next === 'object' && typeof state.present === 'object') {
    const keys = Object.keys(next);
    if (keys.length === Object.keys(state.present).length && keys.every((key) => Object.is((next as Record<string, unknown>)[key], (state.present as Record<string, unknown>)[key]))) return state;
  }
  const past = state.grouping && state.captured ? state.past : [...state.past.slice(-59), state.present];
  return {present: next, past, future: [], grouping: state.grouping, captured: state.grouping};
}

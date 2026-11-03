import {useCallback, useEffect, useReducer} from 'react';
import {editHistory, type EditAction, type EditHistory} from './editHistory';
export function useEditHistory<T>(initialize: () => T) {
  const [state, dispatch] = useReducer((state: EditHistory<T>, action: EditAction<T>) => editHistory(state, action), undefined,
    () => ({present: initialize(), past: [], grouping: false, captured: false}));
  const set = useCallback((value: T | ((previous: T) => T)) => dispatch({type: 'set', value}), []);
  const undo = useCallback(() => dispatch({type: 'undo'}), []);
  const redo = useCallback(() => dispatch({type: 'redo'}), []);
  const reset = useCallback(() => dispatch({type: 'reset'}), []);
  useEffect(() => {
    const begin = () => dispatch({type: 'begin'});
    const end = () => queueMicrotask(() => dispatch({type: 'end'}));
    window.addEventListener('pointerdown', begin, true);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    window.addEventListener('blur', end);
    return () => {
      window.removeEventListener('pointerdown', begin, true);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      window.removeEventListener('blur', end);
    };
  }, []);
  return [state.present, set, undo, state.past.length > 0, reset, redo, Boolean(state.future?.length)] as const;
}

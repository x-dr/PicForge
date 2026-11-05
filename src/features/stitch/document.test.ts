import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  editorReducer,
  type StitchDocument,
} from './document';
const initial: StitchDocument = {
  assets: [],
  settings: DEFAULT_SETTINGS,
  revision: 0,
};
describe('editor lifecycle', () => {
  it('preserves selection order when decoding resolves in reverse', () => {
    let state = editorReducer(initial, {
      type: 'add',
      assets: ['a', 'b'].map((id) => ({
        id,
        name: id,
        width: 0,
        height: 0,
        status: 'loading',
      })),
    });
    state = editorReducer(state, {
      type: 'resolved',
      id: 'b',
      value: { status: 'ready' },
    });
    state = editorReducer(state, {
      type: 'resolved',
      id: 'a',
      value: { status: 'ready' },
    });
    expect(state.assets.map((asset) => asset.id)).toEqual(['a', 'b']);
    state = editorReducer(state, { type: 'move', id: 'b', to: 0 });
    expect(state.assets.map((asset) => asset.id)).toEqual(['b', 'a']);
  });
  it('ignores results from deleted assets', () => {
    const state = editorReducer(initial, {
      type: 'resolved',
      id: 'gone',
      value: { status: 'ready' },
    });
    expect(state).toBe(initial);
  });
  it('keeps settings after clear and increments document revision', () => {
    const changed = editorReducer(initial, {
      type: 'settings',
      patch: { mode: 'grid' },
    });
    expect(editorReducer(changed, { type: 'clear' })).toEqual({
      assets: [],
      settings: { ...DEFAULT_SETTINGS, mode: 'grid' },
      revision: 2,
    });
  });
});

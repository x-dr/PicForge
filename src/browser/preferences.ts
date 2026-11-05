import {
  normalizeSettings,
  type StitchSettings,
} from '../features/stitch/document';
const KEY = 'picforge:stitch:v1';
export function loadPreferences(): StitchSettings {
  try {
    return normalizeSettings(
      JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {},
    );
  } catch {
    return normalizeSettings({});
  }
}
export function savePreferences(settings: StitchSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* Storage is optional. */
  }
}

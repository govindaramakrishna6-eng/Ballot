import { useSyncExternalStore } from "react";
import { onSoundChange, setSoundEnabled, soundEnabled } from "../lib/sound";

/** The visitor's sound preference (remembered in this browser). */
export function useSoundSetting(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(onSoundChange, soundEnabled, () => true);
  return [on, setSoundEnabled];
}

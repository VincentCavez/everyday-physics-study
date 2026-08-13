import { useEffect } from "react";

export function stimulusUrl(sceneId: string): string {
  return `${import.meta.env.BASE_URL}stimuli/${sceneId}.png`;
}

/** Précharge les stimuli suivants pendant que le participant répond. */
export function usePreload(sceneIds: (string | null | undefined)[]): void {
  const key = sceneIds.filter(Boolean).join("|");
  useEffect(() => {
    for (const id of key.split("|")) {
      if (!id) continue;
      const img = new Image();
      img.src = stimulusUrl(id);
    }
  }, [key]);
}

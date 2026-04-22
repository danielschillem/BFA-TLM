import { useState, useCallback, useRef } from "react";

/**
 * Copy text to clipboard with status feedback.
 * Uses the modern Clipboard API. State auto-resets after timeout.
 *
 * @param {number} [resetDelay=2000] - Ms before isCopied resets to false
 * @returns {[copy: (text: string) => Promise<void>, isCopied: boolean]}
 */
export function useCopyToClipboard(resetDelay = 2000) {
  const [isCopied, setIsCopied] = useState(false);
  const timerRef = useRef(null);

  const copy = useCallback(
    async (text) => {
      if (!navigator?.clipboard) {
        console.warn("useCopyToClipboard: Clipboard API not available");
        return;
      }

      try {
        await navigator.clipboard.writeText(text);
        setIsCopied(true);

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setIsCopied(false), resetDelay);
      } catch (err) {
        console.error("useCopyToClipboard: Failed to copy", err);
        setIsCopied(false);
      }
    },
    [resetDelay],
  );

  return [copy, isCopied];
}

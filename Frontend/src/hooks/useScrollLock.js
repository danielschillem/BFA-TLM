import { useEffect, useRef, useCallback, useState } from "react";

/**
 * Lock body scroll when modals/overlays are open.
 * Compensates for scrollbar width to prevent layout shift.
 *
 * @param {boolean} locked - Whether scroll should be locked
 * @returns {{ isLocked: boolean, lock: () => void, unlock: () => void }}
 */
export function useScrollLock(locked = false) {
  const [isLocked, setIsLocked] = useState(locked);
  const originalStyles = useRef(null);

  const lock = useCallback(() => setIsLocked(true), []);
  const unlock = useCallback(() => setIsLocked(false), []);

  useEffect(() => {
    if (!isLocked) {
      // Restore original styles if we saved them
      if (originalStyles.current) {
        document.body.style.overflow = originalStyles.current.overflow;
        document.body.style.paddingRight = originalStyles.current.paddingRight;
        originalStyles.current = null;
      }
      return;
    }

    // Save original styles before locking
    originalStyles.current = {
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight,
    };

    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      if (originalStyles.current) {
        document.body.style.overflow = originalStyles.current.overflow;
        document.body.style.paddingRight = originalStyles.current.paddingRight;
        originalStyles.current = null;
      }
    };
  }, [isLocked]);

  // Sync with external locked prop
  useEffect(() => {
    setIsLocked(locked);
  }, [locked]);

  return { isLocked, lock, unlock };
}

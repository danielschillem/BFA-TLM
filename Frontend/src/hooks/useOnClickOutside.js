import { useEffect, useRef } from "react";

/**
 * Detect clicks outside one or more elements.
 * Essential for modals, dropdowns, context menus, and dismissible UI.
 *
 * @param {React.RefObject|React.RefObject[]} ref - Ref(s) to exclude from outside detection
 * @param {function} handler - Callback fired on outside click
 * @param {string} [eventType='mousedown'] - DOM event to listen for
 */
export function useOnClickOutside(ref, handler, eventType = "mousedown") {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const listener = (event) => {
      const refs = Array.isArray(ref) ? ref : [ref];
      const isInside = refs.some((r) => {
        const el = r?.current;
        return el && (el === event.target || el.contains(event.target));
      });

      if (isInside) return;

      // Ignore clicks on disconnected DOM nodes (portals edge case)
      if (!event.target?.isConnected) return;

      handlerRef.current(event);
    };

    document.addEventListener(eventType, listener, true);
    // Also handle touch for mobile
    if (eventType === "mousedown") {
      document.addEventListener("touchstart", listener, true);
    }

    return () => {
      document.removeEventListener(eventType, listener, true);
      if (eventType === "mousedown") {
        document.removeEventListener("touchstart", listener, true);
      }
    };
  }, [ref, eventType]);
}

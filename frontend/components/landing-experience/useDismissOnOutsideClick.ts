import { useEffect, type RefObject } from 'react';

export function useDismissOnOutsideClick(
  enabled: boolean,
  onDismiss: () => void,
  drawerRef: RefObject<HTMLElement | null>,
  menuButtonRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!enabled) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (drawerRef.current?.contains(target)) return;
      if (menuButtonRef.current?.contains(target)) return;
      onDismiss();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [enabled, onDismiss, drawerRef, menuButtonRef]);
}

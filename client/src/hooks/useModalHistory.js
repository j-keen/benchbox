import { useEffect, useRef } from 'react';

export default function useModalHistory(isOpen, onClose) {
  const closedByBackRef = useRef(false);
  const didPushRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ modal: true }, '', window.location.href);
    closedByBackRef.current = false;
    didPushRef.current = true;

    const handlePopState = () => {
      closedByBackRef.current = true;
      didPushRef.current = false;
      onCloseRef.current();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (!closedByBackRef.current && didPushRef.current) {
        didPushRef.current = false;
        window.history.back();
      }
      closedByBackRef.current = false;
    };
  }, [isOpen]);
}

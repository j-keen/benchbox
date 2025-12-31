import { useCallback, useRef, useState } from 'react';

const useLongPress = (onLongPress, onClick, { delay = 500 } = {}) => {
    const [longPressTriggered, setLongPressTriggered] = useState(false);
    const timeout = useRef(null);
    const target = useRef(null);
    const touchMoved = useRef(false);

    const start = useCallback((event) => {
        // Prevent text selection during long press
        event.preventDefault();

        touchMoved.current = false;
        target.current = event.target;

        timeout.current = setTimeout(() => {
            setLongPressTriggered(true);
            onLongPress && onLongPress(event);

            // Haptic feedback for mobile (if available)
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }, delay);
    }, [onLongPress, delay]);

    const clear = useCallback((event, shouldTriggerClick = true) => {
        timeout.current && clearTimeout(timeout.current);

        // Only trigger click if:
        // - shouldTriggerClick is true
        // - long press wasn't triggered
        // - touch didn't move significantly
        if (shouldTriggerClick && !longPressTriggered && !touchMoved.current && onClick) {
            onClick(event);
        }

        setLongPressTriggered(false);
    }, [onClick, longPressTriggered]);

    const handleTouchMove = useCallback((event) => {
        // If finger moves more than 10px, cancel the long press
        if (timeout.current) {
            touchMoved.current = true;
            clearTimeout(timeout.current);
        }
    }, []);

    return {
        onMouseDown: (e) => start(e),
        onMouseUp: (e) => clear(e),
        onMouseLeave: (e) => clear(e, false),
        onTouchStart: (e) => start(e),
        onTouchEnd: (e) => clear(e),
        onTouchMove: handleTouchMove,
        onContextMenu: (e) => e.preventDefault(), // Prevent context menu on long press
    };
};

export default useLongPress;

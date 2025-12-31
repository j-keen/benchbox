import { useEffect, useCallback } from 'react';

export function useKeyboardShortcuts(shortcuts) {
    const handleKeyDown = useCallback((e) => {
        // 입력 필드에서는 단축키 비활성화 (ESC 제외)
        const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

        for (const shortcut of shortcuts) {
            const { key, ctrl, alt, shift, action, allowInInput } = shortcut;

            // 입력 필드에서 허용되지 않은 단축키는 무시
            if (isInputFocused && !allowInInput && key !== 'Escape') {
                continue;
            }

            const ctrlMatch = ctrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey;
            const altMatch = alt ? e.altKey : !e.altKey;
            const shiftMatch = shift ? e.shiftKey : !e.shiftKey;
            const keyMatch = e.key === key || e.code === key;

            if (ctrlMatch && altMatch && shiftMatch && keyMatch) {
                e.preventDefault();
                action(e);
                break;
            }
        }
    }, [shortcuts]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}

export function useGlobalPaste(onPaste) {
    useEffect(() => {
        const handlePaste = async (e) => {
            // 입력 필드에서는 기본 붙여넣기 사용
            const isInputFocused = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
            if (isInputFocused) return;

            const text = e.clipboardData?.getData('text');
            if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
                e.preventDefault();
                onPaste(text);
            }
        };

        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [onPaste]);
}

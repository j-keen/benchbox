import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../contexts/ToastContext';

const QuickUrlModal = ({ title, placeholder, onSubmit, onClose }) => {
    const toast = useToast();
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!url.trim()) return;

        setLoading(true);
        try {
            await onSubmit(url.trim());
            toast.success('등록되었습니다.');
            onClose();
        } catch (error) {
            console.error('URL 등록 오류:', error);
            toast.error(error.response?.data?.error || 'URL 등록에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handlePaste = async (e) => {
        const pastedUrl = e.clipboardData.getData('text');
        if (pastedUrl && (pastedUrl.startsWith('http://') || pastedUrl.startsWith('https://'))) {
            e.preventDefault();
            setUrl(pastedUrl);
            // 자동 제출
            setLoading(true);
            try {
                await onSubmit(pastedUrl.trim());
                toast.success('등록되었습니다.');
                onClose();
            } catch (error) {
                console.error('URL 등록 오류:', error);
                toast.error(error.response?.data?.error || 'URL 등록에 실패했습니다.');
                setLoading(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
                <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-lg"
                    >
                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <input
                                ref={inputRef}
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                onPaste={handlePaste}
                                placeholder={placeholder}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                disabled={loading}
                            />
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                        </div>
                        <button
                            type="submit"
                            disabled={!url.trim() || loading}
                            className="px-5 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium min-w-[80px] flex items-center justify-center"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                '추가'
                            )}
                        </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                        URL을 붙여넣으면 자동으로 등록됩니다
                    </p>
                </form>

                <div className="p-4 border-t flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                        disabled={loading}
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuickUrlModal;

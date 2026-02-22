import { useState, useEffect } from 'react';
import {
    XMarkIcon,
    KeyIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    EyeIcon,
    EyeSlashIcon,
} from '@heroicons/react/24/outline';
import useModalHistory from '../hooks/useModalHistory';

const STORAGE_KEY = 'benchbox_google_api_key';

// localStorage에서 API 키 가져오기 (외부에서도 사용)
export function getStoredApiKey() {
    return localStorage.getItem(STORAGE_KEY) || '';
}

// localStorage에 API 키 저장하기
export function setStoredApiKey(key) {
    if (key) {
        localStorage.setItem(STORAGE_KEY, key);
    } else {
        localStorage.removeItem(STORAGE_KEY);
    }
}

export default function ApiKeySettingsModal({ isOpen, onClose }) {
    useModalHistory(isOpen, onClose);
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [testStatus, setTestStatus] = useState(null); // null, 'testing', 'success', 'error'
    const [testMessage, setTestMessage] = useState('');

    useEffect(() => {
        if (isOpen) {
            setApiKey(getStoredApiKey());
            setTestStatus(null);
            setTestMessage('');
        }
    }, [isOpen]);

    const handleSave = () => {
        setStoredApiKey(apiKey.trim());
        onClose();
    };

    const handleClear = () => {
        setApiKey('');
        setStoredApiKey('');
        setTestStatus(null);
        setTestMessage('');
    };

    const handleTest = async () => {
        if (!apiKey.trim()) {
            setTestStatus('error');
            setTestMessage('API 키를 입력해주세요.');
            return;
        }

        setTestStatus('testing');
        setTestMessage('테스트 중...');

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey.trim()}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: 'Say "OK" in one word.' }] }],
                        generationConfig: { maxOutputTokens: 10 }
                    })
                }
            );

            if (response.ok) {
                setTestStatus('success');
                setTestMessage('API 키가 유효합니다!');
            } else {
                const errorData = await response.json().catch(() => ({}));
                const msg = errorData?.error?.message || `HTTP ${response.status}`;
                setTestStatus('error');
                setTestMessage(`API 키 오류: ${msg}`);
            }
        } catch (e) {
            setTestStatus('error');
            setTestMessage(`연결 실패: ${e.message}`);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* 백드롭 */}
            <div
                className="fixed inset-0 bg-black/50 z-50 transition-opacity"
                onClick={onClose}
            />

            {/* 모달 */}
            <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md">
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                    {/* 헤더 */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                <KeyIcon className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-900">API 키 설정</h2>
                                <p className="text-xs text-gray-500">Google Gemini & YouTube</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {/* 본문 */}
                    <div className="p-5 space-y-4">
                        {/* 안내 */}
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                            <p className="text-sm text-blue-800 leading-relaxed">
                                AI 메모 다듬기, 태그 추천, YouTube 댓글 기능을 사용하려면 Google API 키가 필요합니다.
                            </p>
                            <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block mt-2 text-sm font-medium text-blue-600 hover:text-blue-700 underline"
                            >
                                Google AI Studio에서 API 키 발급받기 →
                            </a>
                        </div>

                        {/* API 키 입력 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Google API Key
                            </label>
                            <div className="relative">
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    value={apiKey}
                                    onChange={(e) => {
                                        setApiKey(e.target.value);
                                        setTestStatus(null);
                                    }}
                                    placeholder="AIzaSy..."
                                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                                >
                                    {showKey ? (
                                        <EyeSlashIcon className="w-5 h-5" />
                                    ) : (
                                        <EyeIcon className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* 테스트 결과 */}
                        {testStatus && (
                            <div
                                className={`flex items-center gap-2 p-3 rounded-xl ${
                                    testStatus === 'success'
                                        ? 'bg-green-50 text-green-700'
                                        : testStatus === 'error'
                                        ? 'bg-red-50 text-red-700'
                                        : 'bg-gray-50 text-gray-600'
                                }`}
                            >
                                {testStatus === 'success' && (
                                    <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
                                )}
                                {testStatus === 'error' && (
                                    <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                                )}
                                {testStatus === 'testing' && (
                                    <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin flex-shrink-0" />
                                )}
                                <span className="text-sm">{testMessage}</span>
                            </div>
                        )}

                        {/* 보안 안내 */}
                        <p className="text-xs text-gray-500 leading-relaxed">
                            API 키는 브라우저 로컬 저장소에 저장됩니다. 이 기기에서만 사용되며 서버로 전송되지 않습니다.
                        </p>
                    </div>

                    {/* 푸터 */}
                    <div className="px-5 py-4 bg-gray-50 flex items-center justify-between gap-3">
                        <button
                            onClick={handleClear}
                            className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            초기화
                        </button>
                        <div className="flex gap-2">
                            <button
                                onClick={handleTest}
                                disabled={testStatus === 'testing'}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                                테스트
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
                            >
                                저장
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

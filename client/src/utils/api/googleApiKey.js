// Google API Key - localStorage 또는 환경변수에서 로드 (절대 하드코딩 금지!)
const STORAGE_KEY = 'benchbox_google_api_key';

export function getGoogleApiKey() {
    // localStorage 우선, 없으면 환경변수
    return localStorage.getItem(STORAGE_KEY) || import.meta.env.VITE_GOOGLE_API_KEY || '';
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function callGemini(prompt, maxTokens = 500) {
    const apiKey = getGoogleApiKey();
    if (!apiKey) {
        throw new Error('API 키가 설정되지 않았습니다. 설정에서 Google API 키를 등록해주세요.');
    }
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.6, maxOutputTokens: maxTokens }
        })
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData?.error?.message || `HTTP ${response.status}`;
        throw new Error(`Gemini API 오류: ${msg}`);
    }
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

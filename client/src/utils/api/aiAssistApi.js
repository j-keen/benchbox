import { callGemini } from './googleApiKey';

// AI 어시스트 API
export const aiAssistApi = {
    refineMemo: async ({ title, description, memo }) => {
        // Try server first, fallback to direct Gemini call
        try {
            const response = await fetch('/api/ai-assist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'refine-memo', title, description, memo })
            });
            if (response.ok) return response.json();
            // Server returned error - try to get error message
            const errorData = await response.json().catch(() => ({}));
            if (errorData.error) {
                console.log('서버 API 오류:', errorData.error);
            }
        } catch (e) {
            console.log('서버 API 실패, 클라이언트 폴백:', e.message);
        }

        // Direct Gemini call (only if API key is available)
        const prompt = `당신은 한국어 메모를 정리하는 전문가입니다.
사용자가 작성한 영상에 대한 메모를 받아서, 의미는 그대로 유지하면서 더 읽기 쉽고 정돈된 형태로 다듬어주세요.

영상 제목: ${title || '없음'}
영상 설명: ${description || '없음'}

사용자의 메모:
${memo}

규칙:
1. 의미와 내용은 절대 변경하지 말고, 표현만 다듬기
2. 맞춤법과 띄어쓰기 교정
3. 문장 구조를 더 명확하게 개선
4. 친근하고 자연스러운 한국어 사용
5. 메모의 길이는 원본과 비슷하게 유지

다듬어진 메모만 출력해주세요. 별도의 설명이나 서두는 붙이지 마세요.`;

        const result = await callGemini(prompt, 1000);
        return { refinedMemo: result.trim() };
    },

    suggestTags: async ({ title, description, memo, existingTags }) => {
        // Try server first, fallback to direct Gemini call
        try {
            const response = await fetch('/api/ai-assist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'suggest-tags', title, description, memo, existingTags })
            });
            if (response.ok) return response.json();
            // Server returned error - try to get error message
            const errorData = await response.json().catch(() => ({}));
            if (errorData.error) {
                console.log('서버 API 오류:', errorData.error);
            }
        } catch (e) {
            console.log('서버 API 실패, 클라이언트 폴백:', e.message);
        }

        // Direct Gemini call (only if API key is available)
        const existingTagsList = existingTags?.length > 0 ? `\n이미 입력된 태그: ${existingTags.join(', ')}` : '';
        const prompt = `영상 콘텐츠 분류 전문가로서, 다음 영상 정보를 분석하여 관련성 높은 한국어 태그를 5-7개 제안해주세요.

영상 제목: ${title || '없음'}
영상 설명: ${description || '없음'}
메모: ${memo || '없음'}${existingTagsList}

규칙:
1. 영상의 핵심 주제와 관련된 태그
2. 검색에 유용한 키워드 위주
3. 한국어로만 작성
4. 각 태그는 2-4 단어 이내
5. 이미 입력된 태그와 중복 금지

태그만 쉼표로 구분하여 출력해주세요.`;

        const result = await callGemini(prompt, 200);
        const tags = result.split(',').map(t => t.trim()).filter(t => t.length > 0).slice(0, 7);
        return { suggestedTags: tags };
    }
};

// Vercel Serverless Function for AI Assistance using Google Gemini API
const GEMINI_API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyBP72SA8upFcS5Buykjn5oSfvfWnvDosAw';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, title, description, memo, existingTags } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    let prompt;

    if (action === 'refine-memo') {
      // Memo refinement prompt
      if (!memo) {
        return res.status(400).json({ error: 'Memo is required for refinement' });
      }

      prompt = `당신은 한국어 메모를 정리하는 전문가입니다.
사용자가 작성한 영상에 대한 메모를 받아서, 의미는 그대로 유지하면서 더 읽기 쉽고 정돈된 형태로 다듬어주세요.

영상 제목: ${title || '없음'}
영상 설명: ${description || '없음'}

사용자의 메모:
${memo}

다음 규칙을 따라주세요:
1. 의미와 내용은 절대 변경하지 말고, 표현만 다듬기
2. 맞춤법과 띄어쓰기 교정
3. 문장 구조를 더 명확하게 개선
4. 필요시 적절한 문단 나누기
5. 핵심 내용은 유지하되 중복 제거
6. 친근하고 자연스러운 한국어 사용
7. 메모의 길이는 원본과 비슷하게 유지 (너무 길게 늘리지 말 것)

다듬어진 메모만 출력해주세요. 별도의 설명이나 서두, 결론은 붙이지 마세요.`;

    } else if (action === 'suggest-tags') {
      // Tag suggestion prompt
      if (!title && !description && !memo) {
        return res.status(400).json({ error: 'At least one of title, description, or memo is required for tag suggestions' });
      }

      const existingTagsList = existingTags && existingTags.length > 0
        ? `\n\n이미 입력된 태그: ${existingTags.join(', ')}`
        : '';

      prompt = `당신은 영상 콘텐츠 분류 전문가입니다.
다음 영상 정보를 분석하여 관련성 높은 한국어 태그를 5-7개 제안해주세요.

영상 제목: ${title || '없음'}
영상 설명: ${description || '없음'}
메모: ${memo || '없음'}${existingTagsList}

다음 규칙을 따라주세요:
1. 영상의 핵심 주제와 관련된 태그
2. 검색에 유용한 키워드 위주
3. 너무 일반적이거나 너무 구체적인 태그 지양
4. 한국어로만 작성 (필요시 외래어는 한글 표기)
5. 각 태그는 2-4 단어 이내
6. 이미 입력된 태그와 중복되지 않게${existingTagsList ? '' : ' (첫 제안이므로 자유롭게)'}

태그만 쉼표로 구분하여 출력해주세요. 예: 프로그래밍, 웹개발, 리액트, 초보자, 튜토리얼`;

    } else {
      return res.status(400).json({ error: 'Invalid action. Use "refine-memo" or "suggest-tags"' });
    }

    // Call Gemini API
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: action === 'suggest-tags' ? 0.7 : 0.5,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: action === 'suggest-tags' ? 200 : 1000,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', errorData);
      return res.status(500).json({
        error: 'AI 처리 중 오류가 발생했습니다.'
      });
    }

    const data = await response.json();

    // Extract text from Gemini response
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      console.error('Unexpected Gemini response format:', JSON.stringify(data));
      return res.status(500).json({ error: 'Unexpected response format from Gemini API' });
    }

    // Format response based on action
    if (action === 'refine-memo') {
      return res.status(200).json({
        refinedMemo: generatedText.trim()
      });
    } else if (action === 'suggest-tags') {
      // Parse comma-separated tags
      const tags = generatedText
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
        .slice(0, 7); // Ensure max 7 tags

      return res.status(200).json({
        suggestedTags: tags
      });
    }

  } catch (error) {
    console.error('Error in ai-assist function:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

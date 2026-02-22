import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { parseUrlApi, videosApi, channelsApi } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import MobileAddModal from '../components/MobileAddModal';

// 공유된 텍스트에서 URL 추출
function extractUrl(params) {
  const url = params.get('url');
  const text = params.get('text') || '';

  // url 파라미터가 있으면 우선 사용
  if (url) return url;

  // text에서 URL 패턴 찾기 (유튜브/틱톡/인스타 등)
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  if (urlMatch) return urlMatch[0];

  // text 자체가 URL일 수 있음
  if (text.startsWith('http://') || text.startsWith('https://')) return text.trim();

  return null;
}

export default function ShareTarget() {
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [channels, setChannels] = useState([]);

  const sharedUrl = extractUrl(searchParams);

  useEffect(() => {
    if (!sharedUrl) {
      setError('공유된 URL을 찾을 수 없습니다.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [parseResult, channelsResult] = await Promise.all([
          parseUrlApi.parse(sharedUrl),
          channelsApi.getAll(),
        ]);

        if (cancelled) return;

        setPreview({
          ...parseResult.data,
          original_url: sharedUrl,
        });
        setChannels(channelsResult.data.channels || []);
      } catch (err) {
        if (!cancelled) {
          setError('URL 분석에 실패했습니다.');
          console.error('ShareTarget 로드 에러:', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [sharedUrl]);

  const handleSave = async (data) => {
    try {
      if (data.isChannel) {
        await channelsApi.create(data);
        addToast('채널이 저장되었습니다!', 'success');
      } else {
        await videosApi.create(data);
        addToast('영상이 저장되었습니다!', 'success');
      }
      window.location.replace('/');
    } catch (err) {
      if (err.response?.status === 409) {
        addToast(err.response.data.error, 'error');
      } else {
        addToast('저장에 실패했습니다.', 'error');
        console.error('ShareTarget 저장 에러:', err);
      }
    }
  };

  const handleClose = () => {
    window.location.replace('/');
  };

  // 로딩 중
  if (loading) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 text-sm">공유된 URL 분석 중...</p>
      </div>
    );
  }

  // 에러
  if (error) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <p className="text-gray-700 text-center">{error}</p>
        <button
          onClick={handleClose}
          className="px-6 py-2.5 text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 rounded-lg transition-colors"
        >
          홈으로 이동
        </button>
      </div>
    );
  }

  // MobileAddModal 렌더링
  if (preview) {
    return (
      <MobileAddModal
        preview={preview}
        channels={channels}
        currentChannelId={null}
        onSave={handleSave}
        onClose={handleClose}
      />
    );
  }

  return null;
}

const YOUTUBE_API_KEY = process.env.GOOGLE_API_KEY;

export default async function handler(req, res) {
  // CORS headers
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!YOUTUBE_API_KEY) {
    return res.status(500).json({ error: 'GOOGLE_API_KEY 환경변수가 설정되지 않았습니다.' });
  }

  try {
    const { videoId } = req.body;

    // Validate videoId
    if (!videoId || typeof videoId !== 'string') {
      return res.status(400).json({ error: 'Invalid or missing videoId' });
    }

    // YouTube Data API v3 commentThreads endpoint
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${encodeURIComponent(videoId)}&order=relevance&maxResults=10&key=${YOUTUBE_API_KEY}`;

    const response = await fetch(url);

    // Handle comments disabled (403 error)
    if (response.status === 403) {
      const errorData = await response.json();

      // Check if error is due to comments being disabled
      if (errorData.error?.errors?.some(err =>
        err.reason === 'commentsDisabled' ||
        err.message?.includes('disabled')
      )) {
        return res.status(200).json({
          comments: [],
          disabled: true,
          message: 'Comments are disabled for this video'
        });
      }

      return res.status(403).json({
        error: 'Access forbidden',
        details: errorData.error?.message || 'Unable to access comments'
      });
    }

    // Handle invalid video ID (404)
    if (response.status === 404) {
      return res.status(404).json({
        error: 'Video not found',
        message: 'Invalid video ID or video does not exist'
      });
    }

    // Handle other errors
    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({
        error: 'YouTube API error',
        details: errorData.error?.message || 'Failed to fetch comments'
      });
    }

    const data = await response.json();

    // Extract comment data
    const comments = (data.items || []).map(item => {
      const snippet = item.snippet.topLevelComment.snippet;
      return {
        author: snippet.authorDisplayName,
        text: snippet.textDisplay,
        likeCount: snippet.likeCount,
        publishedAt: snippet.publishedAt
      };
    });

    return res.status(200).json({
      comments,
      totalComments: data.pageInfo?.totalResults || 0
    });

  } catch (error) {
    console.error('Error fetching YouTube comments:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

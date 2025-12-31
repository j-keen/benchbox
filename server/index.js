import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import videosRouter from './routes/videos.js';
import channelsRouter from './routes/channels.js';
import tagsRouter from './routes/tags.js';
import foldersRouter from './routes/folders.js';
import parseUrlRouter from './routes/parseUrl.js';

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어
app.use(cors());
app.use(express.json());

// 라우트
app.use('/api/videos', videosRouter);
app.use('/api/channels', channelsRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/folders', foldersRouter);
app.use('/api/parse-url', parseUrlRouter);

// 헬스 체크
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'BenchBox API is running' });
});

// 에러 핸들러
app.use((err, req, res, next) => {
    console.error('서버 오류:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`🚀 BenchBox 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});

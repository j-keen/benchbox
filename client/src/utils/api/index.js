// Barrel re-export - maintains backward compatibility
// All consumers import from '../utils/api' which resolves to this index.js

export { storageApi } from './storageApi';
export { videosApi } from './videosApi';
export { channelsApi } from './channelsApi';
export { foldersApi } from './foldersApi';
export { tagCategoriesApi } from './tagCategoriesApi';
export { tagsApi } from './tagsApi';
export { parseUrlApi } from './parseUrlApi';
export { aiAssistApi } from './aiAssistApi';
export { youtubeCommentsApi } from './youtubeCommentsApi';

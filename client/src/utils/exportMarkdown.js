import { CATEGORIES } from './categories';

export function exportCheckedVideosAsMarkdown(videos) {
  const categoryMap = Object.fromEntries(CATEGORIES.map(c => [c.id, `${c.emoji} ${c.label}`]));

  const header = `| # | 제목 | 플랫폼 | 카테고리 | 별점 | URL |
|---|------|--------|----------|------|-----|`;

  const rows = videos.map((video, idx) => {
    const cats = (video.categories || []).map(id => categoryMap[id] || id).join(', ');
    const stars = '⭐'.repeat(video.rating || 3);
    const title = (video.title || 'Untitled').replace(/\|/g, '\\|');
    const platform = video.platform || '';
    const url = video.url || '';
    return `| ${idx + 1} | ${title} | ${platform} | ${cats} | ${stars} | ${url} |`;
  });

  return `# 다운로드 목록\n\n${header}\n${rows.join('\n')}\n`;
}

export function downloadMarkdownFile(content, filename = 'download-list.md') {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

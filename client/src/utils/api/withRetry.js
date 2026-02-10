// Supabase 쿼리 재시도 래퍼 (503 Service Unavailable 대응)
export async function withRetry(fn, maxRetries = 3) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const result = await fn();
            // Supabase returns { data, error } - check for retryable errors
            if (result?.error) {
                const err = result.error;
                const isRetryable = err.code === '503' ||
                    err.message?.includes('Service Unavailable') ||
                    err.message?.includes('fetch failed') ||
                    err.message?.includes('Failed to fetch') ||
                    err.code === 'PGRST503';

                if (isRetryable && attempt < maxRetries) {
                    const delay = Math.min(500 * Math.pow(2, attempt), 4000);
                    console.warn(`Supabase 503 오류, ${delay}ms 후 재시도 (${attempt + 1}/${maxRetries})...`);
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
            }
            return result;
        } catch (err) {
            // Network errors (fetch failed, etc.)
            const isNetworkError = err.message?.includes('fetch') ||
                err.message?.includes('network') ||
                err.message?.includes('Failed to fetch') ||
                err.name === 'TypeError';

            if (isNetworkError && attempt < maxRetries) {
                const delay = Math.min(500 * Math.pow(2, attempt), 4000);
                console.warn(`네트워크 오류, ${delay}ms 후 재시도 (${attempt + 1}/${maxRetries})...`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            throw err;
        }
    }
}

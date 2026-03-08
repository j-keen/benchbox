import React from 'react';

const StarRating = ({ rating = 3, onChange, size = 'md', readonly = false }) => {
  const starSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-6 h-6';
  const gap = size === 'sm' ? 'gap-0.5' : 'gap-1';
  const touchTarget = size === 'sm' ? '' : 'min-w-[44px] min-h-[44px]';

  return (
    <div className={`inline-flex items-center ${gap}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange?.(star)}
          className={`${touchTarget} flex items-center justify-center ${
            readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
          } transition-transform`}
        >
          <svg
            className={`${starSize} ${star <= rating ? 'text-amber-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
};

export default StarRating;

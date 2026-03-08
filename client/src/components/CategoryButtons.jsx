import React from 'react';
import { CATEGORIES } from '../utils/categories';

const CategoryButtons = ({ selected = [], onChange, required = false }) => {
  const handleToggle = (categoryId) => {
    if (selected.includes(categoryId)) {
      // 필수이고 마지막 하나면 해제 방지
      if (required && selected.length === 1) return;
      onChange(selected.filter(id => id !== categoryId));
    } else {
      onChange([...selected, categoryId]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {CATEGORIES.map((cat) => {
        const isSelected = selected.includes(cat.id);
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => handleToggle(cat.id)}
            className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors min-h-[36px] flex items-center gap-1 ${
              isSelected
                ? 'bg-primary-100 text-primary-700 border border-primary-300'
                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default CategoryButtons;

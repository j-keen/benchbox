import React, { useState } from 'react';
import useModalHistory from '../hooks/useModalHistory';

const FOLDER_COLORS = [
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#3b82f6', // blue
];

const FolderModal = ({ folder, onSave, onClose }) => {
    useModalHistory(true, onClose);
    const [name, setName] = useState(folder?.name || '');
    const [color, setColor] = useState(folder?.color || FOLDER_COLORS[0]);
    const [description, setDescription] = useState(folder?.description || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave({
            name: name.trim(),
            color,
            description: description.trim() || null
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        {folder ? '폴더 수정' : '새 폴더 만들기'}
                    </h2>

                    <form onSubmit={handleSubmit}>
                        {/* 폴더 이름 */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                폴더 이름
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                placeholder="폴더 이름을 입력하세요"
                                autoFocus
                            />
                        </div>

                        {/* 소개문구 */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                소개문구 <span className="text-gray-400 font-normal">(선택)</span>
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                                placeholder="폴더에 대한 간단한 설명을 입력하세요"
                                rows={2}
                            />
                        </div>

                        {/* 폴더 색상 */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                폴더 색상
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {FOLDER_COLORS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        className={`w-8 h-8 rounded-full transition-transform ${
                                            color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110'
                                        }`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* 미리보기 */}
                        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-500 block mb-2">미리보기</span>
                            <div className="flex items-center gap-2.5">
                                <span
                                    className="w-4 h-4 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: color }}
                                />
                                <span className="font-medium text-gray-900 truncate">
                                    {name || '폴더 이름'}
                                </span>
                                {description && (
                                    <span className="text-xs text-gray-400 truncate">— {description}</span>
                                )}
                            </div>
                        </div>

                        {/* 버튼 */}
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                취소
                            </button>
                            <button
                                type="submit"
                                disabled={!name.trim()}
                                className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {folder ? '수정' : '만들기'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default FolderModal;

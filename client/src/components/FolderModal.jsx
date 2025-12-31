import React, { useState, useRef } from 'react';

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
    const [name, setName] = useState(folder?.name || '');
    const [color, setColor] = useState(folder?.color || FOLDER_COLORS[0]);
    const [description, setDescription] = useState(folder?.description || '');
    const [coverImage, setCoverImage] = useState(folder?.cover_image || '');
    const [coverPreview, setCoverPreview] = useState(folder?.cover_image || '');
    const fileInputRef = useRef(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // 파일을 Base64로 변환
            const reader = new FileReader();
            reader.onloadend = () => {
                setCoverImage(reader.result);
                setCoverPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setCoverImage('');
        setCoverPreview('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave({
            name: name.trim(),
            color,
            description: description.trim() || null,
            cover_image: coverImage || null
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
                        {/* 커버 이미지 */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                커버 이미지
                            </label>
                            <div
                                className="relative aspect-video rounded-lg overflow-hidden border-2 border-dashed border-gray-200 cursor-pointer hover:border-primary-400 transition-colors"
                                style={{ backgroundColor: coverPreview ? 'transparent' : color }}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {coverPreview ? (
                                    <>
                                        <img
                                            src={coverPreview}
                                            alt="커버 미리보기"
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveImage();
                                            }}
                                            className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-white/70">
                                        <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-sm">클릭하여 이미지 업로드</span>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                            />
                        </div>

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
                            <div className="flex items-start gap-3">
                                <div
                                    className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden"
                                    style={{ backgroundColor: coverPreview ? 'transparent' : color }}
                                >
                                    {coverPreview ? (
                                        <img src={coverPreview} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <svg className="w-6 h-6 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span
                                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: color }}
                                        />
                                        <span className="font-medium text-gray-900 truncate">
                                            {name || '폴더 이름'}
                                        </span>
                                    </div>
                                    {description && (
                                        <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                                            {description}
                                        </p>
                                    )}
                                </div>
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

import React, { useState, useEffect } from 'react';
import { tagsApi, tagCategoriesApi } from '../utils/api';
import { useToast } from '../contexts/ToastContext';

const TagManagerModal = ({ isOpen, onClose }) => {
    const { showToast } = useToast();
    const [categories, setCategories] = useState([]);
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingCategory, setEditingCategory] = useState(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState('#6366f1');
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [selectedCategoryForNewTag, setSelectedCategoryForNewTag] = useState(null);
    const [draggedTag, setDraggedTag] = useState(null);
    const [selectedTagForMove, setSelectedTagForMove] = useState(null); // 모바일용: 이동할 태그 선택

    const colorOptions = [
        '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
        '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#6b7280'
    ];

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [catRes, tagRes] = await Promise.all([
                tagCategoriesApi.getAll(),
                tagsApi.getAll()
            ]);
            setCategories(catRes.data.categories || []);
            setTags(tagRes.data.tags || []);
        } catch (error) {
            showToast('데이터를 불러오는데 실패했습니다.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;

        try {
            await tagCategoriesApi.create({
                name: newCategoryName.trim(),
                color: newCategoryColor
            });
            showToast('카테고리가 추가되었습니다.', 'success');
            setNewCategoryName('');
            setNewCategoryColor('#6366f1');
            setShowAddCategory(false);
            loadData();
        } catch (error) {
            showToast('카테고리 추가에 실패했습니다.', 'error');
        }
    };

    const handleUpdateCategory = async (id, updates) => {
        try {
            await tagCategoriesApi.update(id, updates);
            showToast('카테고리가 수정되었습니다.', 'success');
            setEditingCategory(null);
            loadData();
        } catch (error) {
            showToast('카테고리 수정에 실패했습니다.', 'error');
        }
    };

    const handleDeleteCategory = async (id) => {
        if (!confirm('이 카테고리를 삭제하시겠습니까? 태그는 미분류로 이동됩니다.')) return;

        try {
            await tagCategoriesApi.delete(id);
            showToast('카테고리가 삭제되었습니다.', 'success');
            loadData();
        } catch (error) {
            showToast('카테고리 삭제에 실패했습니다.', 'error');
        }
    };

    const handleMoveTag = async (tagId, categoryId) => {
        try {
            await tagsApi.updateCategory(tagId, categoryId);
            showToast('태그가 이동되었습니다.', 'success');
            setSelectedTagForMove(null);
            loadData();
        } catch (error) {
            showToast('태그 이동에 실패했습니다.', 'error');
        }
    };

    // 모바일용: 태그 탭하여 이동 모드 토글
    const handleTagTap = (tag) => {
        if (selectedTagForMove?.id === tag.id) {
            setSelectedTagForMove(null);
        } else {
            setSelectedTagForMove(tag);
        }
    };

    const handleAddNewTag = async () => {
        if (!newTagName.trim()) return;

        try {
            // 태그 생성 (이미 존재하면 해당 태그 반환)
            const { data: allTags } = await tagsApi.getAll();
            let tag = allTags.tags.find(t => t.name.toLowerCase() === newTagName.trim().toLowerCase());

            if (!tag) {
                // 새 태그는 일단 미분류로 생성됨 (video_tags나 channel_tags에 연결 안됨)
                // Supabase에 직접 삽입
                const { supabase } = await import('../lib/supabase');
                const { data: newTag, error } = await supabase
                    .from('tags')
                    .insert({ name: newTagName.trim(), category_id: selectedCategoryForNewTag })
                    .select()
                    .single();

                if (error) throw error;
                tag = newTag;
            } else if (selectedCategoryForNewTag !== tag.category_id) {
                // 기존 태그면 카테고리만 변경
                await tagsApi.updateCategory(tag.id, selectedCategoryForNewTag);
            }

            showToast('태그가 추가되었습니다.', 'success');
            setNewTagName('');
            setSelectedCategoryForNewTag(null);
            loadData();
        } catch (error) {
            showToast('태그 추가에 실패했습니다.', 'error');
        }
    };

    const handleDragStart = (e, tag) => {
        setDraggedTag(tag);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, categoryId) => {
        e.preventDefault();
        if (draggedTag && draggedTag.category_id !== categoryId) {
            handleMoveTag(draggedTag.id, categoryId);
        }
        setDraggedTag(null);
    };

    const getCategoryTags = (categoryId) => {
        return tags.filter(t => t.category_id === categoryId);
    };

    const getUncategorizedTags = () => {
        return tags.filter(t => !t.category_id);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
            <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-hidden flex flex-col">
                {/* 헤더 */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">태그 관리</h2>
                    <button
                        onClick={onClose}
                        className="p-2.5 sm:p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                    >
                        <svg className="w-6 h-6 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* 태그 이동 UI (모바일) */}
                {selectedTagForMove && (
                    <div className="p-3 bg-primary-50 border-b border-primary-100">
                        <div className="text-sm text-primary-700 mb-2">
                            <strong>#{selectedTagForMove.name}</strong> 태그를 이동할 카테고리를 선택하세요
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => handleMoveTag(selectedTagForMove.id, null)}
                                className={`px-3 py-2 text-sm rounded-lg transition-colors min-h-[44px] ${
                                    !selectedTagForMove.category_id
                                        ? 'bg-gray-300 text-gray-700'
                                        : 'bg-white text-gray-600 border border-gray-300'
                                }`}
                            >
                                미분류
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => handleMoveTag(selectedTagForMove.id, cat.id)}
                                    className="px-3 py-2 text-sm rounded-lg transition-colors min-h-[44px] flex items-center gap-2"
                                    style={{
                                        backgroundColor: selectedTagForMove.category_id === cat.id ? cat.color : `${cat.color}20`,
                                        color: selectedTagForMove.category_id === cat.id ? 'white' : cat.color,
                                        border: `1px solid ${cat.color}40`
                                    }}
                                >
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedTagForMove.category_id === cat.id ? 'white' : cat.color }} />
                                    {cat.name}
                                </button>
                            ))}
                            <button
                                onClick={() => setSelectedTagForMove(null)}
                                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 min-h-[44px]"
                            >
                                취소
                            </button>
                        </div>
                    </div>
                )}

                {/* 컨텐츠 */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* 새 태그 추가 - 모바일 최적화 */}
                            <div className="bg-gray-50 rounded-lg p-4 sm:p-3">
                                <div className="text-sm font-medium text-gray-700 mb-3 sm:mb-2">새 태그 추가</div>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                        type="text"
                                        value={newTagName}
                                        onChange={(e) => setNewTagName(e.target.value)}
                                        placeholder="태그 이름..."
                                        className="flex-1 px-3 py-3 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddNewTag()}
                                    />
                                    <div className="flex gap-2">
                                        <select
                                            value={selectedCategoryForNewTag || ''}
                                            onChange={(e) => setSelectedCategoryForNewTag(e.target.value || null)}
                                            className="flex-1 sm:flex-none px-3 py-3 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[48px] sm:min-h-0"
                                        >
                                            <option value="">미분류</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={handleAddNewTag}
                                            disabled={!newTagName.trim()}
                                            className="px-5 py-3 sm:py-2 bg-primary-500 text-white text-base sm:text-sm rounded-lg hover:bg-primary-600 disabled:opacity-50 min-h-[48px] sm:min-h-0 font-medium"
                                        >
                                            추가
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 카테고리 목록 - 모바일 최적화 */}
                            {categories.map((category) => (
                                <div
                                    key={category.id}
                                    className="border border-gray-200 rounded-lg overflow-hidden"
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, category.id)}
                                >
                                    {/* 카테고리 헤더 */}
                                    {editingCategory === category.id ? (
                                        <div className="p-4 sm:p-3 bg-gray-50 border-b border-gray-200">
                                            <div className="flex items-center gap-2 mb-3 sm:mb-2">
                                                <input
                                                    type="text"
                                                    defaultValue={category.name}
                                                    className="flex-1 px-3 py-2.5 sm:py-1.5 text-base sm:text-sm border border-gray-300 rounded-lg"
                                                    id={`edit-name-${category.id}`}
                                                />
                                            </div>
                                            <div className="flex items-center gap-1 sm:gap-2 mb-3 sm:mb-2 flex-wrap">
                                                <span className="text-sm sm:text-xs text-gray-500 mr-1">색상:</span>
                                                {colorOptions.map(color => (
                                                    <button
                                                        key={color}
                                                        onClick={() => {
                                                            const input = document.getElementById(`edit-name-${category.id}`);
                                                            handleUpdateCategory(category.id, {
                                                                name: input.value,
                                                                color
                                                            });
                                                        }}
                                                        className={`w-8 h-8 sm:w-6 sm:h-6 rounded-full border-2 ${category.color === color ? 'border-gray-800 ring-2 ring-offset-1 ring-gray-400' : 'border-transparent'}`}
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        const input = document.getElementById(`edit-name-${category.id}`);
                                                        handleUpdateCategory(category.id, { name: input.value });
                                                    }}
                                                    className="px-4 py-2.5 sm:py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 min-h-[44px] sm:min-h-0"
                                                >
                                                    저장
                                                </button>
                                                <button
                                                    onClick={() => setEditingCategory(null)}
                                                    className="px-4 py-2.5 sm:py-1.5 text-sm bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 min-h-[44px] sm:min-h-0"
                                                >
                                                    취소
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between p-4 sm:p-3 bg-gray-50 border-b border-gray-200">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="w-5 h-5 sm:w-4 sm:h-4 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: category.color }}
                                                />
                                                <span className="font-medium text-gray-800 text-base sm:text-sm">{category.name}</span>
                                                <span className="text-sm sm:text-xs text-gray-400">
                                                    ({getCategoryTags(category.id).length})
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => setEditingCategory(category.id)}
                                                    className="p-2.5 sm:p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                                                >
                                                    <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCategory(category.id)}
                                                    className="p-2.5 sm:p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-200 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                                                >
                                                    <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* 태그 목록 - 탭하여 이동 가능 */}
                                    <div className="p-4 sm:p-3 flex flex-wrap gap-2 sm:gap-1.5 min-h-[48px] sm:min-h-[40px]">
                                        {getCategoryTags(category.id).length > 0 ? (
                                            getCategoryTags(category.id).map(tag => (
                                                <button
                                                    key={tag.id}
                                                    type="button"
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, tag)}
                                                    onClick={() => handleTagTap(tag)}
                                                    className={`px-3 py-2 sm:px-2 sm:py-1 text-sm sm:text-xs rounded-lg sm:rounded transition-all min-h-[40px] sm:min-h-0 ${
                                                        selectedTagForMove?.id === tag.id ? 'ring-2 ring-primary-500 ring-offset-1' : ''
                                                    }`}
                                                    style={{
                                                        backgroundColor: `${category.color}20`,
                                                        color: category.color,
                                                        border: `1px solid ${category.color}40`
                                                    }}
                                                >
                                                    #{tag.name}
                                                    {tag.count > 0 && <span className="ml-1 opacity-60">({tag.count})</span>}
                                                </button>
                                            ))
                                        ) : (
                                            <span className="text-sm sm:text-xs text-gray-400">
                                                태그를 탭하여 이동하세요
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* 미분류 태그 - 모바일 최적화 */}
                            {getUncategorizedTags().length > 0 && (
                                <div
                                    className="border border-gray-200 rounded-lg overflow-hidden"
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, null)}
                                >
                                    <div className="flex items-center gap-2 p-4 sm:p-3 bg-gray-100 border-b border-gray-200">
                                        <span className="w-5 h-5 sm:w-4 sm:h-4 rounded-full bg-gray-400 flex-shrink-0" />
                                        <span className="font-medium text-gray-600 text-base sm:text-sm">미분류</span>
                                        <span className="text-sm sm:text-xs text-gray-400">
                                            ({getUncategorizedTags().length})
                                        </span>
                                    </div>
                                    <div className="p-4 sm:p-3 flex flex-wrap gap-2 sm:gap-1.5">
                                        {getUncategorizedTags().map(tag => (
                                            <button
                                                key={tag.id}
                                                type="button"
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, tag)}
                                                onClick={() => handleTagTap(tag)}
                                                className={`px-3 py-2 sm:px-2 sm:py-1 text-sm sm:text-xs bg-gray-100 text-gray-600 border border-gray-300 rounded-lg sm:rounded transition-all min-h-[40px] sm:min-h-0 ${
                                                    selectedTagForMove?.id === tag.id ? 'ring-2 ring-primary-500 ring-offset-1' : ''
                                                }`}
                                            >
                                                #{tag.name}
                                                {tag.count > 0 && <span className="ml-1 opacity-60">({tag.count})</span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 새 카테고리 추가 - 모바일 최적화 */}
                            {showAddCategory ? (
                                <div className="border border-dashed border-gray-300 rounded-lg p-4 sm:p-3">
                                    <div className="flex items-center gap-2 mb-3 sm:mb-2">
                                        <input
                                            type="text"
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            placeholder="카테고리 이름..."
                                            className="flex-1 px-3 py-3 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex items-center gap-1 sm:gap-2 mb-4 sm:mb-3 flex-wrap">
                                        <span className="text-sm sm:text-xs text-gray-500 mr-1">색상:</span>
                                        {colorOptions.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setNewCategoryColor(color)}
                                                className={`w-9 h-9 sm:w-6 sm:h-6 rounded-full border-2 ${newCategoryColor === color ? 'border-gray-800 ring-2 ring-offset-1 ring-gray-400' : 'border-transparent'}`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleAddCategory}
                                            disabled={!newCategoryName.trim()}
                                            className="px-5 py-3 sm:py-2 text-base sm:text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 min-h-[48px] sm:min-h-0 font-medium"
                                        >
                                            추가
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowAddCategory(false);
                                                setNewCategoryName('');
                                            }}
                                            className="px-5 py-3 sm:py-2 text-base sm:text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 min-h-[48px] sm:min-h-0"
                                        >
                                            취소
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowAddCategory(true)}
                                    className="w-full border border-dashed border-gray-300 rounded-lg p-4 sm:p-3 text-base sm:text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2 min-h-[56px] sm:min-h-0"
                                >
                                    <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    새 카테고리 추가
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* 푸터 - 모바일 힌트 추가 */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="text-sm sm:text-xs text-gray-500 text-center">
                        <span className="sm:hidden">태그를 탭하여 다른 카테고리로 이동할 수 있습니다</span>
                        <span className="hidden sm:inline">태그를 드래그하거나 탭하여 다른 카테고리로 이동할 수 있습니다</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TagManagerModal;

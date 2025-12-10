import React, { useState, useCallback } from 'react';
import { Icon } from '@iconify/react';
import PreviewImage from './PreviewImage';
import type { TranslationBatch, BatchImage } from '@/types';

interface BatchManagerProps {
  batches: TranslationBatch[];
  onBatchesChange: (batches: TranslationBatch[]) => void;
  isProcessing: boolean;
  onStartTranslation: () => void;
  batchProgress?: string;
}

export const BatchManager: React.FC<BatchManagerProps> = ({
  batches,
  onBatchesChange,
  isProcessing,
  onStartTranslation,
  batchProgress,
}) => {
  const [draggedImage, setDraggedImage] = useState<{ batchId: string; imageId: string } | null>(null);
  const [dragOverBatchId, setDragOverBatchId] = useState<string | null>(null);

  // 添加新批次
  const addBatch = () => {
    const newBatchNumber = batches.length + 1;
    const newBatch: TranslationBatch = {
      id: `batch-${Date.now()}`,
      name: `批次${newBatchNumber}`,
      images: [],
    };
    onBatchesChange([...batches, newBatch]);
  };

  // 删除批次
  const removeBatch = (batchId: string) => {
    onBatchesChange(batches.filter(b => b.id !== batchId));
  };

  // 重命名批次
  const renameBatch = (batchId: string, newName: string) => {
    onBatchesChange(
      batches.map(b => (b.id === batchId ? { ...b, name: newName } : b))
    );
  };

  // 添加图片到批次
  const addImagesToBatch = (batchId: string, files: File[]) => {
    onBatchesChange(
      batches.map(b => {
        if (b.id !== batchId) return b;
        const startOrder = b.images.length;
        const newImages: BatchImage[] = files.map((file, idx) => ({
          id: `img-${Date.now()}-${idx}`,
          file,
          order: startOrder + idx,
        }));
        return { ...b, images: [...b.images, ...newImages] };
      })
    );
  };

  // 从批次移除图片
  const removeImageFromBatch = (batchId: string, imageId: string) => {
    onBatchesChange(
      batches.map(b => {
        if (b.id !== batchId) return b;
        const filtered = b.images.filter(img => img.id !== imageId);
        // 重新排序
        return {
          ...b,
          images: filtered.map((img, idx) => ({ ...img, order: idx })),
        };
      })
    );
  };

  // 拖拽开始
  const handleDragStart = (batchId: string, imageId: string) => {
    setDraggedImage({ batchId, imageId });
  };

  // 拖拽结束
  const handleDragEnd = () => {
    setDraggedImage(null);
    setDragOverBatchId(null);
  };

  // 拖拽到批次上
  const handleDragOver = (e: React.DragEvent, batchId: string) => {
    e.preventDefault();
    setDragOverBatchId(batchId);
  };

  // 放置到批次
  const handleDrop = (e: React.DragEvent, targetBatchId: string) => {
    e.preventDefault();
    setDragOverBatchId(null);

    // 处理从其他批次拖拽的图片
    if (draggedImage && draggedImage.batchId !== targetBatchId) {
      const sourceBatch = batches.find(b => b.id === draggedImage.batchId);
      const image = sourceBatch?.images.find(img => img.id === draggedImage.imageId);
      
      if (image) {
        onBatchesChange(
          batches.map(b => {
            if (b.id === draggedImage.batchId) {
              // 从源批次移除
              const filtered = b.images.filter(img => img.id !== draggedImage.imageId);
              return { ...b, images: filtered.map((img, idx) => ({ ...img, order: idx })) };
            }
            if (b.id === targetBatchId) {
              // 添加到目标批次
              return {
                ...b,
                images: [...b.images, { ...image, order: b.images.length }],
              };
            }
            return b;
          })
        );
      }
    }

    // 处理从文件系统拖拽的文件
    const files = Array.from(e.dataTransfer.files).filter(f =>
      ['image/png', 'image/jpeg', 'image/bmp', 'image/webp'].includes(f.type)
    );
    if (files.length > 0) {
      addImagesToBatch(targetBatchId, files);
    }

    setDraggedImage(null);
  };

  // 批次内图片排序
  const moveImageInBatch = (batchId: string, imageId: string, direction: 'up' | 'down') => {
    onBatchesChange(
      batches.map(b => {
        if (b.id !== batchId) return b;
        const idx = b.images.findIndex(img => img.id === imageId);
        if (idx === -1) return b;
        
        const newIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= b.images.length) return b;

        const newImages = [...b.images];
        [newImages[idx], newImages[newIdx]] = [newImages[newIdx], newImages[idx]];
        return { ...b, images: newImages.map((img, i) => ({ ...img, order: i })) };
      })
    );
  };

  // 文件选择处理
  const handleFileSelect = (batchId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      addImagesToBatch(batchId, files);
    }
    e.target.value = '';
  };

  const totalImages = batches.reduce((sum, b) => sum + b.images.length, 0);

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">
          批次翻译模式
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({batches.length} 个批次, {totalImages} 张图片)
          </span>
        </h3>
        <div className="flex gap-2">
          <button
            onClick={addBatch}
            disabled={isProcessing}
            className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-1"
          >
            <Icon icon="carbon:add" className="w-4 h-4" />
            添加批次
          </button>
          {totalImages > 0 && (
            <button
              onClick={onStartTranslation}
              disabled={isProcessing || totalImages === 0}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
            >
              <Icon icon="carbon:play" className="w-4 h-4" />
              开始翻译
            </button>
          )}
        </div>
      </div>

      {/* 进度显示 */}
      {isProcessing && batchProgress && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span className="text-blue-700">{batchProgress}</span>
          </div>
        </div>
      )}

      {/* 批次列表 */}
      {batches.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
          <Icon icon="carbon:folder-add" className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>点击"添加批次"创建第一个批次</p>
          <p className="text-sm mt-1">同一批次的图片会一起翻译，保持上下文关联</p>
        </div>
      ) : (
        <div className="space-y-4">
          {batches.map((batch, batchIndex) => (
            <div
              key={batch.id}
              className={`border rounded-lg p-4 transition-colors ${
                dragOverBatchId === batch.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
              onDragOver={(e) => handleDragOver(e, batch.id)}
              onDragLeave={() => setDragOverBatchId(null)}
              onDrop={(e) => handleDrop(e, batch.id)}
            >
              {/* 批次头部 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon 
                    icon={
                      batch.status === 'finished' ? 'carbon:checkmark-filled' :
                      batch.status === 'processing' ? 'carbon:in-progress' :
                      batch.status === 'error' ? 'carbon:warning-filled' :
                      'carbon:folder'
                    } 
                    className={`w-5 h-5 ${
                      batch.status === 'finished' ? 'text-green-500' :
                      batch.status === 'processing' ? 'text-blue-500 animate-spin' :
                      batch.status === 'error' ? 'text-red-500' :
                      'text-blue-500'
                    }`} 
                  />
                  <input
                    type="text"
                    value={batch.name}
                    onChange={(e) => renameBatch(batch.id, e.target.value)}
                    className="font-medium text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1"
                    disabled={isProcessing}
                  />
                  <span className="text-sm text-gray-500">
                    ({batch.images.length} 张图片)
                  </span>
                  {batch.status && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      batch.status === 'finished' ? 'bg-green-100 text-green-700' :
                      batch.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                      batch.status === 'error' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {batch.status === 'finished' ? '已完成' :
                       batch.status === 'processing' ? '处理中' :
                       batch.status === 'error' ? '错误' : '等待中'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-1">
                    <Icon icon="carbon:add" className="w-4 h-4" />
                    添加图片
                    <input
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/bmp,image/webp"
                      className="hidden"
                      onChange={(e) => handleFileSelect(batch.id, e)}
                      disabled={isProcessing}
                    />
                  </label>
                  <button
                    onClick={() => removeBatch(batch.id)}
                    disabled={isProcessing}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                    title="删除批次"
                  >
                    <Icon icon="carbon:trash-can" className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 图片网格 */}
              {batch.images.length === 0 ? (
                <div className="text-center py-6 text-gray-400 border-2 border-dashed rounded-lg">
                  <Icon icon="carbon:image" className="w-8 h-8 mx-auto mb-1 opacity-50" />
                  <p className="text-sm">拖拽图片到此处或点击"添加图片"</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {batch.images
                    .sort((a, b) => a.order - b.order)
                    .map((image, imgIndex) => (
                      <div
                        key={image.id}
                        draggable={!isProcessing}
                        onDragStart={() => handleDragStart(batch.id, image.id)}
                        onDragEnd={handleDragEnd}
                        className="relative group cursor-move"
                      >
                        {/* 序号标签 */}
                        <div className="absolute top-1 left-1 z-10 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                          {imgIndex + 1}
                        </div>

                        {/* 图片预览 */}
                        <div className="aspect-[3/4] rounded-lg overflow-hidden border border-gray-200">
                          <PreviewImage file={image.file} result={null} />
                        </div>

                        {/* 操作按钮 */}
                        <div className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          {imgIndex > 0 && (
                            <button
                              onClick={() => moveImageInBatch(batch.id, image.id, 'up')}
                              className="p-1 bg-white/90 rounded shadow hover:bg-white"
                              title="上移"
                            >
                              <Icon icon="carbon:chevron-left" className="w-3 h-3" />
                            </button>
                          )}
                          {imgIndex < batch.images.length - 1 && (
                            <button
                              onClick={() => moveImageInBatch(batch.id, image.id, 'down')}
                              className="p-1 bg-white/90 rounded shadow hover:bg-white"
                              title="下移"
                            >
                              <Icon icon="carbon:chevron-right" className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => removeImageFromBatch(batch.id, image.id)}
                            className="p-1 bg-red-500/90 text-white rounded shadow hover:bg-red-600"
                            title="移除"
                          >
                            <Icon icon="carbon:close" className="w-3 h-3" />
                          </button>
                        </div>

                        {/* 文件名 */}
                        <div className="mt-1 text-xs text-gray-500 truncate" title={image.file.name}>
                          {image.file.name}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BatchManager;

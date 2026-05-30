import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import type { TranslationBatch } from '@/types';

interface BatchResultGalleryProps {
  batches: TranslationBatch[];
  sessionFolder?: string;
}

interface BatchResult {
  batchName: string;
  images: string[];
}

export const BatchResultGallery: React.FC<BatchResultGalleryProps> = ({
  batches,
  sessionFolder,
}) => {
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // 获取已完成批次的结果
  useEffect(() => {
    const completedBatches = batches.filter(b => b.status === 'finished');
    if (completedBatches.length > 0) {
      // 这里可以从服务器获取实际的结果图片列表
      // 目前使用模拟数据
      const results: BatchResult[] = completedBatches.map(batch => ({
        batchName: batch.name,
        images: batch.images.map((_, idx) => 
          `/api/result/${sessionFolder}/${batch.name}/${String(idx + 1).padStart(3, '0')}_final.png`
        ),
      }));
      setBatchResults(results);
    }
  }, [batches, sessionFolder]);

  const finishedBatches = batches.filter(b => b.status === 'finished');

  if (finishedBatches.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">
          翻译结果
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({finishedBatches.length} 个批次已完成)
          </span>
        </h3>
        <button
          onClick={async () => {
            try {
              const response = await fetch(`/api/results/download?session=${sessionFolder}`);
              if (!response.ok) throw new Error('Download failed');
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `translation-results-${sessionFolder}.zip`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            } catch (e) {
              console.error('Download failed:', e);
            }
          }}
          className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-1"
        >
          <Icon icon="carbon:download" className="w-4 h-4" />
          下载全部
        </button>
      </div>

      {/* 批次选择标签 */}
      <div className="flex flex-wrap gap-2">
        {finishedBatches.map(batch => (
          <button
            key={batch.id}
            onClick={() => setSelectedBatch(selectedBatch === batch.id ? null : batch.id)}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
              selectedBatch === batch.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Icon icon="carbon:folder" className="w-4 h-4" />
            {batch.name}
            <span className="text-xs opacity-75">({batch.images.length})</span>
          </button>
        ))}
      </div>

      {/* 选中批次的图片网格 */}
      {selectedBatch && (
        <div className="border rounded-lg p-4">
          {(() => {
            const batch = finishedBatches.find(b => b.id === selectedBatch);
            if (!batch) return null;
            
            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {batch.images.map((image, idx) => (
                  <div
                    key={image.id}
                    className="relative cursor-pointer group"
                    onClick={() => setSelectedImage(
                      `/api/result/${sessionFolder}/${batch.name}/${String(idx + 1).padStart(3, '0')}_final.png`
                    )}
                  >
                    <div className="aspect-[3/4] rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                      <img
                        src={`/api/result/${sessionFolder}/${batch.name}/${String(idx + 1).padStart(3, '0')}_final.png`}
                        alt={`Result ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" x="50" text-anchor="middle" fill="gray">加载中</text></svg>';
                        }}
                      />
                    </div>
                    <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                      {idx + 1}
                    </div>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                      <Icon icon="carbon:zoom-in" className="w-8 h-8 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* 图片预览模态框 */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <Icon icon="carbon:close" className="w-8 h-8" />
            </button>
            <img
              src={selectedImage}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchResultGallery;

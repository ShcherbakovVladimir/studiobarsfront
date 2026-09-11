// /home/user/projects/studioxlam/src/components/finetune/DatasetDropzone.tsx
import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setDataset, setError } from '../../store/finetuneSlice';
import type { RootState } from '../../store/store';
import { validateFile, formatFileSize } from '../../utils/errorUtils';

interface DatasetDropzoneProps {
  isTraining: boolean;
  isStarting: boolean;
  isStopping: boolean;
  isMobile?: boolean;
}

const DatasetDropzone: React.FC<DatasetDropzoneProps> = ({ 
  isTraining, 
  isStarting, 
  isStopping,
  isMobile 
}) => {
  const dispatch = useDispatch();
  const dataset = useSelector((state: RootState) => state.finetune.dataset);
  const datasetStats = useSelector((state: RootState) => state.finetune.datasetStats);
  const isDisabled = isTraining || isStarting || isStopping;

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file) return;
      const validation = validateFile(file);
      
      if (validation.valid) {
        dispatch(setDataset(file));
      } else {
        dispatch(setError(validation.message || 'Ошибка валидации файла'));
      }
    }
  }, [dispatch]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (isDisabled) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const validation = validateFile(file);
      
      if (validation.valid) {
        dispatch(setDataset(file));
      } else {
        dispatch(setError(validation.message || 'Ошибка валидации файла'));
      }
    }
  }, [dispatch, isDisabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div className="glass-panel border border-border rounded-xl p-4 md:p-5 shadow-sm h-full flex flex-col">
      <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
        Датасет
      </h3>

      {dataset ? (
        <div className="flex-1 flex flex-col">
          <div className="bg-background/50 dark:bg-muted/50 rounded-lg p-3 border border-border mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm text-foreground truncate pr-2">
                {dataset.name}
              </span>
              <span className="text-xs text-muted-foreground surface-elevated px-2 py-0.5 rounded border border-border whitespace-nowrap">
                {formatFileSize(dataset.size)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">JSONL формат</span>
              {!isDisabled && (
                <button 
                  onClick={() => dispatch(setDataset(null))}
                  className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400"
                >
                  Удалить
                </button>
              )}
            </div>
          </div>

          {datasetStats && datasetStats.totalExamples > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-auto">
              <div className="bg-background/50 dark:bg-muted/30 p-2 rounded border border-border">
                <span className="block text-[10px] text-muted-foreground uppercase">Примеров</span>
                <span className="text-sm font-bold text-foreground">{datasetStats.totalExamples}</span>
              </div>
              <div className="bg-background/50 dark:bg-muted/30 p-2 rounded border border-border">
                <span className="block text-[10px] text-muted-foreground uppercase">Токенов</span>
                <span className="text-sm font-bold text-foreground">
                  {datasetStats.totalTokens > 1000 ? `${(datasetStats.totalTokens / 1000).toFixed(1)}k` : datasetStats.totalTokens}
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div 
          className={`
 flex-1 flex flex-col items-center justify-center
            border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer
            ${isDisabled 
              ? 'border-border bg-card/60 opacity-50 cursor-not-allowed' 
              : 'border-border hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
            }
`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => !isDisabled && document.getElementById('dataset-upload')?.click()}
        >
          <input
            type="file"
            id="dataset-upload"
            className="hidden"
            accept=".jsonl,.json,.txt"
            onChange={handleFileChange}
            disabled={isDisabled}
          />
          <svg className="w-8 h-8 text-muted-foreground mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span className="text-sm font-medium text-muted-foreground text-center">
            {isMobile ? 'Нажмите для выбора файла' : 'Перетащите файл или нажмите'}
          </span>
          <span className="text-xs text-muted-foreground mt-1">
            .jsonl, .json (max 500MB)
          </span>
        </div>
      )}
    </div>
  );
};

export default DatasetDropzone;
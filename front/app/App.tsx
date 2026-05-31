import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  type StatusKey,
  processingStatuses,
  type TranslatorKey,
  type FileStatus,
  type ChunkProcessingResult,
  type QueuedImage,
  type TranslationSettings,
  type FinishedImage,
} from "@/types";
import { imageMimeTypes } from "@/config";
import { OptionsPanel } from "@/components/OptionsPanel";
import { ImageHandlingArea } from "@/components/ImageHandlingArea";
import { ImageQueue } from "@/components/ImageQueue";
import { ResultGallery } from "@/components/ResultGallery";
import { Header } from "@/components/Header";
import { loadSettings, saveSettings, loadFinishedImages, addFinishedImage } from "@/utils/localStorage";

export const App: React.FC = () => {
  // State Hooks
  const [fileStatuses, setFileStatuses] = useState<Map<string, FileStatus>>(
    new Map()
  );
  const [shouldTranslate, setShouldTranslate] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const [finishedImages, setFinishedImages] = useState<FinishedImage[]>([]);

  // Translation Queue state
  const [queuedImages, setQueuedImages] = useState<QueuedImage[]>([]);
  const queueRef = useRef(queuedImages);
  queueRef.current = queuedImages;

  // Translation Options State Hooks
  const [detectionResolution, setDetectionResolution] = useState("1536");
  const [textDetector, setTextDetector] = useState("default");
  const [renderTextDirection, setRenderTextDirection] = useState("auto");
  const [translator, setTranslator] = useState<TranslatorKey>("youdao");
  const [targetLanguage, setTargetLanguage] = useState("CHS");

  const [inpaintingSize, setInpaintingSize] = useState("2048");
  const [customUnclipRatio, setCustomUnclipRatio] = useState<number>(2.3);
  const [customBoxThreshold, setCustomBoxThreshold] = useState<number>(0.7);
  const [maskDilationOffset, setMaskDilationOffset] = useState<number>(30);
  const [inpainter, setInpainter] = useState("default");

  // Render settings
  const [renderer, setRenderer] = useState("default");
  const [alignment, setAlignment] = useState("auto");
  const [fontSize, setFontSize] = useState<number>(-1);
  const [fontColor, setFontColor] = useState("");
  const [uppercase, setUppercase] = useState(false);
  const [lowercase, setLowercase] = useState(false);
  const [noHyphenation, setNoHyphenation] = useState(false);
  const [rtl, setRtl] = useState(true);
  const [lineSpacing, setLineSpacing] = useState<number>(0);
  const [fontSizeOffset, setFontSizeOffset] = useState<number>(0);
  const [fontSizeMaximum, setFontSizeMaximum] = useState<number>(-1);
  const [fontSizeCompression, setFontSizeCompression] = useState<number>(0.3);
  const [disableFontBorder, setDisableFontBorder] = useState(false);

  // Translator advanced
  const [noTextLangSkip, setNoTextLangSkip] = useState(false);
  const [filterText, setFilterText] = useState("");

  // Detector advanced
  const [textThreshold, setTextThreshold] = useState<number>(0.5);
  const [detRotate, setDetRotate] = useState(false);
  const [detAutoRotate, setDetAutoRotate] = useState(false);
  const [detInvert, setDetInvert] = useState(false);
  const [detGammaCorrect, setDetGammaCorrect] = useState(false);

  // OCR
  const [ocr, setOcr] = useState("48px");
  const [minTextLength, setMinTextLength] = useState<number>(0);
  const [ignoreBubble, setIgnoreBubble] = useState<number>(0);

  // Upscale
  const [upscaler, setUpscaler] = useState("esrgan");
  const [upscaleRatio, setUpscaleRatio] = useState<number>(0);
  const [revertUpscaling, setRevertUpscaling] = useState(false);

  // Colorizer
  const [colorizer, setColorizer] = useState("none");
  const [colorizationSize, setColorizationSize] = useState<number>(576);
  const [denoiseSigma, setDenoiseSigma] = useState<number>(30);

  // Inpainter advanced
  const [inpaintingPrecision, setInpaintingPrecision] = useState("bf16");

  // Global
  const [kernelSize, setKernelSize] = useState<number>(3);
  const [forceSimpleSort, setForceSimpleSort] = useState(false);

  // Computed State (useMemo)
  const isProcessing = useMemo(() => {
    // If there are no files or no statuses, we're not processing
    if (files.length === 0 || fileStatuses.size === 0) return false;

    // Check if any file has a processing status
    return Array.from(fileStatuses.values()).some((fileStatus) => {
      if (!fileStatus || fileStatus.status === null) return false;
      return processingStatuses.includes(fileStatus.status);
    });
  }, [files, fileStatuses]);

  const isProcessingAllFinished = useMemo(() => {
    // If there are no files or no statuses, we're not finished
    if (files.length === 0 || fileStatuses.size === 0) return false;

    // Check if all files are finished
    return Array.from(fileStatuses.values()).every((status) => {
      if (!status || status.status === null) return false;
      return status.status === "finished";
    });
  }, [files, fileStatuses]);

  // Effects
  /** Load saved settings and finished images from localStorage */
  useEffect(() => {
    const savedSettings = loadSettings();
    if (savedSettings.detectionResolution) setDetectionResolution(savedSettings.detectionResolution);
    if (savedSettings.textDetector) setTextDetector(savedSettings.textDetector);
    if (savedSettings.renderTextDirection) setRenderTextDirection(savedSettings.renderTextDirection);
    if (savedSettings.translator) setTranslator(savedSettings.translator);
    if (savedSettings.targetLanguage) setTargetLanguage(savedSettings.targetLanguage);
    if (savedSettings.inpaintingSize) setInpaintingSize(savedSettings.inpaintingSize);
    if (savedSettings.customUnclipRatio != null) setCustomUnclipRatio(savedSettings.customUnclipRatio);
    if (savedSettings.customBoxThreshold != null) setCustomBoxThreshold(savedSettings.customBoxThreshold);
    if (savedSettings.maskDilationOffset != null) setMaskDilationOffset(savedSettings.maskDilationOffset);
    if (savedSettings.inpainter) setInpainter(savedSettings.inpainter);
    if (savedSettings.renderer) setRenderer(savedSettings.renderer);
    if (savedSettings.alignment) setAlignment(savedSettings.alignment);
    if (savedSettings.fontSize != null) setFontSize(savedSettings.fontSize);
    if (savedSettings.fontColor != null) setFontColor(savedSettings.fontColor);
    if (savedSettings.uppercase != null) setUppercase(savedSettings.uppercase);
    if (savedSettings.lowercase != null) setLowercase(savedSettings.lowercase);
    if (savedSettings.noHyphenation != null) setNoHyphenation(savedSettings.noHyphenation);
    if (savedSettings.rtl != null) setRtl(savedSettings.rtl);
    if (savedSettings.lineSpacing != null) setLineSpacing(savedSettings.lineSpacing);
    if (savedSettings.fontSizeOffset != null) setFontSizeOffset(savedSettings.fontSizeOffset);
    if (savedSettings.fontSizeMaximum != null) setFontSizeMaximum(savedSettings.fontSizeMaximum);
    if (savedSettings.fontSizeCompression != null) setFontSizeCompression(savedSettings.fontSizeCompression);
    if (savedSettings.disableFontBorder != null) setDisableFontBorder(savedSettings.disableFontBorder);
    if (savedSettings.noTextLangSkip != null) setNoTextLangSkip(savedSettings.noTextLangSkip);
    if (savedSettings.filterText != null) setFilterText(savedSettings.filterText);
    if (savedSettings.textThreshold != null) setTextThreshold(savedSettings.textThreshold);
    if (savedSettings.detRotate != null) setDetRotate(savedSettings.detRotate);
    if (savedSettings.detAutoRotate != null) setDetAutoRotate(savedSettings.detAutoRotate);
    if (savedSettings.detInvert != null) setDetInvert(savedSettings.detInvert);
    if (savedSettings.detGammaCorrect != null) setDetGammaCorrect(savedSettings.detGammaCorrect);
    if (savedSettings.ocr) setOcr(savedSettings.ocr);
    if (savedSettings.minTextLength != null) setMinTextLength(savedSettings.minTextLength);
    if (savedSettings.ignoreBubble != null) setIgnoreBubble(savedSettings.ignoreBubble);
    if (savedSettings.upscaler) setUpscaler(savedSettings.upscaler);
    if (savedSettings.upscaleRatio != null) setUpscaleRatio(savedSettings.upscaleRatio);
    if (savedSettings.revertUpscaling != null) setRevertUpscaling(savedSettings.revertUpscaling);
    if (savedSettings.colorizer) setColorizer(savedSettings.colorizer);
    if (savedSettings.colorizationSize != null) setColorizationSize(savedSettings.colorizationSize);
    if (savedSettings.denoiseSigma != null) setDenoiseSigma(savedSettings.denoiseSigma);
    if (savedSettings.inpaintingPrecision) setInpaintingPrecision(savedSettings.inpaintingPrecision);
    if (savedSettings.kernelSize != null) setKernelSize(savedSettings.kernelSize);
    if (savedSettings.forceSimpleSort != null) setForceSimpleSort(savedSettings.forceSimpleSort);

    const savedFinishedImages = loadFinishedImages();
    setFinishedImages(savedFinishedImages);
  }, []);

  /** Save settings to localStorage whenever they change */
  useEffect(() => {
    const settings: TranslationSettings = {
      detectionResolution,
      textDetector,
      renderTextDirection,
      translator,
      targetLanguage,
      inpaintingSize,
      customUnclipRatio,
      customBoxThreshold,
      maskDilationOffset,
      inpainter,
      renderer,
      alignment,
      fontSize,
      fontColor,
      uppercase,
      lowercase,
      noHyphenation,
      rtl,
      lineSpacing,
      fontSizeOffset,
      fontSizeMaximum,
      fontSizeCompression,
      disableFontBorder,
      noTextLangSkip,
      filterText,
      textThreshold,
      detRotate,
      detAutoRotate,
      detInvert,
      detGammaCorrect,
      ocr,
      minTextLength,
      ignoreBubble,
      upscaler,
      upscaleRatio,
      revertUpscaling,
      colorizer,
      colorizationSize,
      denoiseSigma,
      inpaintingPrecision,
      kernelSize,
      forceSimpleSort,
    };
    saveSettings(settings);
  }, [
    detectionResolution,
    textDetector,
    renderTextDirection,
    translator,
    targetLanguage,
    inpaintingSize,
    customUnclipRatio,
    customBoxThreshold,
    maskDilationOffset,
    inpainter,
    renderer,
    alignment,
    fontSize,
    fontColor,
    uppercase,
    lowercase,
    noHyphenation,
    rtl,
    lineSpacing,
    fontSizeOffset,
    fontSizeMaximum,
    fontSizeCompression,
    disableFontBorder,
    noTextLangSkip,
    filterText,
    textThreshold,
    detRotate,
    detAutoRotate,
    detInvert,
    detGammaCorrect,
    ocr,
    minTextLength,
    ignoreBubble,
    upscaler,
    upscaleRatio,
    revertUpscaling,
    colorizer,
    colorizationSize,
    denoiseSigma,
    inpaintingPrecision,
    kernelSize,
    forceSimpleSort,
  ]);

  /** クリップボード ペースト対応 */
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items || [];
      for (const item of items) {
        if (item.kind === "file") {
          const pastedFile = item.getAsFile();
          if (pastedFile && imageMimeTypes.includes(pastedFile.type)) {
            setFiles((prev) => [...prev, pastedFile]);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste as EventListener);
    return () =>
      window.removeEventListener("paste", handlePaste as EventListener);
  }, []);

  useEffect(() => {
    if (shouldTranslate) {
      processTranslation();
      setShouldTranslate(false);
    }
  }, [fileStatuses]);

  // Queue processing — process images one by one from the queue
  useEffect(() => {
    const latestRef = {
      config: buildTranslationConfig(),
      settings: {
        detectionResolution, textDetector, renderTextDirection,
        translator, targetLanguage, inpaintingSize, customUnclipRatio,
        customBoxThreshold, maskDilationOffset, inpainter,
        renderer, alignment, fontSize, fontColor, uppercase, lowercase,
        noHyphenation, rtl, lineSpacing, fontSizeOffset, fontSizeMaximum, fontSizeCompression, disableFontBorder,
        noTextLangSkip, filterText, textThreshold, detRotate, detAutoRotate,
        detInvert, detGammaCorrect, ocr, minTextLength, ignoreBubble,
        upscaler, upscaleRatio, revertUpscaling, colorizer, colorizationSize,
        denoiseSigma, inpaintingPrecision, kernelSize, forceSimpleSort,
      } as TranslationSettings,
    };

    let cancelled = false;

    const processQueue = async () => {
      while (!cancelled) {
        const current = queueRef.current;
        const next = current.find(q => q.status === 'queued');
        if (!next) break;

        // Mark as processing
        setQueuedImages(prev => prev.map(q =>
          q.id === next.id ? { ...q, status: 'processing' as const } : q
        ));

        try {
          const formData = new FormData();
          formData.append("image", next.file);
          formData.append("config", latestRef.config);

          const response = await fetch(`/api/translate/with-form/image/stream`, {
            method: "POST",
            body: formData,
          });

          if (response.status !== 200) throw new Error("Upload failed");

          const reader = response.body?.getReader();
          if (!reader) throw new Error("No reader");

          let buffer = new Uint8Array();

          while (true) {
            const { done, value } = await reader.read();
            if (done || !value) break;

            const newBuffer = new Uint8Array(buffer.length + value.length);
            newBuffer.set(buffer);
            newBuffer.set(value, buffer.length);
            buffer = newBuffer;

            while (buffer.length >= 5) {
              const dataSize = new DataView(buffer.buffer).getUint32(1, false);
              const totalSize = 5 + dataSize;
              if (buffer.length < totalSize) break;

              const statusCode = buffer[0];
              const data = buffer.slice(5, totalSize);
              const decodedData = new TextDecoder("utf-8").decode(data);

              if (statusCode === 0) {
                // Result image — add to gallery
                const resultBlob = new Blob([data], { type: "image/png" });
                setQueuedImages(prev => prev.map(q =>
                  q.id === next.id ? { ...q, status: 'finished' as const, result: resultBlob } : q
                ));
                const finishedImage: FinishedImage = {
                  id: `${next.file.name}-${Date.now()}`,
                  originalName: next.file.name,
                  result: resultBlob,
                  finishedAt: new Date(),
                  settings: latestRef.settings,
                };
                setFinishedImages(prev => [finishedImage, ...prev]);
              } else if (statusCode === 1) {
                // Progress update
                setQueuedImages(prev => prev.map(q =>
                  q.id === next.id ? { ...q, status: 'processing' as const } : q
                ));
              } else if (statusCode === 2) {
                // Error
                setQueuedImages(prev => prev.map(q =>
                  q.id === next.id ? { ...q, status: 'error' as const, error: decodedData } : q
                ));
              }

              buffer = buffer.slice(totalSize);
            }
          }
        } catch (err) {
          setQueuedImages(prev => prev.map(q =>
            q.id === next.id
              ? { ...q, status: 'error' as const, error: err instanceof Error ? err.message : 'Unknown error' }
              : q
          ));
        }
      }
    };

    if (queuedImages.some(q => q.status === 'queued')) {
      processQueue();
    }

    return () => { cancelled = true; };
  }, [queuedImages]);

  // Start the queue — used by ImageQueue's start button
  const handleStartQueue = useCallback(() => {
    const hasQueued = queueRef.current.some(q => q.status === 'queued');
    if (hasQueued) {
      // Force a re-render by touching state, which triggers the useEffect
      setQueuedImages(prev => [...prev]);
    }
  }, []);

  // Add images to queue
  const addToQueue = (newFiles: File[]) => {
    const newQueuedImages: QueuedImage[] = newFiles.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      addedAt: new Date(),
      status: 'queued' as const,
    }));
    setQueuedImages(prev => [...prev, ...newQueuedImages]);
  };

  // Remove image from queue (only queued items can be removed)
  const removeFromQueue = (id: string) => {
    setQueuedImages(prev => prev.filter(img => img.id !== id));
  };

  // Event Handlers
  /** フォーム再セット */
  const clearForm = () => {
    setFiles([]);
    setFileStatuses(() => new Map());
  };

  /** ドラッグ＆ドロップ対応 */
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer?.files || []);
    const validFiles = droppedFiles.filter((file) =>
      imageMimeTypes.includes(file.type)
    );
    setFiles((prev) => [...prev, ...validFiles]);
  };

  /** ファイル選択時 */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter((file) =>
      imageMimeTypes.includes(file.type)
    );
    setFiles((prev) => [...prev, ...validFiles]);
  };

  // Remove file handler
  const removeFile = (fileName: string) => {
    setFiles((prev) => prev.filter((file) => file.name !== fileName));
    setFileStatuses((prev) => {
      const newStatuses = new Map(prev);
      newStatuses.delete(fileName);
      return newStatuses;
    });
  };

  const clearGallery = () => {
    setFinishedImages([]);
    localStorage.removeItem('manga-translator-finished-images');
  };

  /**
   * フォーム送信 (翻訳リクエスト)
   */
  const handleSubmit = () => {
    if (files.length === 0) return;

    resetFileStatuses();
    setShouldTranslate(true);
  };

  // Translation Processing - Configeration
  const buildTranslationConfig = (): string => {
    return JSON.stringify({
      detector: {
        detector: textDetector,
        detection_size: detectionResolution,
        box_threshold: customBoxThreshold,
        unclip_ratio: customUnclipRatio,
        text_threshold: textThreshold,
        det_rotate: detRotate,
        det_auto_rotate: detAutoRotate,
        det_invert: detInvert,
        det_gamma_correct: detGammaCorrect,
      },
      render: {
        renderer: renderer,
        alignment: alignment,
        direction: renderTextDirection,
        uppercase: uppercase,
        lowercase: lowercase,
        no_hyphenation: noHyphenation,
        font_color: fontColor || undefined,
        line_spacing: lineSpacing || undefined,
        font_size: fontSize >= 0 ? fontSize : undefined,
        font_size_offset: fontSizeOffset,
        font_size_maximum: fontSizeMaximum,
        font_size_compression: fontSizeCompression,
        disable_font_border: disableFontBorder,
        rtl: rtl,
      },
      translator: {
        translator: translator,
        target_lang: targetLanguage,
        no_text_lang_skip: noTextLangSkip,
      },
      inpainter: {
        inpainter: inpainter,
        inpainting_size: inpaintingSize,
        inpainting_precision: inpaintingPrecision,
      },
      ocr: {
        ocr: ocr,
        min_text_length: minTextLength,
        ignore_bubble: ignoreBubble,
      },
      upscale: {
        upscaler: upscaler,
        upscale_ratio: upscaleRatio > 0 ? upscaleRatio : undefined,
        revert_upscaling: revertUpscaling,
      },
      colorizer: {
        colorizer: colorizer,
        colorization_size: colorizationSize,
        denoise_sigma: denoiseSigma,
      },
      mask_dilation_offset: maskDilationOffset,
      filter_text: filterText || undefined,
      kernel_size: kernelSize,
      force_simple_sort: forceSimpleSort,
    });
  };

  // Translation Processing - Network Request
  const requestTranslation = async (file: File, config: string) => {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("config", config);

    const response = await fetch(`/api/translate/with-form/image/stream`, {
      method: "POST",
      body: formData,
    });

    if (response.status !== 200) {
      throw new Error("Upload failed");
    }

    return response;
  };

  // Translation Processing - Chunk Processing
  const processChunk = async (
    value: Uint8Array,
    fileId: string,
    currentBuffer: Uint8Array
  ): Promise<ChunkProcessingResult> => {
    // Check for existing errors first
    if (fileStatuses.get(fileId)?.error) {
      throw new Error(
        `Processing stopped due to previous error for file ${fileId}`
      );
    }

    // Combine buffers
    const newBuffer = new Uint8Array(currentBuffer.length + value.length);
    newBuffer.set(currentBuffer);
    newBuffer.set(value, currentBuffer.length);
    let processedBuffer = newBuffer;

    // Process all complete messages in buffer
    while (processedBuffer.length >= 5) {
      const dataSize = new DataView(processedBuffer.buffer).getUint32(1, false);
      const totalSize = 5 + dataSize;
      if (processedBuffer.length < totalSize) break;

      const statusCode = processedBuffer[0];
      const data = processedBuffer.slice(5, totalSize);
      const decodedData = new TextDecoder("utf-8").decode(data);

      processStatusUpdate(statusCode, decodedData, fileId, data);
      processedBuffer = processedBuffer.slice(totalSize);
    }

    return { updatedBuffer: processedBuffer };
  };

  // Translation Processing - Single File Stream Processing
  const processSingleFileStream = async (file: File, config: string) => {
    try {
      const response = await requestTranslation(file, config);
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get stream reader");
      }

      let fileBuffer = new Uint8Array();

      while (true) {
        const { done, value } = await reader.read();
        if (done || !value) break;

        try {
          const result = await processChunk(value, file.name, fileBuffer);
          fileBuffer = result.updatedBuffer;
        } catch (error) {
          console.error(`Error processing chunk for ${file.name}:`, error);
          updateFileStatus(file.name, {
            status: "error",
            error:
              error instanceof Error ? error.message : "Error processing chunk",
          });
        }
      }
    } catch (err) {
      console.error("Error processing file: ", file.name, err);
      updateFileStatus(file.name, {
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  // Translation Processing - Overall Translation Batch Process
  const processTranslation = async () => {
    const config = buildTranslationConfig();

    // Process all files in parallel
    try {
      await Promise.all(
        files.map((file) => processSingleFileStream(file, config))
      );
    } catch (err) {
      console.error("Translation process failed:", err);
    }
  };

  // Helper to reset file statuses
  const resetFileStatuses = () => {
    // Initialize status for all files
    const newStatuses = new Map();
    files.forEach((file) => {
      newStatuses.set(file.name, {
        status: null,
        progress: null,
        queuePos: null,
        result: null,
        error: null,
      });
    });
    setFileStatuses(newStatuses);
  };

  // Helper to update status for a specific file
  const updateFileStatus = (fileId: string, update: Partial<FileStatus>) => {
    setFileStatuses((prev) => {
      const newStatuses = new Map(prev);
      const currentStatus = newStatuses.get(fileId) || {
        status: null,
        progress: null,
        queuePos: null,
        result: null,
        error: null,
      };
      const updatedStatus = { ...currentStatus, ...update };
      newStatuses.set(fileId, updatedStatus);
      return newStatuses;
    });
  };

  // Helper to process status updates
  const processStatusUpdate = (
    statusCode: number,
    decodedData: string,
    fileId: string,
    data: Uint8Array
  ): void => {
    switch (statusCode) {
      case 0: // 結果が返ってきた
        const resultBlob = new Blob([data], { type: "image/png" });
        updateFileStatus(fileId, {
          status: "finished",
          result: resultBlob,
        });
        
        // Add to finished images gallery
        const settings: TranslationSettings = {
          detectionResolution,
          textDetector,
          renderTextDirection,
          translator,
          targetLanguage,
          inpaintingSize,
          customUnclipRatio,
          customBoxThreshold,
          maskDilationOffset,
          inpainter,
          renderer,
          alignment,
          fontSize,
          fontColor,
          uppercase,
          lowercase,
          noHyphenation,
          rtl,
          lineSpacing,
          fontSizeOffset,
          fontSizeMaximum,
          fontSizeCompression,
          disableFontBorder,
          noTextLangSkip,
          filterText,
          textThreshold,
          detRotate,
          detAutoRotate,
          detInvert,
          detGammaCorrect,
          ocr,
          minTextLength,
          ignoreBubble,
          upscaler,
          upscaleRatio,
          revertUpscaling,
          colorizer,
          colorizationSize,
          denoiseSigma,
          inpaintingPrecision,
          kernelSize,
          forceSimpleSort,
        };
        
        const finishedImage: FinishedImage = {
          id: `${fileId}-${Date.now()}`,
          originalName: fileId,
          result: resultBlob,
          finishedAt: new Date(),
          settings,
        };
        
        setFinishedImages(prev => [finishedImage, ...prev]);
        addFinishedImage(finishedImage);
        break;
      case 1: // 翻訳中
        const newStatus = decodedData as StatusKey;
        updateFileStatus(fileId, { status: newStatus });
        break;
      case 2: // エラー
        updateFileStatus(fileId, {
          status: "error",
          error: decodedData,
        });
        break;
      case 3: // キューに追加された
        updateFileStatus(fileId, {
          status: "pending",
          queuePos: decodedData,
        });
        break;
      case 4: // キューがクリアされた
        updateFileStatus(fileId, {
          status: "pending",
          queuePos: null,
        });
        break;
      default: // 未知のステータスコード
        console.warn(`Unknown status code ${statusCode} for file ${fileId}`);
        break;
    }
  };

  return (
    <div>
      <Header />
      <div className="bg-gray-100 min-h-screen flex flex-col pt-10 items-center">
        <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-6xl space-y-6">
          <OptionsPanel
            detectionResolution={detectionResolution}
            textDetector={textDetector}
            renderTextDirection={renderTextDirection}
            translator={translator}
            targetLanguage={targetLanguage}
            inpaintingSize={inpaintingSize}
            customUnclipRatio={customUnclipRatio}
            customBoxThreshold={customBoxThreshold}
            maskDilationOffset={maskDilationOffset}
            inpainter={inpainter}
            renderer={renderer}
            alignment={alignment}
            fontSize={fontSize}
            fontColor={fontColor}
            uppercase={uppercase}
            lowercase={lowercase}
            noHyphenation={noHyphenation}
            rtl={rtl}
            lineSpacing={lineSpacing}
            fontSizeOffset={fontSizeOffset}
            fontSizeMaximum={fontSizeMaximum}
            fontSizeCompression={fontSizeCompression}
            disableFontBorder={disableFontBorder}
            noTextLangSkip={noTextLangSkip}
            filterText={filterText}
            textThreshold={textThreshold}
            detRotate={detRotate}
            detAutoRotate={detAutoRotate}
            detInvert={detInvert}
            detGammaCorrect={detGammaCorrect}
            ocr={ocr}
            minTextLength={minTextLength}
            ignoreBubble={ignoreBubble}
            upscaler={upscaler}
            upscaleRatio={upscaleRatio}
            revertUpscaling={revertUpscaling}
            colorizer={colorizer}
            colorizationSize={colorizationSize}
            denoiseSigma={denoiseSigma}
            inpaintingPrecision={inpaintingPrecision}
            kernelSize={kernelSize}
            forceSimpleSort={forceSimpleSort}
            setDetectionResolution={setDetectionResolution}
            setTextDetector={setTextDetector}
            setRenderTextDirection={setRenderTextDirection}
            setTranslator={setTranslator}
            setTargetLanguage={setTargetLanguage}
            setInpaintingSize={setInpaintingSize}
            setCustomUnclipRatio={setCustomUnclipRatio}
            setCustomBoxThreshold={setCustomBoxThreshold}
            setMaskDilationOffset={setMaskDilationOffset}
            setInpainter={setInpainter}
            setRenderer={setRenderer}
            setAlignment={setAlignment}
            setFontSize={setFontSize}
            setFontColor={setFontColor}
            setUppercase={setUppercase}
            setLowercase={setLowercase}
            setNoHyphenation={setNoHyphenation}
            setRtl={setRtl}
            setLineSpacing={setLineSpacing}
            setFontSizeOffset={setFontSizeOffset}
            setFontSizeMaximum={setFontSizeMaximum}
            setFontSizeCompression={setFontSizeCompression}
            setDisableFontBorder={setDisableFontBorder}
            setNoTextLangSkip={setNoTextLangSkip}
            setFilterText={setFilterText}
            setTextThreshold={setTextThreshold}
            setDetRotate={setDetRotate}
            setDetAutoRotate={setDetAutoRotate}
            setDetInvert={setDetInvert}
            setDetGammaCorrect={setDetGammaCorrect}
            setOcr={setOcr}
            setMinTextLength={setMinTextLength}
            setIgnoreBubble={setIgnoreBubble}
            setUpscaler={setUpscaler}
            setUpscaleRatio={setUpscaleRatio}
            setRevertUpscaling={setRevertUpscaling}
            setColorizer={setColorizer}
            setColorizationSize={setColorizationSize}
            setDenoiseSigma={setDenoiseSigma}
            setInpaintingPrecision={setInpaintingPrecision}
            setKernelSize={setKernelSize}
            setForceSimpleSort={setForceSimpleSort}
          />

          {/* Main Image Handling Area */}
          <div className="border-t pt-6">
            <ImageHandlingArea
              files={files}
              fileStatuses={fileStatuses}
              isProcessing={isProcessing}
              isProcessingAllFinished={isProcessingAllFinished}
              handleFileChange={handleFileChange}
              handleDrop={handleDrop}
              handleSubmit={handleSubmit}
              clearForm={clearForm}
              removeFile={removeFile}
            />
          </div>

          {/* Translation Queue */}
          <div className="border-t pt-6">
            <ImageQueue
              queuedImages={queuedImages}
              onRemoveFromQueue={removeFromQueue}
              onAddToQueue={addToQueue}
              onStartQueue={handleStartQueue}
              isProcessing={queuedImages.some(q => q.status === 'processing')}
            />
          </div>

          {/* Results Gallery */}
          <div className="border-t pt-6">
            <ResultGallery
              finishedImages={finishedImages}
              onClearGallery={clearGallery}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;

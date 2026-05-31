import React from "react";
import type { TranslatorKey } from "@/types";
import { validTranslators } from "@/types";
import { getTranslatorName } from "@/utils/getTranslatorName";
import {
  languageOptions,
  detectionResolutions,
  textDetectorOptions,
  inpaintingSizes,
  inpainterOptions,
  rendererOptions,
  alignmentOptions,
  ocrOptions,
  upscalerOptions,
  colorizerOptions,
  inpaintingPrecisionOptions,
} from "@/config";
import { LabeledInput } from "@/components/LabeledInput";
import { LabeledSelect } from "@/components/LabeledSelect";
import { LabeledTextInput } from "@/components/LabeledTextInput";
import { LabeledToggle } from "@/components/LabeledToggle";
import { CollapsibleSection } from "@/components/CollapsibleSection";

type Props = {
  // Basic settings
  detectionResolution: string;
  textDetector: string;
  renderTextDirection: string;
  translator: TranslatorKey;
  targetLanguage: string;
  inpaintingSize: string;
  customUnclipRatio: number;
  customBoxThreshold: number;
  maskDilationOffset: number;
  inpainter: string;

  // Render settings
  renderer: string;
  alignment: string;
  fontSize: number;
  fontColor: string;
  uppercase: boolean;
  lowercase: boolean;
  noHyphenation: boolean;
  rtl: boolean;
  lineSpacing: number;
  fontSizeOffset: number;
  fontSizeMaximum: number;
  fontSizeCompression: number;
  disableFontBorder: boolean;

  // Translator advanced
  noTextLangSkip: boolean;
  filterText: string;

  // Detector advanced
  textThreshold: number;
  detRotate: boolean;
  detAutoRotate: boolean;
  detInvert: boolean;
  detGammaCorrect: boolean;

  // OCR
  ocr: string;
  minTextLength: number;
  ignoreBubble: number;

  // Upscale
  upscaler: string;
  upscaleRatio: number;
  revertUpscaling: boolean;

  // Colorizer
  colorizer: string;
  colorizationSize: number;
  denoiseSigma: number;

  // Inpainter advanced
  inpaintingPrecision: string;

  // Global
  kernelSize: number;
  forceSimpleSort: boolean;

  // Setters - Basic
  setDetectionResolution: (val: string) => void;
  setTextDetector: (val: string) => void;
  setRenderTextDirection: (val: string) => void;
  setTranslator: (val: TranslatorKey) => void;
  setTargetLanguage: (val: string) => void;
  setInpaintingSize: (val: string) => void;
  setCustomUnclipRatio: (val: number) => void;
  setCustomBoxThreshold: (val: number) => void;
  setMaskDilationOffset: (val: number) => void;
  setInpainter: (val: string) => void;

  // Setters - Render
  setRenderer: (val: string) => void;
  setAlignment: (val: string) => void;
  setFontSize: (val: number) => void;
  setFontColor: (val: string) => void;
  setUppercase: (val: boolean) => void;
  setLowercase: (val: boolean) => void;
  setNoHyphenation: (val: boolean) => void;
  setRtl: (val: boolean) => void;
  setLineSpacing: (val: number) => void;
  setFontSizeOffset: (val: number) => void;
  setFontSizeMaximum: (val: number) => void;
  setFontSizeCompression: (val: number) => void;
  setDisableFontBorder: (val: boolean) => void;

  // Setters - Translator advanced
  setNoTextLangSkip: (val: boolean) => void;
  setFilterText: (val: string) => void;

  // Setters - Detector advanced
  setTextThreshold: (val: number) => void;
  setDetRotate: (val: boolean) => void;
  setDetAutoRotate: (val: boolean) => void;
  setDetInvert: (val: boolean) => void;
  setDetGammaCorrect: (val: boolean) => void;

  // Setters - OCR
  setOcr: (val: string) => void;
  setMinTextLength: (val: number) => void;
  setIgnoreBubble: (val: number) => void;

  // Setters - Upscale
  setUpscaler: (val: string) => void;
  setUpscaleRatio: (val: number) => void;
  setRevertUpscaling: (val: boolean) => void;

  // Setters - Colorizer
  setColorizer: (val: string) => void;
  setColorizationSize: (val: number) => void;
  setDenoiseSigma: (val: number) => void;

  // Setters - Inpainter advanced
  setInpaintingPrecision: (val: string) => void;

  // Setters - Global
  setKernelSize: (val: number) => void;
  setForceSimpleSort: (val: boolean) => void;
};

export const OptionsPanel: React.FC<Props> = (props) => {
  return (
    <>
      {/* Basic Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <LabeledSelect
          id="detectionResolution"
          label="Detection Resolution"
          icon="carbon:fit-to-screen"
          title="Detection resolution"
          value={props.detectionResolution}
          onChange={props.setDetectionResolution}
          options={detectionResolutions.map((res) => ({
            label: `${res}px`,
            value: String(res),
          }))}
        />
        <LabeledSelect
          id="textDetector"
          label="Text Detector"
          icon="carbon:search-locate"
          title="Text detector"
          value={props.textDetector}
          onChange={props.setTextDetector}
          options={textDetectorOptions}
        />
        <LabeledSelect
          id="renderTextDirection"
          label="Render Direction"
          icon="carbon:text-align-left"
          title="Render text orientation"
          value={props.renderTextDirection}
          onChange={props.setRenderTextDirection}
          options={[
            { value: "auto", label: "Auto" },
            { value: "horizontal", label: "Horizontal" },
            { value: "vertical", label: "Vertical" },
          ]}
        />
        <LabeledSelect
          id="translator"
          label="Translator"
          icon="carbon:operations-record"
          title="Translator"
          value={props.translator}
          onChange={(val) => props.setTranslator(val as TranslatorKey)}
          options={validTranslators.map((key) => ({
            value: key,
            label: getTranslatorName(key),
          }))}
        />
        <LabeledSelect
          id="targetLanguage"
          label="Target Language"
          icon="carbon:language"
          title="Target language"
          value={props.targetLanguage}
          onChange={props.setTargetLanguage}
          options={languageOptions}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mt-4">
        <LabeledSelect
          id="inpaintingSize"
          label="Inpainting Size"
          icon="carbon:paint-brush"
          title="Inpainting size"
          value={props.inpaintingSize}
          onChange={props.setInpaintingSize}
          options={inpaintingSizes.map((size) => ({
            label: `${size}px`,
            value: String(size),
          }))}
        />
        <LabeledInput
          id="unclipRatio"
          label="Unclip Ratio"
          icon="weui:max-window-filled"
          title="Unclip ratio"
          step={0.01}
          value={props.customUnclipRatio}
          onChange={props.setCustomUnclipRatio}
        />
        <LabeledInput
          id="boxThreshold"
          label="Box Threshold"
          icon="weui:photo-wall-outlined"
          title="Box threshold"
          step={0.01}
          value={props.customBoxThreshold}
          onChange={props.setCustomBoxThreshold}
        />
        <LabeledInput
          id="maskDilationOffset"
          label="Mask Dilation Offset"
          icon="material-symbols:adjust-outline"
          title="Mask dilation offset"
          step={1}
          value={props.maskDilationOffset}
          onChange={props.setMaskDilationOffset}
        />
        <LabeledSelect
          id="inpainter"
          label="Inpainter"
          icon="carbon:paint-brush"
          title="Inpainter"
          value={props.inpainter}
          onChange={props.setInpainter}
          options={inpainterOptions}
        />
      </div>

      {/* Advanced Sections */}
      <div className="space-y-3 mt-4">
        {/* Rendering */}
        <CollapsibleSection title="Rendering">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <LabeledSelect
              id="renderer"
              label="Renderer"
              icon="carbon:paint-brush"
              title="Text renderer"
              value={props.renderer}
              onChange={props.setRenderer}
              options={rendererOptions}
            />
            <LabeledSelect
              id="alignment"
              label="Alignment"
              icon="carbon:text-align-center"
              title="Text alignment"
              value={props.alignment}
              onChange={props.setAlignment}
              options={alignmentOptions}
            />
            <LabeledInput
              id="fontSize"
              label="Font Size"
              icon="carbon:text-scale"
              title="Fixed font size (-1 = auto)"
              step={1}
              value={props.fontSize}
              onChange={props.setFontSize}
            />
            <LabeledTextInput
              id="fontColor"
              label="Font Color"
              icon="carbon:color-palette"
              title="Override OCR color (hex, e.g. FFFFFF or FFFFFF:000000)"
              placeholder="FFFFFF:000000"
              value={props.fontColor}
              onChange={props.setFontColor}
            />
            <LabeledInput
              id="lineSpacing"
              label="Line Spacing"
              icon="carbon:text-line-spacing"
              title="Line spacing (0 = default)"
              step={0.01}
              value={props.lineSpacing}
              onChange={props.setLineSpacing}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mt-4">
            <LabeledInput
              id="fontSizeOffset"
              label="Font Size Offset"
              icon="carbon:text-scale"
              title="Offset font size (+/-)"
              step={1}
              value={props.fontSizeOffset}
              onChange={props.setFontSizeOffset}
            />
            <LabeledInput
              id="fontSizeMaximum"
              label="Max Font Size"
              icon="carbon:text-scale"
              title="Maximum font size (-1 = disabled). Fonts above this are compressed"
              step={1}
              value={props.fontSizeMaximum}
              onChange={props.setFontSizeMaximum}
            />
            <LabeledInput
              id="fontSizeCompression"
              label="Compression"
              icon="carbon:shrink-screen"
              title="Compression ratio for oversized fonts (0-1). Lower = smaller"
              step={0.1}
              value={props.fontSizeCompression}
              onChange={props.setFontSizeCompression}
            />
            <LabeledToggle
              id="uppercase"
              label="Uppercase"
              title="Force text to uppercase"
              checked={props.uppercase}
              onChange={props.setUppercase}
            />
            <LabeledToggle
              id="lowercase"
              label="Lowercase"
              title="Force text to lowercase"
              checked={props.lowercase}
              onChange={props.setLowercase}
            />
            <LabeledToggle
              id="noHyphenation"
              label="No Hyphenation"
              title="Disable word hyphenation"
              checked={props.noHyphenation}
              onChange={props.setNoHyphenation}
            />
            <LabeledToggle
              id="rtl"
              label="RTL Reading"
              title="Right-to-left reading order"
              checked={props.rtl}
              onChange={props.setRtl}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <LabeledToggle
              id="disableFontBorder"
              label="Disable Font Border"
              title="Disable font border/outline"
              checked={props.disableFontBorder}
              onChange={props.setDisableFontBorder}
            />
          </div>
        </CollapsibleSection>

        {/* OCR */}
        <CollapsibleSection title="OCR">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <LabeledSelect
              id="ocr"
              label="OCR Model"
              icon="carbon:text-annotation"
              title="OCR model to use"
              value={props.ocr}
              onChange={props.setOcr}
              options={ocrOptions}
            />
            <LabeledInput
              id="minTextLength"
              label="Min Text Length"
              icon="carbon:text-minimize"
              title="Minimum text length to process"
              step={1}
              value={props.minTextLength}
              onChange={props.setMinTextLength}
            />
            <LabeledInput
              id="ignoreBubble"
              label="Ignore Bubble"
              icon="carbon:checkbox"
              title="Ignore non-bubble text (0=off, 1-50)"
              step={1}
              value={props.ignoreBubble}
              onChange={props.setIgnoreBubble}
            />
          </div>
        </CollapsibleSection>

        {/* Upscaling */}
        <CollapsibleSection title="Upscaling">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <LabeledSelect
              id="upscaler"
              label="Upscaler"
              icon="carbon:image-scale-up"
              title="Upscaling model"
              value={props.upscaler}
              onChange={props.setUpscaler}
              options={upscalerOptions}
            />
            <LabeledInput
              id="upscaleRatio"
              label="Upscale Ratio"
              icon="carbon:fit-to-width"
              title="Upscale ratio (0 = disabled)"
              step={1}
              value={props.upscaleRatio}
              onChange={props.setUpscaleRatio}
            />
            <LabeledToggle
              id="revertUpscaling"
              label="Revert After Translation"
              title="Downscale back to original size after translation"
              checked={props.revertUpscaling}
              onChange={props.setRevertUpscaling}
            />
          </div>
        </CollapsibleSection>

        {/* Colorization */}
        <CollapsibleSection title="Colorization">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <LabeledSelect
              id="colorizer"
              label="Colorizer"
              icon="carbon:color-palette"
              title="Colorization model"
              value={props.colorizer}
              onChange={props.setColorizer}
              options={colorizerOptions}
            />
            <LabeledInput
              id="colorizationSize"
              label="Colorization Size"
              icon="carbon:fit-to-screen"
              title="Image size for colorization"
              step={64}
              value={props.colorizationSize}
              onChange={props.setColorizationSize}
            />
            <LabeledInput
              id="denoiseSigma"
              label="Denoise Sigma"
              icon="carbon:noise-reduce"
              title="Denoise strength (0-255)"
              step={1}
              value={props.denoiseSigma}
              onChange={props.setDenoiseSigma}
            />
          </div>
        </CollapsibleSection>

        {/* Advanced */}
        <CollapsibleSection title="Advanced">
          <p className="text-xs text-gray-500 font-medium">Detector</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <LabeledInput
              id="textThreshold"
              label="Text Threshold"
              icon="carbon:threshold"
              title="Text detection threshold"
              step={0.01}
              value={props.textThreshold}
              onChange={props.setTextThreshold}
            />
            <LabeledToggle
              id="detRotate"
              label="Rotate"
              title="Rotate image for detection"
              checked={props.detRotate}
              onChange={props.setDetRotate}
            />
            <LabeledToggle
              id="detAutoRotate"
              label="Auto Rotate"
              title="Auto-rotate for vertical text"
              checked={props.detAutoRotate}
              onChange={props.setDetAutoRotate}
            />
            <LabeledToggle
              id="detInvert"
              label="Invert"
              title="Invert image colors for detection"
              checked={props.detInvert}
              onChange={props.setDetInvert}
            />
            <LabeledToggle
              id="detGammaCorrect"
              label="Gamma Correct"
              title="Apply gamma correction"
              checked={props.detGammaCorrect}
              onChange={props.setDetGammaCorrect}
            />
          </div>

          <p className="text-xs text-gray-500 font-medium mt-4">Inpainter</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <LabeledSelect
              id="inpaintingPrecision"
              label="Precision"
              icon="carbon:chip"
              title="Inpainting precision (bf16 recommended)"
              value={props.inpaintingPrecision}
              onChange={props.setInpaintingPrecision}
              options={inpaintingPrecisionOptions}
            />
          </div>

          <p className="text-xs text-gray-500 font-medium mt-4">Translator</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <LabeledToggle
              id="noTextLangSkip"
              label="Don't Skip Target Lang"
              title="Don't skip text already in target language"
              checked={props.noTextLangSkip}
              onChange={props.setNoTextLangSkip}
            />
            <LabeledTextInput
              id="filterText"
              label="Filter Text (Regex)"
              icon="carbon:filter"
              title="Regex to filter text regions"
              placeholder=".*badtext.*"
              value={props.filterText}
              onChange={props.setFilterText}
            />
          </div>

          <p className="text-xs text-gray-500 font-medium mt-4">Global</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <LabeledInput
              id="kernelSize"
              label="Kernel Size"
              icon="carbon:grid"
              title="Convolution kernel size for text erasure"
              step={1}
              value={props.kernelSize}
              onChange={props.setKernelSize}
            />
            <LabeledToggle
              id="forceSimpleSort"
              label="Simple Sort"
              title="Disable panel detection sorting"
              checked={props.forceSimpleSort}
              onChange={props.setForceSimpleSort}
            />
          </div>
        </CollapsibleSection>
      </div>
    </>
  );
};

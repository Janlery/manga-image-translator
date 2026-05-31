export const languageOptions = [  
  { value: "CHS", label: "简体中文" },  
  { value: "CHT", label: "繁體中文" },  
  { value: "CSY", label: "čeština" },  
  { value: "NLD", label: "Nederlands" },  
  { value: "ENG", label: "English" },  
  { value: "FRA", label: "français" },  
  { value: "DEU", label: "Deutsch" },  
  { value: "HUN", label: "magyar nyelv" },  
  { value: "ITA", label: "italiano" },  
  { value: "JPN", label: "日本語" },  
  { value: "KOR", label: "한국어" },  
  { value: "POL", label: "polski" },  
  { value: "PTB", label: "português" },  
  { value: "ROM", label: "limba română" },  
  { value: "RUS", label: "русский язык" },  
  { value: "ESP", label: "español" },  
  { value: "TRK", label: "Türk dili" },  
  { value: "UKR", label: "українська мова" },  
  { value: "VIN", label: "Tiếng Việt" },  
  { value: "ARA", label: "العربية" },  
  { value: "CNR", label: "crnogorski jezik" },  
  { value: "SRP", label: "српски језик" },  
  { value: "HRV", label: "hrvatski jezik" },  
  { value: "THA", label: "ภาษาไทย" },  
  { value: "IND", label: "Indonesia" },  
  { value: "FIL", label: "Wikang Filipino" }  
];  

export const detectionResolutions = [1024, 1536, 2048, 2560];

export const inpaintingSizes = [516, 1024, 2048, 2560];

export const textDetectorOptions = [
  { value: "default", label: "Default" },
  { value: "ctd", label: "CTD" },
  { value: "dbconvnext", label: "DBConvNext" },
  { value: "craft", label: "CRAFT" },
  { value: "paddle", label: "Paddle" },
  { value: "ysgyolo", label: "YSGYolo" },
  { value: "none", label: "None" },
];

export const inpainterOptions = [
  { value: "default", label: "Default" },
  { value: "lama_large", label: "Lama Large" },
  { value: "lama_mpe", label: "Lama MPE" },
  { value: "sd", label: "SD" },
  { value: "none", label: "None" },
  { value: "original", label: "Original" },
];

export const imageMimeTypes = [
  "image/png",
  "image/jpeg",
  "image/bmp",
  "image/webp",
];

export const rendererOptions = [
  { value: "default", label: "Default" },
  { value: "manga2eng", label: "Manga2Eng" },
  { value: "manga2eng_pillow", label: "Manga2Eng (Pillow)" },
  { value: "none", label: "None" },
];

export const alignmentOptions = [
  { value: "auto", label: "Auto" },
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

export const ocrOptions = [
  { value: "32px", label: "32px" },
  { value: "48px", label: "48px" },
  { value: "48px_ctc", label: "48px CTC" },
  { value: "mocr", label: "Manga OCR" },
];

export const upscalerOptions = [
  { value: "waifu2x", label: "Waifu2x" },
  { value: "esrgan", label: "ESRGAN" },
  { value: "4xultrasharp", label: "4x UltraSharp" },
];

export const colorizerOptions = [
  { value: "none", label: "None" },
  { value: "mc2", label: "MC2 (Manga Colorization)" },
];

export const inpaintingPrecisionOptions = [
  { value: "fp32", label: "FP32" },
  { value: "fp16", label: "FP16" },
  { value: "bf16", label: "BF16" },
];

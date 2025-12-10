import type { TranslationSettings, FinishedImage } from '@/types';

const SETTINGS_KEY = 'manga-translator-settings';
const FINISHED_IMAGES_KEY = 'manga-translator-finished-images';

export const loadSettings = (): Partial<TranslationSettings> => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('Failed to load settings from localStorage:', error);
    return {};
  }
};

export const saveSettings = (settings: TranslationSettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to save settings to localStorage:', error);
  }
};

export const loadFinishedImages = (): FinishedImage[] => {
  // Note: Blob objects cannot be serialized to JSON, so we don't persist finished images
  // across page reloads. The localStorage was storing invalid data that caused
  // "createObjectURL" errors. Return empty array to avoid loading corrupted data.
  return [];
};

export const saveFinishedImages = (_images: FinishedImage[]): void => {
  // Note: Blob objects cannot be serialized to JSON, so we don't persist finished images.
  // This function is kept for API compatibility but does nothing.
};

export const addFinishedImage = (_image: FinishedImage): void => {
  // Note: Blob objects cannot be serialized to JSON, so we don't persist finished images.
  // This function is kept for API compatibility but does nothing.
}; 
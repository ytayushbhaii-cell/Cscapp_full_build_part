export type BackgroundPreset = 'transparent' | 'white' | 'blue' | 'red' | 'custom';

export interface PickedImage {
  uri: string;
  width: number;
  height: number;
  fileName: string;
  mimeType?: string;
  fileSize?: number;
}

export interface ToolProcessResult {
  uri: string;
  width: number;
  height: number;
  fileSize?: number;
}

export const SUPPORTED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'bmp'];
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * LoRA Path Resolver
 *
 * Handles LoRA file path resolution and validation.
 * Supports cross-platform paths (Windows/Unix) and relative/absolute path conversion.
 */

import { isAbsolute, basename, sep, posix } from 'node:path';

// ==============================================================================
// Path Resolution
// ==============================================================================

/**
 * Resolve LoRA path from absolute to relative (relative to ComfyUI models/loras/)
 * Handles both Unix and Windows paths
 */
export function resolveLoraPath(path: string): string {
  // Validate path is not empty
  if (!path || path.trim() === '') {
    throw new Error('LoRA path cannot be empty');
  }

  // Check if it's already a relative path (doesn't start with / or C:\)
  const isWindowsAbsolute = /^[a-zA-Z]:\\/.test(path);
  const isUnixAbsolute = path.startsWith('/');

  if (!isWindowsAbsolute && !isUnixAbsolute) {
    // Already relative, return as-is (convert to forward slashes for consistency)
    return path.replace(/\\/g, '/');
  }

  // Handle absolute paths - extract path after /models/loras/ or \models\loras\
  const lorasPattern = /(?:models[\/\\]loras[\/\\])(.+)$/;
  const match = path.match(lorasPattern);

  if (match && match[1]) {
    // Return the path after models/loras/ (convert to forward slashes)
    return match[1].replace(/\\/g, '/');
  }

  // If no loras directory found, just return the basename
  return basename(path).replace(/\\/g, '/');
}

// ==============================================================================
// Path Validation
// ==============================================================================

/**
 * Validate LoRA file exists (with optional filesystem mock for testing)
 */
export function validateLoraPath(
  path: string,
  fs?: { existsSync: (path: string) => boolean },
  options?: { skipValidation?: boolean }
): void {
  // Skip validation if requested
  if (options?.skipValidation) {
    return;
  }

  // Get LoRA directory
  const lorasDir = getLorasDirectory();

  // Build full path
  const fullPath = `${lorasDir}/${path}`;

  // Check if file exists
  const fileExists = fs ? fs.existsSync(fullPath) : false;

  if (!fileExists) {
    throw new Error(`LoRA file not found: ${path}`);
  }
}

/**
 * Validate LoRA file extension
 * Supported extensions: .safetensors, .pt, .ckpt
 */
export function validateLoraExtension(path: string): void {
  const validExtensions = ['.safetensors', '.pt', '.ckpt'];
  const hasValidExtension = validExtensions.some((ext) => path.endsWith(ext));

  if (!hasValidExtension) {
    throw new Error(
      'Invalid LoRA file extension. Must be .safetensors, .pt, or .ckpt'
    );
  }
}

// ==============================================================================
// Configuration
// ==============================================================================

/**
 * Get LoRA directory from environment or use default
 */
export function getLorasDirectory(): string {
  const dir = process.env.COMFYUI_LORAS_DIR || '/app/ComfyUI/models/loras';
  // Remove trailing slash if present
  return dir.replace(/\/$/, '');
}

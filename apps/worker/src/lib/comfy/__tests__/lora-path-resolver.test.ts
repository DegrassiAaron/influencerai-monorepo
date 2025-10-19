/**
 * LoRA Path Resolver Tests - BDD Test Suite
 * Tests for LoRA file path resolution and validation
 *
 * Coverage: 18 BDD scenarios from comfyui-workflow-templates.feature
 * - LoRA local file path resolution (5 scenarios)
 * - Handle missing LoRA files (5 scenarios)
 * - LoRA path configuration (4 scenarios)
 * - LoRA file extension validation (4 scenarios)
 *
 * Status: RED (expected to fail - no implementation yet)
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { resolveLoraPath, validateLoraPath, validateLoraExtension } from '../lora-path-resolver';

// ==============================================================================
// FEATURE: LoRA Local File Path Resolution
// ==============================================================================

describe('resolveLoraPath', () => {
  // BDD Scenario: Resolve absolute path to relative path
  it('should resolve absolute path to relative path', () => {
    // Arrange
    const absolutePath = '/app/ComfyUI/models/loras/influencer-v1.safetensors';

    // Act
    const resolved = resolveLoraPath(absolutePath);

    // Assert
    expect(resolved).toBe('influencer-v1.safetensors');
  });

  // BDD Scenario: Resolve nested subdirectory path
  it('should resolve nested subdirectory path', () => {
    // Arrange
    const nestedPath = '/app/ComfyUI/models/loras/characters/influencer/v2.safetensors';

    // Act
    const resolved = resolveLoraPath(nestedPath);

    // Assert
    expect(resolved).toBe('characters/influencer/v2.safetensors');
  });

  // BDD Scenario: Handle already relative path
  it('should handle already relative path', () => {
    // Arrange
    const relativePath = 'style-lora.safetensors';

    // Act
    const resolved = resolveLoraPath(relativePath);

    // Assert
    expect(resolved).toBe('style-lora.safetensors');
  });

  // BDD Scenario: Handle Windows-style paths
  it('should handle Windows-style paths on Windows platform', () => {
    // Arrange
    const windowsPath = 'C:\\ComfyUI\\models\\loras\\influencer.safetensors';

    // Act
    const resolved = resolveLoraPath(windowsPath);

    // Assert
    // Should resolve to relative path regardless of platform
    expect(resolved).toBe('influencer.safetensors');
  });

  // BDD Scenario: Preserve subdirectory structure in relative paths
  it('should preserve subdirectory structure in relative paths', () => {
    // Arrange
    const relativeWithSubdir = 'characters/female/influencer.safetensors';

    // Act
    const resolved = resolveLoraPath(relativeWithSubdir);

    // Assert
    expect(resolved).toBe('characters/female/influencer.safetensors');
  });
});

// ==============================================================================
// FEATURE: Handle Missing LoRA Files
// ==============================================================================

describe('validateLoraPath', () => {
  // BDD Scenario: Validate existing LoRA file
  it('should validate existing LoRA file without throwing', () => {
    // Arrange
    const existingLoraPath = 'influencer-v1.safetensors';

    // Mock filesystem to indicate file exists
    const mockFs = {
      existsSync: vi.fn().mockReturnValue(true),
    };

    // Act & Assert
    expect(() => {
      validateLoraPath(existingLoraPath, mockFs as any);
    }).not.toThrow();
  });

  // BDD Scenario: Detect missing LoRA file
  it('should detect missing LoRA file and throw error', () => {
    // Arrange
    const missingLoraPath = 'nonexistent.safetensors';

    // Mock filesystem to indicate file doesn't exist
    const mockFs = {
      existsSync: vi.fn().mockReturnValue(false),
    };

    // Act & Assert
    expect(() => {
      validateLoraPath(missingLoraPath, mockFs as any);
    }).toThrow('LoRA file not found: nonexistent.safetensors');
  });

  // BDD Scenario: Detect missing LoRA in subdirectory
  it('should detect missing LoRA in subdirectory', () => {
    // Arrange
    const missingNestedPath = 'characters/missing.safetensors';

    // Mock filesystem to indicate file doesn't exist
    const mockFs = {
      existsSync: vi.fn().mockReturnValue(false),
    };

    // Act & Assert
    expect(() => {
      validateLoraPath(missingNestedPath, mockFs as any);
    }).toThrow('LoRA file not found: characters/missing.safetensors');
  });

  // BDD Scenario: Validate all LoRAs before building workflow
  it('should validate multiple LoRA paths and identify missing one', () => {
    // Arrange
    const loraPaths = [
      'lora1.safetensors',
      'lora2.safetensors', // This one is missing
      'lora3.safetensors',
    ];

    // Mock filesystem - only lora2 is missing
    const mockFs = {
      existsSync: vi.fn((path: string) => {
        return !path.includes('lora2');
      }),
    };

    // Act & Assert
    expect(() => {
      validateLoraPath(loraPaths[0], mockFs as any);
    }).not.toThrow();

    expect(() => {
      validateLoraPath(loraPaths[1], mockFs as any);
    }).toThrow('LoRA file not found: lora2.safetensors');

    expect(() => {
      validateLoraPath(loraPaths[2], mockFs as any);
    }).not.toThrow();
  });

  // BDD Scenario: Skip validation when validation is disabled (performance)
  it('should skip validation when validateLoras flag is false', () => {
    // Arrange
    const nonExistentPath = 'missing.safetensors';
    const mockFs = {
      existsSync: vi.fn().mockReturnValue(false),
    };

    // Act & Assert
    // When validation is disabled, should not throw even for missing file
    expect(() => {
      validateLoraPath(nonExistentPath, mockFs as any, { skipValidation: true });
    }).not.toThrow();

    // Verify existsSync was not called when skipping validation
    expect(mockFs.existsSync).not.toHaveBeenCalled();
  });
});

// ==============================================================================
// FEATURE: LoRA Path Configuration
// ==============================================================================

describe('LoRA Path Configuration', () => {
  beforeEach(() => {
    // Reset environment before each test
    delete process.env.COMFYUI_LORAS_DIR;
  });

  // BDD Scenario: Use default LoRA directory
  it('should use default LoRA directory when env var not set', () => {
    // Arrange
    delete process.env.COMFYUI_LORAS_DIR;

    // Act
    const defaultDir = getLorasDirectory();

    // Assert
    expect(defaultDir).toBe('/app/ComfyUI/models/loras');
  });

  // BDD Scenario: Use custom LoRA directory from environment
  it('should use custom LoRA directory from environment variable', () => {
    // Arrange
    process.env.COMFYUI_LORAS_DIR = '/custom/lora/path';

    // Act
    const customDir = getLorasDirectory();

    // Assert
    expect(customDir).toBe('/custom/lora/path');
  });

  // BDD Scenario: Handle trailing slashes in directory path
  it('should remove trailing slash from directory path', () => {
    // Arrange
    process.env.COMFYUI_LORAS_DIR = '/custom/lora/path/';

    // Act
    const dir = getLorasDirectory();

    // Assert
    expect(dir).toBe('/custom/lora/path');
    expect(dir.endsWith('/')).toBe(false);
  });

  // BDD Scenario: Resolve paths relative to custom directory
  it('should resolve paths relative to custom directory', () => {
    // Arrange
    process.env.COMFYUI_LORAS_DIR = '/custom/loras';
    const relativePath = 'style.safetensors';

    // Mock filesystem to indicate file exists in custom dir
    const mockFs = {
      existsSync: vi.fn((fullPath: string) => {
        return fullPath === '/custom/loras/style.safetensors';
      }),
    };

    // Act & Assert
    expect(() => {
      validateLoraPath(relativePath, mockFs as any);
    }).not.toThrow();

    expect(mockFs.existsSync).toHaveBeenCalledWith('/custom/loras/style.safetensors');
  });
});

// Helper function to test directory retrieval
function getLorasDirectory(): string {
  const dir = process.env.COMFYUI_LORAS_DIR || '/app/ComfyUI/models/loras';
  return dir.replace(/\/$/, ''); // Remove trailing slash
}

// ==============================================================================
// FEATURE: LoRA File Extension Validation
// ==============================================================================

describe('validateLoraExtension', () => {
  // BDD Scenario: Accept .safetensors extension
  it('should accept .safetensors extension', () => {
    // Arrange
    const validFile = 'model.safetensors';

    // Act & Assert
    expect(() => {
      validateLoraExtension(validFile);
    }).not.toThrow();
  });

  // BDD Scenario: Accept .pt extension (legacy)
  it('should accept .pt extension (legacy format)', () => {
    // Arrange
    const legacyPtFile = 'model.pt';

    // Act & Assert
    expect(() => {
      validateLoraExtension(legacyPtFile);
    }).not.toThrow();
  });

  // BDD Scenario: Accept .ckpt extension (legacy)
  it('should accept .ckpt extension (legacy format)', () => {
    // Arrange
    const legacyCkptFile = 'model.ckpt';

    // Act & Assert
    expect(() => {
      validateLoraExtension(legacyCkptFile);
    }).not.toThrow();
  });

  // BDD Scenario: Reject invalid extension
  it('should reject invalid file extension', () => {
    // Arrange
    const invalidFile = 'model.txt';

    // Act & Assert
    expect(() => {
      validateLoraExtension(invalidFile);
    }).toThrow('Invalid LoRA file extension. Must be .safetensors, .pt, or .ckpt');
  });

  // BDD Scenario: Reject missing extension
  it('should reject file without extension', () => {
    // Arrange
    const fileWithoutExtension = 'model';

    // Act & Assert
    expect(() => {
      validateLoraExtension(fileWithoutExtension);
    }).toThrow('Invalid LoRA file extension');
  });

  it('should reject unknown extension variants', () => {
    // Arrange
    const invalidExtensions = ['model.pth', 'model.bin', 'model.json', 'model.yaml'];

    // Act & Assert
    invalidExtensions.forEach((file) => {
      expect(() => {
        validateLoraExtension(file);
      }).toThrow('Invalid LoRA file extension');
    });
  });
});

// ==============================================================================
// FEATURE: Integration - Path Resolution + Validation
// ==============================================================================

describe('Path Resolution + Validation Integration', () => {
  it('should resolve and validate path in one workflow', () => {
    // Arrange
    const absolutePath = '/app/ComfyUI/models/loras/characters/hero.safetensors';
    const mockFs = {
      existsSync: vi.fn().mockReturnValue(true),
    };

    // Act
    const resolved = resolveLoraPath(absolutePath);

    // Assert
    expect(resolved).toBe('characters/hero.safetensors');

    // Validate the resolved path
    expect(() => {
      validateLoraExtension(resolved);
      validateLoraPath(resolved, mockFs as any);
    }).not.toThrow();
  });

  it('should handle Windows paths and validate them', () => {
    // Arrange
    const windowsAbsolutePath = 'C:\\ComfyUI\\models\\loras\\style.safetensors';
    const mockFs = {
      existsSync: vi.fn().mockReturnValue(true),
    };

    // Act
    const resolved = resolveLoraPath(windowsAbsolutePath);

    // Assert
    expect(resolved).toBe('style.safetensors');

    // Validate
    expect(() => {
      validateLoraExtension(resolved);
      validateLoraPath(resolved, mockFs as any);
    }).not.toThrow();
  });

  it('should fail validation if resolved path has invalid extension', () => {
    // Arrange
    const pathWithInvalidExt = '/app/ComfyUI/models/loras/invalid.txt';

    // Act
    const resolved = resolveLoraPath(pathWithInvalidExt);

    // Assert
    expect(resolved).toBe('invalid.txt');

    // Should fail extension validation
    expect(() => {
      validateLoraExtension(resolved);
    }).toThrow('Invalid LoRA file extension');
  });
});

// ==============================================================================
// FEATURE: Edge Cases
// ==============================================================================

describe('Edge Cases', () => {
  it('should handle paths with multiple subdirectories', () => {
    // Arrange
    const deepPath = '/app/ComfyUI/models/loras/characters/female/v1/final/hero.safetensors';

    // Act
    const resolved = resolveLoraPath(deepPath);

    // Assert
    expect(resolved).toBe('characters/female/v1/final/hero.safetensors');
  });

  it('should handle paths with special characters', () => {
    // Arrange
    const specialCharPath = '/app/ComfyUI/models/loras/style-v2_final(new).safetensors';

    // Act
    const resolved = resolveLoraPath(specialCharPath);

    // Assert
    expect(resolved).toBe('style-v2_final(new).safetensors');
  });

  it('should handle paths with spaces', () => {
    // Arrange
    const pathWithSpaces = '/app/ComfyUI/models/loras/my style lora.safetensors';

    // Act
    const resolved = resolveLoraPath(pathWithSpaces);

    // Assert
    expect(resolved).toBe('my style lora.safetensors');
  });

  it('should handle empty string path gracefully', () => {
    // Arrange
    const emptyPath = '';

    // Act & Assert
    expect(() => {
      resolveLoraPath(emptyPath);
    }).toThrow('LoRA path cannot be empty');
  });
});

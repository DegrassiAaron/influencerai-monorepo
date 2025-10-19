import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Provide Jest compatibility layer for legacy mocks
if (!(globalThis as { jest?: typeof vi }).jest) {
  (globalThis as { jest?: typeof vi }).jest = vi;
}

// Polyfill for Radix UI components (Select, DropdownMenu, etc.) in JSDOM
if (typeof Element.prototype.hasPointerCapture === 'undefined') {
  Element.prototype.hasPointerCapture = function () {
    return false;
  };
}

if (typeof Element.prototype.setPointerCapture === 'undefined') {
  Element.prototype.setPointerCapture = function () {
    // no-op
  };
}

if (typeof Element.prototype.releasePointerCapture === 'undefined') {
  Element.prototype.releasePointerCapture = function () {
    // no-op
  };
}

if (typeof Element.prototype.scrollIntoView === 'undefined') {
  Element.prototype.scrollIntoView = function () {
    // no-op
  };
}

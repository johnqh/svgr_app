import { vi } from "vitest";

vi.mock("@sudobility/svgr_lib", () => ({
  APP_NAME: "SVGR",
  APP_DOMAIN: "svgr.app",
  COMPANY_NAME: "Sudobility Inc.",
  DEFAULT_API_URL: "https://api.svgr.app",
  QUALITY_MIN: 1,
  QUALITY_MAX: 10,
  QUALITY_DEFAULT: 5,
  SUPPORTED_IMAGE_TYPES: [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/bmp",
    "image/gif",
  ],
  SUPPORTED_LANGUAGES: [],
  SUPPORTED_LANGUAGE_CODES: [],
  DEFAULT_LANGUAGE: "en",
  I18N_NAMESPACES: ["svgr", "auth"],
  DEFAULT_NAMESPACE: "svgr",
  LANGUAGE_HREFLANG_MAP: {},
  isValidImageType: (type: string) =>
    ["image/png", "image/jpeg", "image/webp", "image/bmp", "image/gif"].includes(type),
  getBaseName: (filename: string) => filename.replace(/\.[^.]+$/, ""),
  getSvgDimensions: vi.fn(),
  getSvgFileSize: vi.fn(),
  getSvgFileSizeKB: vi.fn(),
  useImageConverter: vi.fn(),
}));

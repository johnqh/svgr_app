# Job-Based Conversion System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the synchronous, in-memory conversion pipeline with a persistent job-based system so users can leave the page (or background the app) during conversion without losing their work.

**Architecture:** Images are uploaded and stored on the server's filesystem. Conversions run as async jobs tracked in PostgreSQL. The frontend polls for job completion, then displays a JPEG preview. SVG is fetched only on download. Old `/convert` and `/svg/:cacheId` endpoints remain for backward compatibility with existing apps.

**Tech Stack:** TypeScript, Hono (Bun), PostgreSQL (Drizzle ORM), Sharp, React 19, TanStack React Query 5, Firebase Auth (anonymous), Vitest

---

## File Structure

### svgr_types
| File | Action | Responsibility |
|------|--------|---------------|
| `src/index.ts` | Edit | Add `ImageUploadResult`, `JobResult`, `CreateJobRequest`, `JobStatus` types |

### svgr_api
| File | Action | Responsibility |
|------|--------|---------------|
| `src/db/index.ts` | Edit | Add `images` + `jobs` table creation SQL |
| `src/db/schema.ts` | Edit | Add Drizzle schema definitions for `images` and `jobs` |
| `src/services/file-storage.ts` | **New** | Filesystem CRUD for uploads/svg/preview dirs |
| `src/services/conversion-pipeline.ts` | **New** | Extracted 7-stage conversion from `convert.ts` |
| `src/services/job-processor.ts` | **New** | Async job runner: pipeline → save files → update DB |
| `src/services/settings-hash.ts` | **New** | Canonical settings → SHA-256 for dedup |
| `src/services/api-version.ts` | **New** | Reads + caches version from package.json |
| `src/routes/images.ts` | **New** | `POST /api/v1/images/upload` |
| `src/routes/jobs.ts` | **New** | `POST /api/v1/jobs`, `GET /api/v1/jobs/:jobId`, `GET /api/v1/jobs` |
| `src/routes/files.ts` | **New** | `GET /api/v1/files/:filename` (auth-gated file serving) |
| `src/schemas/index.ts` | Edit | Add `createJobRequestSchema` Zod schema |
| `src/index.ts` | Edit | Mount new routes (keep old `/convert` + `/svg` routes) |
| `src/routes/convert.ts` | Edit | Refactor to call `runConversionPipeline` instead of inline logic |
| `src/routes/convert-utils.ts` | Keep | Used by conversion-pipeline.ts |
| `src/routes/svg.ts` | Keep | Backward compat for existing apps |
| `src/services/svg-cache.ts` | Keep | Still used by old `/convert` endpoint |

### svgr_client
| File | Action | Responsibility |
|------|--------|---------------|
| `src/network/SvgrClient.ts` | Edit | Add `uploadImage`, `createJob`, `getJobStatus`, `getJobsForImage`, `fetchFile` |
| `src/hooks/query-keys.ts` | Edit | Add `jobs`, `job`, `imageJobs` keys |
| `src/hooks/useUploadImage.ts` | **New** | `useMutation` for image upload |
| `src/hooks/useCreateJob.ts` | **New** | `useMutation` for job creation |
| `src/hooks/useJobStatus.ts` | **New** | `useQuery` with polling for job status |
| `src/hooks/useImageJobs.ts` | **New** | `useQuery` for all jobs of an image |
| `src/hooks/index.ts` | Edit | Export new hooks |
| `src/index.ts` | Edit | Export new hooks + types |

### svgr_lib
| File | Action | Responsibility |
|------|--------|---------------|
| `src/hooks/useImageConverter.ts` | Edit | Major rework: upload → job → poll → preview |
| `src/index.ts` | Edit | Export new types |

### svgr_app
| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/providers/AuthProviderWrapper.tsx` | Edit | `enableAnonymous: true` |
| `src/pages/ConvertPage.tsx` | Edit | New upload → convert → poll → preview flow |
| `src/components/SvgPreviewPanel.tsx` | Edit | Show JPEG preview, fetch SVG on download |
| `src/components/ConvertButton.tsx` | Edit | Handle upload state |
| `src/components/ImageUploadPanel.tsx` | Edit | Upload progress indicator |
| `src/components/JobHistoryList.tsx` | **New** | List of conversion jobs per image |

---

## Task 1: svgr_types — Add Job Types

**Files:**
- Modify: `/Users/johnhuang/projects/svgr_types/src/index.ts`
- Test: `/Users/johnhuang/projects/svgr_types/src/index.test.ts`

- [ ] **Step 1: Write tests for new types**

Add to `/Users/johnhuang/projects/svgr_types/src/index.test.ts`:

```typescript
describe("Job types", () => {
  it("JobStatus type covers all states", () => {
    const statuses: JobStatus[] = ["pending", "processing", "done", "error"];
    expect(statuses).toHaveLength(4);
  });

  it("CreateJobRequest requires imageId", () => {
    const req: CreateJobRequest = { imageId: "test-id" };
    expect(req.imageId).toBe("test-id");
    expect(req.quality).toBeUndefined();
  });

  it("JobResult has required fields", () => {
    const job: JobResult = {
      jobId: "j1",
      imageId: "i1",
      status: "done",
      quality: 5,
      transparentBg: false,
      ocr: true,
      mergePaths: true,
      smooth: 0,
      imageType: "auto",
      apiVersion: "1.0.52",
      createdAt: new Date().toISOString(),
    };
    expect(job.status).toBe("done");
    expect(job.svgFilename).toBeUndefined();
  });

  it("ImageUploadResult has required fields", () => {
    const result: ImageUploadResult = {
      imageId: "i1",
      originalFilename: "photo.png",
      width: 800,
      height: 600,
      fileSizeBytes: 12345,
    };
    expect(result.imageId).toBe("i1");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/johnhuang/projects/svgr_types && bun test`
Expected: FAIL — `JobStatus`, `CreateJobRequest`, `JobResult`, `ImageUploadResult` not found

- [ ] **Step 3: Add new type definitions**

Add to `/Users/johnhuang/projects/svgr_types/src/index.ts`, after the existing `ConvertResponse` type:

```typescript
// ── Image Upload ──

/** Result of uploading an image to the server for persistent storage. */
export interface ImageUploadResult {
  /** Server-assigned image UUID. */
  imageId: string;
  /** The user's original filename. */
  originalFilename: string;
  /** Natural pixel width. */
  width: number;
  /** Natural pixel height. */
  height: number;
  /** File size in bytes. */
  fileSizeBytes: number;
}

/** Response from POST /api/v1/images/upload. */
export type ImageUploadResponse = BaseResponse<ImageUploadResult>;

// ── Jobs ──

/** Status of a conversion job. */
export type JobStatus = "pending" | "processing" | "done" | "error";

/** Request body for POST /api/v1/jobs. */
export interface CreateJobRequest {
  /** UUID of the previously uploaded image. */
  imageId: string;
  /** Vectorization quality 1-10. Default: 5. */
  quality?: number;
  /** Remove background path. Default: false. */
  transparentBg?: boolean;
  /** Run OCR text recognition. Default: true. */
  ocr?: boolean;
  /** Merge small vector paths. Default: true. */
  mergePaths?: boolean;
  /** Smoothing level 0-3. Default: 0. */
  smooth?: number;
  /** Image preprocessing profile. Default: 'auto'. */
  imageType?: ImageType;
}

/** A conversion job record returned by job endpoints. */
export interface JobResult {
  jobId: string;
  imageId: string;
  status: JobStatus;
  errorMessage?: string;
  quality: number;
  transparentBg: boolean;
  ocr: boolean;
  mergePaths: boolean;
  smooth: number;
  imageType: string;
  apiVersion: string;
  svgFilename?: string;
  previewFilename?: string;
  svgWidth?: number;
  svgHeight?: number;
  dedupJobId?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

/** Response from POST /api/v1/jobs. */
export type CreateJobResponse = BaseResponse<JobResult>;

/** Response from GET /api/v1/jobs/:jobId. */
export type JobStatusResponse = BaseResponse<JobResult>;

/** Response from GET /api/v1/jobs?imageId=... */
export type JobListResponse = BaseResponse<JobResult[]>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/johnhuang/projects/svgr_types && bun test`
Expected: PASS

- [ ] **Step 5: Run verify and commit**

Run: `cd /Users/johnhuang/projects/svgr_types && bun run verify`
Expected: typecheck + lint + test + build all pass

```bash
cd /Users/johnhuang/projects/svgr_types
git add src/index.ts src/index.test.ts
git commit -m "feat: add job-based conversion types (ImageUploadResult, JobResult, CreateJobRequest)"
```

---

## Task 2: svgr_api — Database Schema

**Files:**
- Modify: `/Users/johnhuang/projects/svgr_api/src/db/index.ts`
- Modify: `/Users/johnhuang/projects/svgr_api/src/db/schema.ts`

- [ ] **Step 1: Add Drizzle schema definitions for images and jobs**

Add to `/Users/johnhuang/projects/svgr_api/src/db/schema.ts`:

```typescript
import {
  pgSchema,
  varchar,
  timestamp,
  serial,
  uuid,
  integer,
  boolean,
  text,
} from "drizzle-orm/pg-core";

export const svgrSchema = pgSchema("svgr");

export const users = svgrSchema.table("users", {
  id: serial("id").primaryKey(),
  firebase_uid: varchar("firebase_uid", { length: 128 }).notNull().unique(),
  email: varchar("email", { length: 255 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const images = svgrSchema.table("images", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: varchar("user_id", { length: 128 }).notNull(),
  original_filename: varchar("original_filename", { length: 500 }),
  storage_filename: varchar("storage_filename", { length: 255 }).notNull().unique(),
  mime_type: varchar("mime_type", { length: 50 }).notNull(),
  file_size_bytes: integer("file_size_bytes").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  sha256: varchar("sha256", { length: 64 }).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const jobs = svgrSchema.table("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  image_id: uuid("image_id").notNull().references(() => images.id),
  user_id: varchar("user_id", { length: 128 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  error_message: text("error_message"),
  quality: integer("quality").notNull().default(5),
  transparent_bg: boolean("transparent_bg").notNull().default(false),
  ocr: boolean("ocr").notNull().default(true),
  merge_paths: boolean("merge_paths").notNull().default(true),
  smooth: integer("smooth").notNull().default(0),
  image_type: varchar("image_type", { length: 50 }).notNull().default("auto"),
  settings_hash: varchar("settings_hash", { length: 64 }).notNull(),
  api_version: varchar("api_version", { length: 20 }).notNull(),
  svg_filename: varchar("svg_filename", { length: 255 }),
  preview_filename: varchar("preview_filename", { length: 255 }),
  svg_width: integer("svg_width"),
  svg_height: integer("svg_height"),
  dedup_job_id: uuid("dedup_job_id"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  started_at: timestamp("started_at"),
  completed_at: timestamp("completed_at"),
});
```

- [ ] **Step 2: Add raw SQL table creation to initDatabase()**

Add to `initDatabase()` in `/Users/johnhuang/projects/svgr_api/src/db/index.ts`, after the `consumable_usages` table:

```typescript
  // Create images table
  await client`
    CREATE TABLE IF NOT EXISTS svgr.images (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(128) NOT NULL,
      original_filename VARCHAR(500),
      storage_filename VARCHAR(255) NOT NULL UNIQUE,
      mime_type VARCHAR(50) NOT NULL,
      file_size_bytes INTEGER NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      sha256 VARCHAR(64) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;
  await client`CREATE INDEX IF NOT EXISTS idx_images_user ON svgr.images (user_id, created_at DESC)`;
  await client`CREATE INDEX IF NOT EXISTS idx_images_sha256 ON svgr.images (user_id, sha256)`;

  // Create jobs table
  await client`
    CREATE TABLE IF NOT EXISTS svgr.jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      image_id UUID NOT NULL REFERENCES svgr.images(id),
      user_id VARCHAR(128) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      error_message TEXT,
      quality INTEGER NOT NULL DEFAULT 5,
      transparent_bg BOOLEAN NOT NULL DEFAULT false,
      ocr BOOLEAN NOT NULL DEFAULT true,
      merge_paths BOOLEAN NOT NULL DEFAULT true,
      smooth INTEGER NOT NULL DEFAULT 0,
      image_type VARCHAR(50) NOT NULL DEFAULT 'auto',
      settings_hash VARCHAR(64) NOT NULL,
      api_version VARCHAR(20) NOT NULL,
      svg_filename VARCHAR(255),
      preview_filename VARCHAR(255),
      svg_width INTEGER,
      svg_height INTEGER,
      dedup_job_id UUID,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      started_at TIMESTAMP,
      completed_at TIMESTAMP
    )
  `;
  await client`CREATE INDEX IF NOT EXISTS idx_jobs_user ON svgr.jobs (user_id, created_at DESC)`;
  await client`CREATE INDEX IF NOT EXISTS idx_jobs_image ON svgr.jobs (image_id, created_at DESC)`;
  await client`CREATE INDEX IF NOT EXISTS idx_jobs_dedup ON svgr.jobs (image_id, settings_hash, api_version) WHERE status = 'done'`;
```

- [ ] **Step 3: Verify typecheck passes**

Run: `cd /Users/johnhuang/projects/svgr_api && bun run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd /Users/johnhuang/projects/svgr_api
git add src/db/index.ts src/db/schema.ts
git commit -m "feat: add images and jobs database tables"
```

---

## Task 3: svgr_api — File Storage Service

**Files:**
- Create: `/Users/johnhuang/projects/svgr_api/src/services/file-storage.ts`
- Create: `/Users/johnhuang/projects/svgr_api/src/services/file-storage.test.ts`

- [ ] **Step 1: Write tests**

Create `/Users/johnhuang/projects/svgr_api/src/services/file-storage.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import {
  ensureDataDirs,
  saveUpload,
  saveSvg,
  getFilePath,
  readFile,
  UPLOAD_DIR,
  SVG_DIR,
  PREVIEW_DIR,
} from "./file-storage";

// Override DATA_DIR for tests
let testDataDir: string;

describe("file-storage", () => {
  beforeEach(async () => {
    testDataDir = await mkdtemp(join(tmpdir(), "svgr-test-"));
    // Override module-level DATA_DIR via env
    process.env.DATA_DIR = testDataDir;
  });

  afterEach(async () => {
    await rm(testDataDir, { recursive: true, force: true });
    delete process.env.DATA_DIR;
  });

  it("ensureDataDirs creates subdirectories", async () => {
    await ensureDataDirs();
    const { existsSync } = await import("fs");
    expect(existsSync(join(testDataDir, "uploads"))).toBe(true);
    expect(existsSync(join(testDataDir, "svg"))).toBe(true);
    expect(existsSync(join(testDataDir, "preview"))).toBe(true);
  });

  it("saveUpload writes file and returns UUID filename", async () => {
    await ensureDataDirs();
    const buffer = Buffer.from("fake-image-data");
    const filename = await saveUpload(buffer, ".png");
    expect(filename).toMatch(/^[0-9a-f-]+\.png$/);
    const content = await readFile(filename);
    expect(content).not.toBeNull();
    expect(content!.toString()).toBe("fake-image-data");
  });

  it("saveSvg writes SVG and returns UUID filename", async () => {
    await ensureDataDirs();
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
    const filename = await saveSvg(svg);
    expect(filename).toMatch(/^[0-9a-f-]+\.svg$/);
    const content = await readFile(filename);
    expect(content!.toString()).toBe(svg);
  });

  it("getFilePath resolves by extension", async () => {
    await ensureDataDirs();
    expect(getFilePath("abc.svg")).toBe(join(testDataDir, "svg", "abc.svg"));
    expect(getFilePath("abc.jpg")).toBe(join(testDataDir, "preview", "abc.jpg"));
    expect(getFilePath("abc.png")).toBe(join(testDataDir, "uploads", "abc.png"));
  });

  it("readFile returns null for missing file", async () => {
    await ensureDataDirs();
    const result = await readFile("nonexistent.svg");
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/johnhuang/projects/svgr_api && bun test src/services/file-storage.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement file-storage.ts**

Create `/Users/johnhuang/projects/svgr_api/src/services/file-storage.ts`:

```typescript
import { mkdir } from "fs/promises";
import { join, extname } from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";

function getDataDir(): string {
  return process.env.DATA_DIR || join(process.cwd(), "data");
}

export function getUploadDir(): string {
  return join(getDataDir(), "uploads");
}

export function getSvgDir(): string {
  return join(getDataDir(), "svg");
}

export function getPreviewDir(): string {
  return join(getDataDir(), "preview");
}

// Re-export for test convenience
export const UPLOAD_DIR = "uploads";
export const SVG_DIR = "svg";
export const PREVIEW_DIR = "preview";

/** Create data directories if they don't exist. Call on startup. */
export async function ensureDataDirs(): Promise<void> {
  const dataDir = getDataDir();
  await mkdir(join(dataDir, "uploads"), { recursive: true });
  await mkdir(join(dataDir, "svg"), { recursive: true });
  await mkdir(join(dataDir, "preview"), { recursive: true });
}

/** Save an uploaded image buffer. Returns the storage filename (uuid.ext). */
export async function saveUpload(
  buffer: Buffer,
  ext: string
): Promise<string> {
  const filename = `${randomUUID()}${ext}`;
  const filePath = join(getUploadDir(), filename);
  await Bun.write(filePath, buffer);
  return filename;
}

/** Save an SVG string. Returns the filename (uuid.svg). */
export async function saveSvg(svg: string): Promise<string> {
  const filename = `${randomUUID()}.svg`;
  const filePath = join(getSvgDir(), filename);
  await Bun.write(filePath, svg);
  return filename;
}

/** Render an SVG to JPEG at the given dimensions. Returns the filename (uuid.jpg). */
export async function savePreview(
  svg: string,
  width: number,
  height: number
): Promise<string> {
  const filename = `${randomUUID()}.jpg`;
  const filePath = join(getPreviewDir(), filename);

  const jpegBuffer = await sharp(Buffer.from(svg))
    .resize(width, height, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .jpeg({ quality: 85 })
    .toBuffer();

  await Bun.write(filePath, jpegBuffer);
  return filename;
}

/** Resolve a filename to its full filesystem path based on extension. */
export function getFilePath(filename: string): string {
  const ext = extname(filename).toLowerCase();
  const dataDir = getDataDir();
  if (ext === ".svg") return join(dataDir, "svg", filename);
  if (ext === ".jpg" || ext === ".jpeg") return join(dataDir, "preview", filename);
  return join(dataDir, "uploads", filename);
}

/** Read a file by filename. Returns null if not found. */
export async function readFile(filename: string): Promise<Buffer | null> {
  const filePath = getFilePath(filename);
  try {
    const file = Bun.file(filePath);
    if (!(await file.exists())) return null;
    const arrayBuffer = await file.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/johnhuang/projects/svgr_api && bun test src/services/file-storage.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/johnhuang/projects/svgr_api
git add src/services/file-storage.ts src/services/file-storage.test.ts
git commit -m "feat: add file storage service for persistent uploads/svg/preview"
```

---

## Task 4: svgr_api — Settings Hash & API Version

**Files:**
- Create: `/Users/johnhuang/projects/svgr_api/src/services/settings-hash.ts`
- Create: `/Users/johnhuang/projects/svgr_api/src/services/settings-hash.test.ts`
- Create: `/Users/johnhuang/projects/svgr_api/src/services/api-version.ts`
- Create: `/Users/johnhuang/projects/svgr_api/src/services/api-version.test.ts`

- [ ] **Step 1: Write tests for settings-hash**

Create `/Users/johnhuang/projects/svgr_api/src/services/settings-hash.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { computeSettingsHash } from "./settings-hash";

describe("computeSettingsHash", () => {
  it("produces consistent hash for same settings", () => {
    const hash1 = computeSettingsHash({ imageId: "x", quality: 5, ocr: true });
    const hash2 = computeSettingsHash({ imageId: "x", quality: 5, ocr: true });
    expect(hash1).toBe(hash2);
  });

  it("ignores imageId (not a conversion setting)", () => {
    const hash1 = computeSettingsHash({ imageId: "a", quality: 5 });
    const hash2 = computeSettingsHash({ imageId: "b", quality: 5 });
    expect(hash1).toBe(hash2);
  });

  it("normalizes defaults", () => {
    const hash1 = computeSettingsHash({ imageId: "x" });
    const hash2 = computeSettingsHash({
      imageId: "x",
      quality: 5,
      transparentBg: false,
      ocr: true,
      mergePaths: true,
      smooth: 0,
      imageType: "auto",
    });
    expect(hash1).toBe(hash2);
  });

  it("different quality produces different hash", () => {
    const hash1 = computeSettingsHash({ imageId: "x", quality: 5 });
    const hash2 = computeSettingsHash({ imageId: "x", quality: 8 });
    expect(hash1).not.toBe(hash2);
  });

  it("returns a 64-char hex string (SHA-256)", () => {
    const hash = computeSettingsHash({ imageId: "x" });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/johnhuang/projects/svgr_api && bun test src/services/settings-hash.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement settings-hash.ts**

Create `/Users/johnhuang/projects/svgr_api/src/services/settings-hash.ts`:

```typescript
import { createHash } from "crypto";
import type { CreateJobRequest } from "@sudobility/svgr_types";

/**
 * Compute a SHA-256 hash of the conversion settings for dedup.
 * Normalizes defaults and sorts keys for consistency.
 * Excludes imageId since it's not a conversion parameter.
 */
export function computeSettingsHash(request: CreateJobRequest): string {
  const canonical = JSON.stringify({
    imageType: request.imageType ?? "auto",
    mergePaths: request.mergePaths ?? true,
    ocr: request.ocr ?? true,
    quality: request.quality ?? 5,
    smooth: request.smooth ?? 0,
    transparentBg: request.transparentBg ?? false,
  });
  return createHash("sha256").update(canonical).digest("hex");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/johnhuang/projects/svgr_api && bun test src/services/settings-hash.test.ts`
Expected: PASS

- [ ] **Step 5: Write tests for api-version**

Create `/Users/johnhuang/projects/svgr_api/src/services/api-version.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { getApiVersion } from "./api-version";

describe("getApiVersion", () => {
  it("returns a semver-like string", () => {
    const version = getApiVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("returns same value on repeated calls (cached)", () => {
    const v1 = getApiVersion();
    const v2 = getApiVersion();
    expect(v1).toBe(v2);
  });
});
```

- [ ] **Step 6: Implement api-version.ts**

Create `/Users/johnhuang/projects/svgr_api/src/services/api-version.ts`:

```typescript
import { readFileSync } from "fs";
import { join } from "path";

let cachedVersion: string | null = null;

/** Read the API version from package.json. Cached after first call. */
export function getApiVersion(): string {
  if (cachedVersion) return cachedVersion;
  const pkgPath = join(import.meta.dir, "../../package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  cachedVersion = pkg.version;
  return cachedVersion!;
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd /Users/johnhuang/projects/svgr_api && bun test src/services/settings-hash.test.ts src/services/api-version.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
cd /Users/johnhuang/projects/svgr_api
git add src/services/settings-hash.ts src/services/settings-hash.test.ts src/services/api-version.ts src/services/api-version.test.ts
git commit -m "feat: add settings hash and API version services for job dedup"
```

---

## Task 5: svgr_api — Extract Conversion Pipeline

**Files:**
- Create: `/Users/johnhuang/projects/svgr_api/src/services/conversion-pipeline.ts`
- Modify: `/Users/johnhuang/projects/svgr_api/src/routes/convert.ts`

This is the most complex extraction. The goal is to move the core conversion logic (lines 119-533 of convert.ts) into a standalone function, then call it from both the old `/convert` route (backward compat) and the new job processor.

- [ ] **Step 1: Create conversion-pipeline.ts**

Create `/Users/johnhuang/projects/svgr_api/src/services/conversion-pipeline.ts`:

```typescript
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { unlink, stat } from "fs/promises";
import sharp from "sharp";
import type { ImageType } from "@sudobility/svgr_types";
import { resolveImageTypeConfig } from "../config/image-type-config";
import { convertWithVtracer } from "./vtracer";
import { refineSvgColors } from "./color-refine";
import { detectText, type OcrLine } from "./ocr";
import { matchFontForLine, type FontMatchResult } from "./font-match";
import {
  buildTextElement,
  buildTextClipPath,
  findPathsToSuppress,
} from "./text-overlay";
import { inpaintTextRegionsBuffer } from "./text-inpaint";
import { ycbcrPipelineFromBuffer } from "./ycbcr-pipeline";
import {
  detectImageClassificationFromBuffer,
  type ImageClassification,
} from "./image-type-detect";
import {
  detectExtension,
  formatImageClassificationLog,
  getEffectiveMergePaths,
  getTraceSmoothLevel,
  removeTopLevelBackgroundPath,
  shouldRunColorRefinement,
  shouldUseYcbcrReduction,
  shouldApplySvgBlur,
} from "../routes/convert-utils";

export interface ConversionParams {
  /** Path to the image file on disk. */
  imagePath: string;
  quality: number;
  smooth: number;
  transparentBg: boolean;
  ocr: boolean;
  mergePaths: boolean;
  imageType: ImageType;
}

export interface ConversionResult {
  svg: string;
  width: number;
  height: number;
}

/** Check if the image format has an alpha channel (transparency). */
function hasAlphaChannel(buffer: Buffer, ext: string): boolean {
  if (ext === ".png" && buffer.length > 25) {
    const colorType = buffer[25];
    return colorType === 4 || colorType === 6;
  }
  if (ext === ".gif") return true;
  if (ext === ".webp" && buffer.length > 20) {
    const isVP8X =
      buffer[12] === 0x56 &&
      buffer[13] === 0x50 &&
      buffer[14] === 0x38 &&
      buffer[15] === 0x58;
    if (isVP8X) return (buffer[20] & 0x10) !== 0;
    const isVP8L =
      buffer[12] === 0x56 &&
      buffer[13] === 0x50 &&
      buffer[14] === 0x38 &&
      buffer[15] === 0x4c;
    if (isVP8L) return true;
  }
  return false;
}

/**
 * Run the full 7-stage image-to-SVG conversion pipeline.
 *
 * Stages:
 * 1. Load image, classify type
 * 2. OCR text detection + verification
 * 3. Text inpainting
 * 4. YCbCr reduction (photos)
 * 5. vtracer vectorization
 * 6. Color refinement
 * 7. Text overlay, background removal, blur
 */
export async function runConversionPipeline(
  params: ConversionParams
): Promise<ConversionResult> {
  const {
    imagePath,
    quality,
    smooth: smoothLevel,
    transparentBg,
    ocr,
    mergePaths,
    imageType,
  } = params;

  let tmpOutput: string | null = null;
  let tmpReduced: string | null = null;
  let tmpInpainted: string | null = null;

  try {
    const t0 = performance.now();

    // Read the image file
    const buffer = Buffer.from(await Bun.file(imagePath).arrayBuffer());
    const ext = detectExtension(buffer);

    const tWrite = performance.now();

    // Load image — shared by OCR, inpainting, and YCbCr
    const { data: imgData, info: imgInfo } = await sharp(imagePath)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .toColourspace("srgb")
      .raw()
      .toBuffer({ resolveWithObject: true });
    const imgW = imgInfo.width;
    const imgH = imgInfo.height;
    const imgCh = imgInfo.channels;

    // Image type detection
    const classificationPromise: Promise<ImageClassification> =
      imageType === "auto"
        ? detectImageClassificationFromBuffer(imgData, imgW, imgH)
        : Promise.resolve({
            imageType,
            aiGenerated: false,
            metrics: undefined,
          });
    const classification = await classificationPromise;
    const effectiveType = classification.imageType as ImageType;
    if (imageType === "auto") {
      console.log(
        formatImageClassificationLog(
          effectiveType,
          classification.aiGenerated,
          classification.metrics
        )
      );
    }
    const effectiveConfig = resolveImageTypeConfig(
      effectiveType,
      classification.aiGenerated
    );
    const ocrConfig = effectiveConfig.ocr;
    const ocrPromise = ocr
      ? detectText(
          imagePath,
          effectiveConfig.ocrPreprocess,
          effectiveConfig.ocrTesseract
        )
      : Promise.resolve(null);

    // ── Phase 1: OCR detection + verification ──
    const verifiedLines: Array<{ line: OcrLine; font: FontMatchResult }> = [];
    let ocrInfo = "";

    if (ocr) {
      const ocrResult = await ocrPromise;
      if (ocrResult && ocrResult.lines.length > 0) {
        const acceptedLines = ocrResult.lines.filter(
          l => l.confidence >= ocrConfig.minOverlayConfidence
        );

        if (acceptedLines.length > 0) {
          const fontResults = await Promise.all(
            acceptedLines.map(line =>
              matchFontForLine(
                line,
                imgData,
                imgW,
                imgH,
                imgCh,
                effectiveConfig.fontMatch
              )
            )
          );

          for (let i = 0; i < acceptedLines.length; i++) {
            const font = fontResults[i];
            const line = acceptedLines[i];

            const text = line.text;
            const decoded = text
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'");
            if (/&[a-z]+;/i.test(decoded)) {
              console.warn(
                `[ocr] Rejecting "${text}" — contains unknown HTML entities`
              );
              continue;
            }
            line.text = decoded.replace(
              /(?<=[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}])\s+(?=[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}])/gu,
              ""
            );
            const stripped = decoded.replace(/\s/g, "");
            const letterDigitCount = (stripped.match(/\p{L}|\p{N}/gu) || [])
              .length;
            const letterDigitRatio =
              letterDigitCount / Math.max(1, stripped.length);

            if (letterDigitCount === 0) {
              console.warn(
                `[ocr] Rejecting "${text}" — no letter or digit characters`
              );
              continue;
            }
            if (
              stripped.length >= 3 &&
              letterDigitRatio < ocrConfig.lineLetterDigitRatioMin
            ) {
              console.warn(
                `[ocr] Rejecting "${text}" — letter/digit ratio ${letterDigitRatio.toFixed(2)} < ${ocrConfig.lineLetterDigitRatioMin}`
              );
              continue;
            }
            const hasNonLatin =
              /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}|\p{Script=Arabic}|\p{Script=Devanagari}|\p{Script=Thai}|\p{Script=Cyrillic}/u.test(
                decoded
              );
            const minConfForSize = hasNonLatin
              ? font.fontSize >= 30
                ? ocrConfig.nonLatinFontConfidence.large
                : font.fontSize >= 18
                  ? ocrConfig.nonLatinFontConfidence.medium
                  : font.fontSize >= 12
                    ? ocrConfig.nonLatinFontConfidence.small
                    : ocrConfig.nonLatinFontConfidence.tiny
              : font.fontSize >= 30
                ? ocrConfig.latinFontConfidence.large
                : font.fontSize >= 18
                  ? ocrConfig.latinFontConfidence.medium
                  : font.fontSize >= 12
                    ? ocrConfig.latinFontConfidence.small
                    : ocrConfig.latinFontConfidence.tiny;
            if (line.confidence < minConfForSize) {
              console.warn(
                `[ocr] Rejecting "${text}" — fontSize ${font.fontSize}px requires confidence ${minConfForSize}, got ${Math.round(line.confidence)}`
              );
              continue;
            }

            if (!font.fitsBbox) continue;

            if (ocrConfig.requireUniformBackground && !font.bgUniform) {
              console.warn(
                `[ocr] Skipping "${text}" — non-uniform background`
              );
              continue;
            }

            if (font.renderScore === 0 && font.overlapScore === 0) {
              if (
                text.length >= ocrConfig.fallbackTextLengthMin &&
                line.confidence >= ocrConfig.fallbackConfidenceMin
              ) {
                console.log(
                  `[ocr] Accepted "${text}" — render failed, fallback to confidence ${Math.round(line.confidence)}`
                );
                verifiedLines.push({ line, font });
                continue;
              }
              console.warn(
                `[ocr] Rejecting "${text}" — render failed, too short or low confidence`
              );
              continue;
            }

            if (font.renderScore < ocrConfig.minRenderScore) {
              console.warn(
                `[ocr] Rejecting "${text}" — render ${font.renderScore.toFixed(3)} < ${ocrConfig.minRenderScore}`
              );
              continue;
            }

            const wordCount = line.text.split(/\s+/).length;
            let overlapThreshold = ocrConfig.minOverlapScore;
            if (font.fontSize <= 12) {
              overlapThreshold *= ocrConfig.smallFontOverlapMultiplier;
            }
            if (wordCount >= 3) {
              overlapThreshold *= ocrConfig.multiWordOverlapMultiplier;
            }
            if (font.overlapScore < overlapThreshold) {
              console.warn(
                `[ocr] Rejecting "${text}" — overlap ${font.overlapScore.toFixed(3)} < ${overlapThreshold} (fontSize=${font.fontSize})`
              );
              continue;
            }
            console.log(
              `[ocr] Accepted "${line.text}" — render ${font.renderScore.toFixed(3)}, overlap ${font.overlapScore.toFixed(3)}, fontSize=${font.fontSize}, conf=${Math.round(line.confidence)}`
            );
            verifiedLines.push({ line, font });
          }
        }

        ocrInfo =
          `ocr: ${ocrResult.lines.length} detected, ${verifiedLines.length} verified, ` +
          `${ocrResult.metrics.detectionMs}ms | `;
      }
    }

    const tOcr = performance.now();

    // ── Phase 2: Remove verified text from image before vectorization ──
    let vectorizeData = imgData;
    let refineImagePath = imagePath;
    if (verifiedLines.length > 0) {
      vectorizeData = inpaintTextRegionsBuffer(
        imgData,
        imgW,
        imgH,
        verifiedLines.map(v => v.line)
      );
      tmpInpainted = join(tmpdir(), `svgr-inpaint-${randomUUID()}.png`);
      await sharp(vectorizeData, {
        raw: { width: imgW, height: imgH, channels: 3 },
      })
        .png()
        .toFile(tmpInpainted);
      refineImagePath = tmpInpainted;
    }

    // ── Phase 3: Vectorize ──
    const useYcbcrReduction = shouldUseYcbcrReduction(effectiveConfig);
    const traceInputPath = useYcbcrReduction
      ? await ycbcrPipelineFromBuffer(
          vectorizeData,
          imgW,
          imgH,
          quality,
          effectiveConfig.ycbcr
        )
      : refineImagePath;
    tmpReduced = useYcbcrReduction ? traceInputPath : null;

    tmpOutput = await convertWithVtracer(
      traceInputPath,
      quality,
      getTraceSmoothLevel(smoothLevel, effectiveConfig),
      useYcbcrReduction,
      effectiveConfig
    );

    const tVtracer = performance.now();

    // Read SVG output
    let svg = await Bun.file(tmpOutput).text();

    const shouldRefine = shouldRunColorRefinement(
      effectiveConfig,
      verifiedLines.length
    );
    const refineResult = shouldRefine
      ? await refineSvgColors(svg, refineImagePath, {
          mergePaths: getEffectiveMergePaths(mergePaths, effectiveConfig),
          quality,
          imageTypeConfig: effectiveConfig,
        })
      : { svg, idMapData: null };
    svg = refineResult.svg;

    const tRefine = performance.now();

    // ── Phase 4: Suppress traced text paths + insert text elements ──
    if (verifiedLines.length > 0) {
      const suppressSet = await findPathsToSuppress(
        svg,
        verifiedLines.map(v => v.line),
        refineResult.idMapData,
        effectiveConfig.textSuppression
      );
      if (suppressSet.size > 0) {
        const pathRegex = /<path\s[^>]*?\/?>/g;
        let pathIdx = 0;
        svg = svg.replace(pathRegex, match =>
          suppressSet.has(pathIdx++) ? "" : match
        );
      }

      const textClips = verifiedLines.map(({ line }, idx) =>
        buildTextClipPath(line, `ocr-clip-${idx}`)
      );
      const textElements = verifiedLines.map(({ line, font }, idx) =>
        buildTextElement(line, font, `ocr-clip-${idx}`)
      );

      if (textClips.length > 0) {
        const defsBlock = `<defs>${textClips.join("")}</defs>`;
        svg = svg.replace(/(<svg[^>]*>)/, `$1${defsBlock}`);
      }
      const textBlock = textElements.join("\n");
      svg = svg.replace("</svg>", `${textBlock}\n</svg>`);
    }

    console.log(
      `[perf] load: ${(tWrite - t0).toFixed(1)}ms | ` +
        `${ocrInfo}` +
        `vtracer: ${(tVtracer - tOcr).toFixed(1)}ms | ` +
        `color-refine: ${(tRefine - tVtracer).toFixed(1)}ms | ` +
        `total: ${(tRefine - t0).toFixed(1)}ms | ` +
        `type: ${effectiveType}`
    );

    // Remove background if requested and original has no alpha
    if (transparentBg && !hasAlphaChannel(buffer, ext)) {
      svg = removeTopLevelBackgroundPath(svg);
    }

    // Apply SVG blur for smooth mode
    if (shouldApplySvgBlur(smoothLevel, effectiveConfig)) {
      const SMOOTH_BLUR_STD_DEV = [0, 0.3, 0.6, 1.0];
      const stdDev = SMOOTH_BLUR_STD_DEV[smoothLevel] || 0;
      const filterDef = `<defs><filter id="smooth"><feGaussianBlur stdDeviation="${stdDev}"/></filter></defs>`;
      svg = svg.replace(
        /(<svg[^>]*>)/,
        `$1${filterDef}<g filter="url(#smooth)">`
      );
      svg = svg.replace(/<\/svg>/, "</g></svg>");
    }

    // Extract dimensions
    let width = 0;
    let height = 0;
    const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
    if (viewBoxMatch) {
      const parts = viewBoxMatch[1].split(/[\s,]+/).map(Number);
      if (parts.length === 4) {
        width = parts[2];
        height = parts[3];
      }
    }
    if (width === 0 || height === 0) {
      const widthMatch = svg.match(/<svg[^>]*\bwidth="(\d+(?:\.\d+)?)"/);
      const heightMatch = svg.match(/<svg[^>]*\bheight="(\d+(?:\.\d+)?)"/);
      if (widthMatch) width = Math.round(Number(widthMatch[1]));
      if (heightMatch) height = Math.round(Number(heightMatch[1]));
    }

    return { svg, width, height };
  } finally {
    // Clean up temp files (not the input — caller owns it)
    if (tmpOutput) await unlink(tmpOutput).catch(() => {});
    if (tmpReduced) await unlink(tmpReduced).catch(() => {});
    if (tmpInpainted) await unlink(tmpInpainted).catch(() => {});
  }
}
```

- [ ] **Step 2: Refactor convert.ts to use runConversionPipeline**

Replace the conversion logic in `/Users/johnhuang/projects/svgr_api/src/routes/convert.ts` (lines 103-533) with a call to `runConversionPipeline`. The old route stays functional for backward compat:

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { unlink } from "fs/promises";
import { eq } from "drizzle-orm";
import { errorResponse, type ConvertResult, successResponse } from "@sudobility/svgr_types";
import { convertRequestSchema } from "../schemas";
import { optionalAuthMiddleware } from "../middleware/optionalAuth";
import { db, users } from "../db";
import { cacheSvg } from "../services/svg-cache";
import { runConversionPipeline } from "../services/conversion-pipeline";
import { detectExtension } from "./convert-utils";

/** Ensure user record exists in database (fire-and-forget). */
async function ensureUserExists(firebaseUid: string, email?: string | null) {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.firebase_uid, firebaseUid));
  if (existing.length === 0) {
    await db.insert(users).values({
      firebase_uid: firebaseUid,
      email: email ?? null,
    });
  }
}

export const routes = new Hono();

routes.post(
  "/convert",
  optionalAuthMiddleware,
  zValidator("json", convertRequestSchema, (result, c) => {
    if (!result.success) {
      const message = result.error.issues.map(i => i.message).join(", ");
      return c.json(errorResponse(message), 400);
    }
  }),
  async c => {
    const {
      original,
      quality,
      smooth,
      transparentBg,
      ocr,
      mergePaths,
      imageType,
    } = c.req.valid("json");

    let tmpInput = "";

    try {
      // Decode base64 → write to temp file
      const buffer = Buffer.from(original, "base64");
      const ext = detectExtension(buffer);
      tmpInput = join(tmpdir(), `svgr-${randomUUID()}${ext}`);
      await Bun.write(tmpInput, buffer);

      const { svg, width, height } = await runConversionPipeline({
        imagePath: tmpInput,
        quality: quality ?? 5,
        smooth: smooth ?? 0,
        transparentBg: transparentBg ?? false,
        ocr: ocr ?? true,
        mergePaths: mergePaths ?? true,
        imageType: imageType ?? "auto",
      });

      // Ensure user exists in DB (fire-and-forget)
      const userId = c.get("userId");
      const userEmail = c.get("userEmail");
      if (userId) {
        ensureUserExists(userId, userEmail).catch(err =>
          console.error("Failed to ensure user exists:", err)
        );
      }

      const cacheId = cacheSvg(svg);
      const result: ConvertResult = { cacheId, width, height };
      return c.json(successResponse(result));
    } catch (err) {
      console.error("Conversion error:", err);
      const message = err instanceof Error ? err.message : "Conversion failed";
      return c.json(errorResponse(message), 500);
    } finally {
      if (tmpInput) await unlink(tmpInput).catch(() => {});
    }
  }
);
```

- [ ] **Step 3: Verify typecheck passes**

Run: `cd /Users/johnhuang/projects/svgr_api && bun run typecheck`
Expected: PASS

- [ ] **Step 4: Run existing tests**

Run: `cd /Users/johnhuang/projects/svgr_api && bun test`
Expected: All existing tests PASS (conversion behavior unchanged)

- [ ] **Step 5: Commit**

```bash
cd /Users/johnhuang/projects/svgr_api
git add src/services/conversion-pipeline.ts src/routes/convert.ts
git commit -m "refactor: extract conversion pipeline into standalone service"
```

---

## Task 6: svgr_api — Job Processor

**Files:**
- Create: `/Users/johnhuang/projects/svgr_api/src/services/job-processor.ts`

- [ ] **Step 1: Implement job-processor.ts**

Create `/Users/johnhuang/projects/svgr_api/src/services/job-processor.ts`:

```typescript
import { eq } from "drizzle-orm";
import type { ImageType } from "@sudobility/svgr_types";
import { db, images, jobs } from "../db";
import { runConversionPipeline } from "./conversion-pipeline";
import { saveSvg, savePreview, getFilePath } from "./file-storage";

/**
 * Process a conversion job asynchronously.
 * Updates job status in DB and saves output files.
 * Intended to be called fire-and-forget after job creation.
 */
export async function processJob(jobId: string): Promise<void> {
  try {
    // Mark as processing
    await db
      .update(jobs)
      .set({ status: "processing", started_at: new Date() })
      .where(eq(jobs.id, jobId));

    // Load job + image data
    const [job] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId));
    if (!job) throw new Error(`Job ${jobId} not found`);

    const [image] = await db
      .select()
      .from(images)
      .where(eq(images.id, job.image_id));
    if (!image) throw new Error(`Image ${job.image_id} not found`);

    // Resolve image path on disk
    const imagePath = getFilePath(image.storage_filename);

    // Run the conversion pipeline
    const { svg, width, height } = await runConversionPipeline({
      imagePath,
      quality: job.quality,
      smooth: job.smooth,
      transparentBg: job.transparent_bg,
      ocr: job.ocr,
      mergePaths: job.merge_paths,
      imageType: job.image_type as ImageType,
    });

    // Save output files
    const svgFilename = await saveSvg(svg);
    const previewFilename = await savePreview(svg, width, height);

    // Mark as done
    await db
      .update(jobs)
      .set({
        status: "done",
        svg_filename: svgFilename,
        preview_filename: previewFilename,
        svg_width: width,
        svg_height: height,
        completed_at: new Date(),
      })
      .where(eq(jobs.id, jobId));

    console.log(`[job] ${jobId} completed: ${svgFilename}`);
  } catch (err) {
    console.error(`[job] ${jobId} failed:`, err);
    const message = err instanceof Error ? err.message : "Conversion failed";
    await db
      .update(jobs)
      .set({
        status: "error",
        error_message: message,
        completed_at: new Date(),
      })
      .where(eq(jobs.id, jobId))
      .catch(dbErr => console.error(`[job] Failed to update error status:`, dbErr));
  }
}
```

- [ ] **Step 2: Verify typecheck**

Run: `cd /Users/johnhuang/projects/svgr_api && bun run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/johnhuang/projects/svgr_api
git add src/services/job-processor.ts
git commit -m "feat: add async job processor service"
```

---

## Task 7: svgr_api — Zod Schema for Jobs

**Files:**
- Modify: `/Users/johnhuang/projects/svgr_api/src/schemas/index.ts`

- [ ] **Step 1: Add createJobRequestSchema**

Add to `/Users/johnhuang/projects/svgr_api/src/schemas/index.ts`:

```typescript
export const createJobRequestSchema = z.object({
  imageId: z.string().uuid("Invalid image ID"),
  quality: z.number().int().min(1).max(10).optional(),
  transparentBg: z.boolean().optional(),
  ocr: z.boolean().optional(),
  mergePaths: z.boolean().optional(),
  smooth: z.number().int().min(0).max(3).optional(),
  imageType: imageTypeEnum.optional(),
});

export type CreateJobRequest = z.infer<typeof createJobRequestSchema>;
```

- [ ] **Step 2: Verify typecheck**

Run: `cd /Users/johnhuang/projects/svgr_api && bun run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/johnhuang/projects/svgr_api
git add src/schemas/index.ts
git commit -m "feat: add Zod schema for job creation request"
```

---

## Task 8: svgr_api — Image Upload Route

**Files:**
- Create: `/Users/johnhuang/projects/svgr_api/src/routes/images.ts`

- [ ] **Step 1: Implement images.ts**

Create `/Users/johnhuang/projects/svgr_api/src/routes/images.ts`:

```typescript
import { Hono } from "hono";
import { createHash } from "crypto";
import { eq, and } from "drizzle-orm";
import sharp from "sharp";
import {
  errorResponse,
  successResponse,
  type ImageUploadResult,
} from "@sudobility/svgr_types";
import { requireAuthMiddleware } from "../middleware/requireAuth";
import { db, images } from "../db";
import { saveUpload } from "../services/file-storage";
import { detectExtension } from "./convert-utils";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".gif": "image/gif",
};

export const imageRoutes = new Hono();

imageRoutes.post(
  "/upload",
  requireAuthMiddleware,
  async c => {
    try {
      const body = await c.req.parseBody();
      const file = body["image"];

      if (!file || !(file instanceof File)) {
        return c.json(errorResponse("Missing 'image' field in form data"), 400);
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      if (buffer.length === 0) {
        return c.json(errorResponse("Empty file"), 400);
      }

      // Detect extension from magic bytes
      const ext = detectExtension(buffer);
      const mimeType = MIME_TYPES[ext];
      if (!mimeType) {
        return c.json(errorResponse("Unsupported image format"), 400);
      }

      // Extract dimensions
      const metadata = await sharp(buffer).metadata();
      const width = metadata.width ?? 0;
      const height = metadata.height ?? 0;
      if (width === 0 || height === 0) {
        return c.json(errorResponse("Could not read image dimensions"), 400);
      }

      // Compute SHA-256 for dedup
      const sha256 = createHash("sha256").update(buffer).digest("hex");

      const userId = c.get("userId") as string;

      // Check for existing image with same content from same user
      const existing = await db
        .select()
        .from(images)
        .where(and(eq(images.user_id, userId), eq(images.sha256, sha256)))
        .limit(1);

      if (existing.length > 0) {
        const img = existing[0];
        const result: ImageUploadResult = {
          imageId: img.id,
          originalFilename: img.original_filename ?? file.name ?? "",
          width: img.width,
          height: img.height,
          fileSizeBytes: img.file_size_bytes,
        };
        return c.json(successResponse(result));
      }

      // Save file to disk
      const storageFilename = await saveUpload(buffer, ext);

      // Insert DB record
      const [inserted] = await db
        .insert(images)
        .values({
          user_id: userId,
          original_filename: file.name ?? null,
          storage_filename: storageFilename,
          mime_type: mimeType,
          file_size_bytes: buffer.length,
          width,
          height,
          sha256,
        })
        .returning();

      const result: ImageUploadResult = {
        imageId: inserted.id,
        originalFilename: inserted.original_filename ?? file.name ?? "",
        width: inserted.width,
        height: inserted.height,
        fileSizeBytes: inserted.file_size_bytes,
      };

      return c.json(successResponse(result), 201);
    } catch (err) {
      console.error("Image upload error:", err);
      const message = err instanceof Error ? err.message : "Upload failed";
      return c.json(errorResponse(message), 500);
    }
  }
);
```

- [ ] **Step 2: Verify typecheck**

Run: `cd /Users/johnhuang/projects/svgr_api && bun run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/johnhuang/projects/svgr_api
git add src/routes/images.ts
git commit -m "feat: add image upload endpoint with dedup"
```

---

## Task 9: svgr_api — Jobs Route

**Files:**
- Create: `/Users/johnhuang/projects/svgr_api/src/routes/jobs.ts`

- [ ] **Step 1: Implement jobs.ts**

Create `/Users/johnhuang/projects/svgr_api/src/routes/jobs.ts`:

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, and, desc } from "drizzle-orm";
import {
  errorResponse,
  successResponse,
  type JobResult,
} from "@sudobility/svgr_types";
import { requireAuthMiddleware } from "../middleware/requireAuth";
import { db, images, jobs } from "../db";
import { createJobRequestSchema } from "../schemas";
import { computeSettingsHash } from "../services/settings-hash";
import { getApiVersion } from "../services/api-version";
import { processJob } from "../services/job-processor";

/** Map a DB job row to a JobResult for the API response. */
function toJobResult(row: typeof jobs.$inferSelect): JobResult {
  return {
    jobId: row.id,
    imageId: row.image_id,
    status: row.status as JobResult["status"],
    errorMessage: row.error_message ?? undefined,
    quality: row.quality,
    transparentBg: row.transparent_bg,
    ocr: row.ocr,
    mergePaths: row.merge_paths,
    smooth: row.smooth,
    imageType: row.image_type,
    apiVersion: row.api_version,
    svgFilename: row.svg_filename ?? undefined,
    previewFilename: row.preview_filename ?? undefined,
    svgWidth: row.svg_width ?? undefined,
    svgHeight: row.svg_height ?? undefined,
    dedupJobId: row.dedup_job_id ?? undefined,
    createdAt: row.created_at.toISOString(),
    startedAt: row.started_at?.toISOString(),
    completedAt: row.completed_at?.toISOString(),
  };
}

export const jobRoutes = new Hono();

// Create a new conversion job
jobRoutes.post(
  "/jobs",
  requireAuthMiddleware,
  zValidator("json", createJobRequestSchema, (result, c) => {
    if (!result.success) {
      const message = result.error.issues.map(i => i.message).join(", ");
      return c.json(errorResponse(message), 400);
    }
  }),
  async c => {
    try {
      const body = c.req.valid("json");
      const userId = c.get("userId") as string;

      // Verify image belongs to user
      const [image] = await db
        .select()
        .from(images)
        .where(and(eq(images.id, body.imageId), eq(images.user_id, userId)));

      if (!image) {
        return c.json(errorResponse("Image not found"), 404);
      }

      const settingsHash = computeSettingsHash(body);
      const apiVersion = getApiVersion();

      // Check for dedup: existing done job with same settings + version
      const [existingJob] = await db
        .select()
        .from(jobs)
        .where(
          and(
            eq(jobs.image_id, body.imageId),
            eq(jobs.settings_hash, settingsHash),
            eq(jobs.api_version, apiVersion),
            eq(jobs.status, "done")
          )
        )
        .limit(1);

      if (existingJob) {
        // Create a new job row that references the dedup source
        const [newJob] = await db
          .insert(jobs)
          .values({
            image_id: body.imageId,
            user_id: userId,
            status: "done",
            quality: body.quality ?? 5,
            transparent_bg: body.transparentBg ?? false,
            ocr: body.ocr ?? true,
            merge_paths: body.mergePaths ?? true,
            smooth: body.smooth ?? 0,
            image_type: body.imageType ?? "auto",
            settings_hash: settingsHash,
            api_version: apiVersion,
            svg_filename: existingJob.svg_filename,
            preview_filename: existingJob.preview_filename,
            svg_width: existingJob.svg_width,
            svg_height: existingJob.svg_height,
            dedup_job_id: existingJob.id,
            completed_at: new Date(),
          })
          .returning();

        console.log(`[job] ${newJob.id} dedup from ${existingJob.id}`);
        return c.json(successResponse(toJobResult(newJob)), 201);
      }

      // No dedup match — create pending job and start processing
      const [newJob] = await db
        .insert(jobs)
        .values({
          image_id: body.imageId,
          user_id: userId,
          quality: body.quality ?? 5,
          transparent_bg: body.transparentBg ?? false,
          ocr: body.ocr ?? true,
          merge_paths: body.mergePaths ?? true,
          smooth: body.smooth ?? 0,
          image_type: body.imageType ?? "auto",
          settings_hash: settingsHash,
          api_version: apiVersion,
        })
        .returning();

      // Fire-and-forget: start conversion in background
      processJob(newJob.id).catch(err =>
        console.error(`[job] Background processing failed for ${newJob.id}:`, err)
      );

      return c.json(successResponse(toJobResult(newJob)), 201);
    } catch (err) {
      console.error("Job creation error:", err);
      const message = err instanceof Error ? err.message : "Failed to create job";
      return c.json(errorResponse(message), 500);
    }
  }
);

// Get job status
jobRoutes.get(
  "/jobs/:jobId",
  requireAuthMiddleware,
  async c => {
    const { jobId } = c.req.param();
    const userId = c.get("userId") as string;

    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.user_id, userId)));

    if (!job) {
      return c.json(errorResponse("Job not found"), 404);
    }

    return c.json(successResponse(toJobResult(job)));
  }
);

// List jobs for an image
jobRoutes.get(
  "/jobs",
  requireAuthMiddleware,
  async c => {
    const imageId = c.req.query("imageId");
    const userId = c.get("userId") as string;

    if (!imageId) {
      return c.json(errorResponse("imageId query parameter required"), 400);
    }

    // Verify image belongs to user
    const [image] = await db
      .select()
      .from(images)
      .where(and(eq(images.id, imageId), eq(images.user_id, userId)));

    if (!image) {
      return c.json(errorResponse("Image not found"), 404);
    }

    const jobRows = await db
      .select()
      .from(jobs)
      .where(eq(jobs.image_id, imageId))
      .orderBy(desc(jobs.created_at));

    return c.json(successResponse(jobRows.map(toJobResult)));
  }
);
```

- [ ] **Step 2: Verify typecheck**

Run: `cd /Users/johnhuang/projects/svgr_api && bun run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/johnhuang/projects/svgr_api
git add src/routes/jobs.ts
git commit -m "feat: add job creation, status, and listing endpoints"
```

---

## Task 10: svgr_api — File Serving Route

**Files:**
- Create: `/Users/johnhuang/projects/svgr_api/src/routes/files.ts`

- [ ] **Step 1: Implement files.ts**

Create `/Users/johnhuang/projects/svgr_api/src/routes/files.ts`:

```typescript
import { Hono } from "hono";
import { extname } from "path";
import { eq, or, and } from "drizzle-orm";
import { errorResponse } from "@sudobility/svgr_types";
import { requireAuthMiddleware } from "../middleware/requireAuth";
import { db, images, jobs } from "../db";
import { readFile } from "../services/file-storage";

const CONTENT_TYPES: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".gif": "image/gif",
};

export const fileRoutes = new Hono();

fileRoutes.get(
  "/files/:filename",
  requireAuthMiddleware,
  async c => {
    const { filename } = c.req.param();
    const userId = c.get("userId") as string;
    const ext = extname(filename).toLowerCase();

    // Validate user ownership
    const isOwned = await checkFileOwnership(filename, userId);
    if (!isOwned) {
      return c.json(errorResponse("File not found"), 404);
    }

    const buffer = await readFile(filename);
    if (!buffer) {
      return c.json(errorResponse("File not found"), 404);
    }

    const contentType = CONTENT_TYPES[ext] || "application/octet-stream";
    return c.body(buffer, 200, {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    });
  }
);

async function checkFileOwnership(
  filename: string,
  userId: string
): Promise<boolean> {
  // Check if it's an upload file
  const uploadMatch = await db
    .select({ id: images.id })
    .from(images)
    .where(and(eq(images.storage_filename, filename), eq(images.user_id, userId)))
    .limit(1);
  if (uploadMatch.length > 0) return true;

  // Check if it's a job output file (svg or preview)
  const jobMatch = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(
      and(
        eq(jobs.user_id, userId),
        or(eq(jobs.svg_filename, filename), eq(jobs.preview_filename, filename))
      )
    )
    .limit(1);
  return jobMatch.length > 0;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `cd /Users/johnhuang/projects/svgr_api && bun run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/johnhuang/projects/svgr_api
git add src/routes/files.ts
git commit -m "feat: add auth-gated file serving endpoint"
```

---

## Task 11: svgr_api — Mount New Routes

**Files:**
- Modify: `/Users/johnhuang/projects/svgr_api/src/index.ts`

- [ ] **Step 1: Update index.ts to mount new routes alongside old ones**

Replace `/Users/johnhuang/projects/svgr_api/src/index.ts`:

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { routes } from "./routes/convert";
import { svgRoutes } from "./routes/svg";
import { consumablesRoutes } from "./routes/consumables";
import { imageRoutes } from "./routes/images";
import { jobRoutes } from "./routes/jobs";
import { fileRoutes } from "./routes/files";
import { initDatabase } from "./db";
import { ensureDataDirs } from "./services/file-storage";
import { getEnv } from "./lib/env-helper";
import {
  successResponse,
  errorResponse,
  type HealthResult,
} from "@sudobility/svgr_types";

const app = new Hono();
app.use("*", logger());
app.use("*", cors());
app.get("/health", c => {
  const result: HealthResult = { status: "ok" };
  return c.json(successResponse(result));
});

// Legacy routes (backward compat for existing apps)
app.route("/api/v1", routes);
app.route("/api/v1", svgRoutes);

// New job-based routes
app.route("/api/v1/images", imageRoutes);
app.route("/api/v1", jobRoutes);
app.route("/api/v1", fileRoutes);

// Consumables
app.route("/api/v1/consumables", consumablesRoutes);

app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json(errorResponse("Internal server error"), 500);
});

const port = parseInt(getEnv("PORT", "3001")!);

Promise.all([initDatabase(), ensureDataDirs()])
  .then(() => {
    console.log(`Server running on http://localhost:${port}`);
  })
  .catch(err => {
    console.error("Failed to initialize:", err);
    process.exit(1);
  });

export default {
  port,
  fetch: app.fetch,
  idleTimeout: 120,
};
```

- [ ] **Step 2: Run all tests**

Run: `cd /Users/johnhuang/projects/svgr_api && bun test`
Expected: All tests PASS

- [ ] **Step 3: Run typecheck**

Run: `cd /Users/johnhuang/projects/svgr_api && bun run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd /Users/johnhuang/projects/svgr_api
git add src/index.ts
git commit -m "feat: mount new job-based routes alongside legacy endpoints"
```

---

## Task 12: svgr_client — New Client Methods

**Files:**
- Modify: `/Users/johnhuang/projects/svgr_client/src/network/SvgrClient.ts`
- Modify: `/Users/johnhuang/projects/svgr_client/src/network/SvgrClient.test.ts`

- [ ] **Step 1: Write tests for new methods**

Add to `/Users/johnhuang/projects/svgr_client/src/network/SvgrClient.test.ts`:

```typescript
describe("SvgrClient job methods", () => {
  let mockNetwork: MockNetworkClient;
  let client: SvgrClient;

  beforeEach(() => {
    mockNetwork = new MockNetworkClient();
    client = new SvgrClient({
      baseUrl: "http://localhost:3001",
      networkClient: mockNetwork,
    });
  });

  it("createJob sends POST to /api/v1/jobs", async () => {
    const mockResponse = {
      success: true,
      data: { jobId: "j1", imageId: "i1", status: "pending", quality: 5, transparentBg: false, ocr: true, mergePaths: true, smooth: 0, imageType: "auto", apiVersion: "1.0.52", createdAt: new Date().toISOString() },
      timestamp: new Date().toISOString(),
    };
    mockNetwork.setMockResponse(
      "http://localhost:3001/api/v1/jobs",
      { data: mockResponse, ok: true },
      "POST"
    );

    const result = await client.createJob({ imageId: "i1", quality: 7 });
    expect(result.success).toBe(true);
    expect(mockNetwork.wasUrlCalled("http://localhost:3001/api/v1/jobs", "POST")).toBe(true);
  });

  it("getJobStatus sends GET to /api/v1/jobs/:id", async () => {
    const mockResponse = {
      success: true,
      data: { jobId: "j1", imageId: "i1", status: "done", quality: 5, transparentBg: false, ocr: true, mergePaths: true, smooth: 0, imageType: "auto", apiVersion: "1.0.52", createdAt: new Date().toISOString() },
      timestamp: new Date().toISOString(),
    };
    mockNetwork.setMockResponse(
      "http://localhost:3001/api/v1/jobs/j1",
      { data: mockResponse, ok: true },
      "GET"
    );

    const result = await client.getJobStatus("j1");
    expect(result.success).toBe(true);
    expect(mockNetwork.wasUrlCalled("http://localhost:3001/api/v1/jobs/j1", "GET")).toBe(true);
  });

  it("getJobsForImage sends GET with imageId query", async () => {
    const mockResponse = {
      success: true,
      data: [],
      timestamp: new Date().toISOString(),
    };
    mockNetwork.setMockResponse(
      "http://localhost:3001/api/v1/jobs?imageId=i1",
      { data: mockResponse, ok: true },
      "GET"
    );

    const result = await client.getJobsForImage("i1");
    expect(result.success).toBe(true);
    expect(mockNetwork.wasUrlCalled("http://localhost:3001/api/v1/jobs?imageId=i1", "GET")).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/johnhuang/projects/svgr_client && bun test`
Expected: FAIL — methods don't exist

- [ ] **Step 3: Add new methods to SvgrClient**

Add after the existing `fetchSvg` method in `/Users/johnhuang/projects/svgr_client/src/network/SvgrClient.ts`:

```typescript
  /**
   * Upload an image file for persistent storage.
   * Uses networkClient.post with FormData (not JSON).
   */
  async uploadImage(
    file: File | { buffer: ArrayBuffer; filename: string; mimeType: string }
  ): Promise<BaseResponse<ImageUploadResult>> {
    const formData = new FormData();
    if (file instanceof File) {
      formData.append("image", file);
    } else {
      const blob = new Blob([file.buffer], { type: file.mimeType });
      formData.append("image", blob, file.filename);
    }

    const url = `${this.baseUrl}/api/v1/images/upload`;
    const response = await this.networkClient.post<BaseResponse<ImageUploadResult>>(
      url,
      formData,
      { timeout: 60000 }
    );

    if (!response.ok) {
      throw new SvgrApiError(
        response.status,
        (response.data as { error?: string })?.error ?? "Upload failed"
      );
    }

    return response.data as BaseResponse<ImageUploadResult>;
  }

  /**
   * Create a conversion job for an uploaded image.
   */
  async createJob(
    request: CreateJobRequest
  ): Promise<BaseResponse<JobResult>> {
    const url = `${this.baseUrl}/api/v1/jobs`;
    const response = await this.networkClient.post<BaseResponse<JobResult>>(
      url,
      request
    );

    if (!response.ok) {
      throw new SvgrApiError(
        response.status,
        (response.data as { error?: string })?.error ?? "Job creation failed"
      );
    }

    return response.data as BaseResponse<JobResult>;
  }

  /**
   * Get the current status of a conversion job.
   */
  async getJobStatus(
    jobId: string
  ): Promise<BaseResponse<JobResult>> {
    const url = `${this.baseUrl}/api/v1/jobs/${jobId}`;
    const response = await this.networkClient.get<BaseResponse<JobResult>>(url);

    if (!response.ok) {
      throw new SvgrApiError(
        response.status,
        (response.data as { error?: string })?.error ?? "Failed to get job status"
      );
    }

    return response.data as BaseResponse<JobResult>;
  }

  /**
   * List all conversion jobs for a given image.
   */
  async getJobsForImage(
    imageId: string
  ): Promise<BaseResponse<JobResult[]>> {
    const url = `${this.baseUrl}/api/v1/jobs?imageId=${encodeURIComponent(imageId)}`;
    const response = await this.networkClient.get<BaseResponse<JobResult[]>>(url);

    if (!response.ok) {
      throw new SvgrApiError(
        response.status,
        (response.data as { error?: string })?.error ?? "Failed to list jobs"
      );
    }

    return response.data as BaseResponse<JobResult[]>;
  }

  /**
   * Fetch a file by name (SVG, JPEG preview, or uploaded image).
   * Returns the raw response as a Blob.
   */
  async fetchFile(filename: string): Promise<Blob> {
    const url = `${this.baseUrl}/api/v1/files/${encodeURIComponent(filename)}`;
    const response = await this.networkClient.get<Blob>(url);

    if (!response.ok) {
      throw new SvgrApiError(response.status, "File not found");
    }

    return response.data as Blob;
  }
```

Also update the imports at the top of the file:

```typescript
import type {
  BaseResponse,
  ConvertResult,
  ImageType,
  ImageUploadResult,
  JobResult,
  CreateJobRequest,
} from "@sudobility/svgr_types";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/johnhuang/projects/svgr_client && bun test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/johnhuang/projects/svgr_client
git add src/network/SvgrClient.ts src/network/SvgrClient.test.ts
git commit -m "feat: add job-based client methods (uploadImage, createJob, getJobStatus, etc.)"
```

---

## Task 13: svgr_client — New React Query Hooks

**Files:**
- Modify: `/Users/johnhuang/projects/svgr_client/src/hooks/query-keys.ts`
- Create: `/Users/johnhuang/projects/svgr_client/src/hooks/useUploadImage.ts`
- Create: `/Users/johnhuang/projects/svgr_client/src/hooks/useCreateJob.ts`
- Create: `/Users/johnhuang/projects/svgr_client/src/hooks/useJobStatus.ts`
- Create: `/Users/johnhuang/projects/svgr_client/src/hooks/useImageJobs.ts`
- Modify: `/Users/johnhuang/projects/svgr_client/src/hooks/index.ts`
- Modify: `/Users/johnhuang/projects/svgr_client/src/index.ts`

- [ ] **Step 1: Update query-keys.ts**

Replace `/Users/johnhuang/projects/svgr_client/src/hooks/query-keys.ts`:

```typescript
/**
 * Query key factory for SVGR-related TanStack React Query keys.
 */
export const svgrKeys = {
  all: ["svgr"] as const,
  convert: () => [...svgrKeys.all, "convert"] as const,
  jobs: () => [...svgrKeys.all, "jobs"] as const,
  job: (jobId: string) => [...svgrKeys.jobs(), jobId] as const,
  imageJobs: (imageId: string) =>
    [...svgrKeys.jobs(), "image", imageId] as const,
};
```

- [ ] **Step 2: Create useUploadImage.ts**

Create `/Users/johnhuang/projects/svgr_client/src/hooks/useUploadImage.ts`:

```typescript
import { useMutation } from "@tanstack/react-query";
import type { SvgrClient } from "../network/SvgrClient";

export function useUploadImage(client: SvgrClient) {
  return useMutation({
    mutationFn: (
      file: File | { buffer: ArrayBuffer; filename: string; mimeType: string }
    ) => client.uploadImage(file),
  });
}
```

- [ ] **Step 3: Create useCreateJob.ts**

Create `/Users/johnhuang/projects/svgr_client/src/hooks/useCreateJob.ts`:

```typescript
import { useMutation } from "@tanstack/react-query";
import type { CreateJobRequest } from "@sudobility/svgr_types";
import type { SvgrClient } from "../network/SvgrClient";

export function useCreateJob(client: SvgrClient) {
  return useMutation({
    mutationFn: (request: CreateJobRequest) => client.createJob(request),
  });
}
```

- [ ] **Step 4: Create useJobStatus.ts**

Create `/Users/johnhuang/projects/svgr_client/src/hooks/useJobStatus.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import type { SvgrClient } from "../network/SvgrClient";
import { svgrKeys } from "./query-keys";

export function useJobStatus(
  client: SvgrClient,
  jobId: string | null
) {
  return useQuery({
    queryKey: svgrKeys.job(jobId ?? ""),
    queryFn: () => client.getJobStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: query => {
      const status = query.state.data?.data?.status;
      if (status === "done" || status === "error") return false;
      return 2500;
    },
  });
}
```

- [ ] **Step 5: Create useImageJobs.ts**

Create `/Users/johnhuang/projects/svgr_client/src/hooks/useImageJobs.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import type { SvgrClient } from "../network/SvgrClient";
import { svgrKeys } from "./query-keys";

export function useImageJobs(
  client: SvgrClient,
  imageId: string | null
) {
  return useQuery({
    queryKey: svgrKeys.imageJobs(imageId ?? ""),
    queryFn: () => client.getJobsForImage(imageId!),
    enabled: !!imageId,
  });
}
```

- [ ] **Step 6: Update hooks/index.ts**

Replace `/Users/johnhuang/projects/svgr_client/src/hooks/index.ts`:

```typescript
export { useConvert } from "./useConvert";
export { useUploadImage } from "./useUploadImage";
export { useCreateJob } from "./useCreateJob";
export { useJobStatus } from "./useJobStatus";
export { useImageJobs } from "./useImageJobs";
export { svgrKeys } from "./query-keys";
```

- [ ] **Step 7: Update src/index.ts exports**

Replace `/Users/johnhuang/projects/svgr_client/src/index.ts`:

```typescript
// Network
export {
  SvgrClient,
  SvgrApiError,
  type SvgrClientConfig,
  type RetryConfig,
} from "./network/SvgrClient";

// Hooks
export {
  useConvert,
  useUploadImage,
  useCreateJob,
  useJobStatus,
  useImageJobs,
  svgrKeys,
} from "./hooks";
export type { ConvertMutationParams } from "./hooks/useConvert";

// Re-exports from svgr_types
export type {
  ConvertRequest,
  ConvertResult,
  ConvertResponse,
  BaseResponse,
  ImageType,
  ImageUploadResult,
  JobResult,
  CreateJobRequest,
  JobStatus,
  CreateJobResponse,
  JobStatusResponse,
  JobListResponse,
} from "@sudobility/svgr_types";
export { IMAGE_TYPES } from "@sudobility/svgr_types";
```

- [ ] **Step 8: Update query-keys test**

Add to `/Users/johnhuang/projects/svgr_client/src/hooks/query-keys.test.ts`:

```typescript
  it("job key extends jobs", () => {
    expect(svgrKeys.job("j1")).toEqual(["svgr", "jobs", "j1"]);
  });

  it("imageJobs key extends jobs", () => {
    expect(svgrKeys.imageJobs("i1")).toEqual(["svgr", "jobs", "image", "i1"]);
  });
```

- [ ] **Step 9: Run verify**

Run: `cd /Users/johnhuang/projects/svgr_client && bun run verify`
Expected: typecheck + lint + test + build all PASS

- [ ] **Step 10: Commit**

```bash
cd /Users/johnhuang/projects/svgr_client
git add src/hooks/ src/index.ts
git commit -m "feat: add React Query hooks for job-based conversion"
```

---

## Task 14: svgr_lib — Rework useImageConverter

**Files:**
- Modify: `/Users/johnhuang/projects/svgr_lib/src/hooks/useImageConverter.ts`
- Modify: `/Users/johnhuang/projects/svgr_lib/src/index.ts`

- [ ] **Step 1: Rewrite useImageConverter.ts**

Replace `/Users/johnhuang/projects/svgr_lib/src/hooks/useImageConverter.ts`:

```typescript
import { useCallback, useEffect, useState } from 'react';
import {
  useUploadImage,
  useCreateJob,
  useJobStatus,
  useImageJobs,
  svgrKeys,
} from '@sudobility/svgr_client';
import type { ImageType, JobResult, SvgrClient } from '@sudobility/svgr_client';
import { useQueryClient } from '@tanstack/react-query';
import { MAX_PIXELS, QUALITY_DEFAULT } from '../config/constants';

export const OCR_SUPPORTED_IMAGE_TYPES: ReadonlySet<ImageType> = new Set([
  'auto',
  'design',
  'line_art',
  'logo',
  'manga',
  'poster',
  'screenshot_ui',
  'diagram',
  'blueprint_cad',
  'map',
  'chart_graph',
  'comic_western',
  'flat_infographic',
  'packaging_label',
  'document_scan',
  'icon_sheet',
  'sticker_sheet',
]);

export const TRANSPARENT_BG_SUPPORTED_IMAGE_TYPES: ReadonlySet<ImageType> =
  new Set([
    'auto',
    'design',
    'line_art',
    'logo',
    'illustration',
    'manga',
    'comic_western',
    'pixel_art',
    'engraving',
    'diagram',
    'blueprint_cad',
    'chart_graph',
    'flat_infographic',
    'icon_sheet',
    'sticker_sheet',
    'tattoo_flash',
    'silhouette_cutout',
    'emoji_moji',
  ]);

export interface ImageConverterState {
  quality: number;
  transparentBg: boolean;
  ocr: boolean;
  mergePaths: boolean;
  imageType: ImageType;
  supportsOcr: boolean;
  supportsTransparentBg: boolean;

  /** Server-assigned image ID after upload. */
  imageId: string | null;
  /** Whether an upload is in progress. */
  isUploading: boolean;

  /** ID of the job currently being tracked. */
  currentJobId: string | null;
  /** Latest polled data for the current job. */
  currentJob: JobResult | null;
  /** Whether a conversion is in progress (pending or processing). */
  isConverting: boolean;

  /** JPEG preview object URL (set when job completes). */
  previewUrl: string | null;
  /** SVG filename for download (not loaded into memory). */
  svgFilename: string | null;

  /** All completed jobs for the current image. */
  jobs: JobResult[];

  error: string | null;
}

export interface UseImageConverterReturn extends ImageConverterState {
  setQuality: (q: number) => void;
  setTransparentBg: (v: boolean) => void;
  setOcr: (v: boolean) => void;
  setMergePaths: (v: boolean) => void;
  setImageType: (v: ImageType) => void;

  /** Upload an image file to the server. */
  upload: (file: File) => Promise<void>;
  /** Create a conversion job with current settings. Image must be uploaded first. */
  convert: () => void;
  /** Reset all state. */
  reset: () => void;
  /** Switch preview to a different job's results. */
  selectJob: (jobId: string) => void;
  /** Fetch the SVG file from the server. */
  fetchSvg: () => Promise<Blob | null>;
}

export type ScaleImageFn = (
  base64: string,
  maxPixels: number
) => Promise<string>;

export function supportsOcrOption(imageType: ImageType): boolean {
  return OCR_SUPPORTED_IMAGE_TYPES.has(imageType);
}

export function supportsTransparentBgOption(imageType: ImageType): boolean {
  return TRANSPARENT_BG_SUPPORTED_IMAGE_TYPES.has(imageType);
}

export function useImageConverter(
  client: SvgrClient,
  _scaleImage?: ScaleImageFn
): UseImageConverterReturn {
  const queryClient = useQueryClient();
  const uploadMutation = useUploadImage(client);
  const createJobMutation = useCreateJob(client);

  const [quality, setQuality] = useState(QUALITY_DEFAULT);
  const [transparentBg, setTransparentBgState] = useState(false);
  const [ocr, setOcrState] = useState(true);
  const [mergePaths, setMergePaths] = useState(false);
  const [imageType, setImageTypeState] = useState<ImageType>('auto');
  const [imageId, setImageId] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [svgFilename, setSvgFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Poll job status
  const jobStatusQuery = useJobStatus(client, currentJobId);
  const currentJob = jobStatusQuery.data?.data ?? null;

  // List all jobs for current image
  const imageJobsQuery = useImageJobs(client, imageId);
  const jobs = imageJobsQuery.data?.data ?? [];

  // When job completes, fetch the JPEG preview
  useEffect(() => {
    if (!currentJob) return;
    if (currentJob.status === 'done' && currentJob.previewFilename) {
      setSvgFilename(currentJob.svgFilename ?? null);
      // Fetch preview JPEG
      client
        .fetchFile(currentJob.previewFilename)
        .then(blob => {
          const url = URL.createObjectURL(blob);
          setPreviewUrl(prev => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        })
        .catch(err => {
          console.error('Failed to fetch preview:', err);
        });
      // Refresh job list
      queryClient.invalidateQueries({
        queryKey: svgrKeys.imageJobs(currentJob.imageId),
      });
    } else if (currentJob.status === 'error') {
      setError(currentJob.errorMessage ?? 'Conversion failed');
    }
  }, [currentJob?.status, currentJob?.previewFilename]);

  const setTransparentBg = useCallback(
    (v: boolean) => {
      setTransparentBgState(supportsTransparentBgOption(imageType) ? v : false);
    },
    [imageType]
  );

  const setOcr = useCallback(
    (v: boolean) => {
      setOcrState(supportsOcrOption(imageType) ? v : false);
    },
    [imageType]
  );

  const setImageType = useCallback((nextImageType: ImageType) => {
    setImageTypeState(nextImageType);
    if (!supportsTransparentBgOption(nextImageType)) {
      setTransparentBgState(false);
    }
    if (!supportsOcrOption(nextImageType)) {
      setOcrState(false);
    }
  }, []);

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const response = await uploadMutation.mutateAsync(file);
        if (response.success && response.data) {
          setImageId(response.data.imageId);
        } else {
          setError(
            (response as { error?: string }).error ?? 'Upload failed'
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      }
    },
    [uploadMutation]
  );

  const convert = useCallback(() => {
    if (!imageId) return;
    setError(null);
    setPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setSvgFilename(null);

    createJobMutation
      .mutateAsync({
        imageId,
        quality,
        transparentBg,
        ocr,
        mergePaths,
        imageType,
      })
      .then(response => {
        if (response.success && response.data) {
          setCurrentJobId(response.data.jobId);
          // If dedup returned done immediately, the useEffect above handles it
        } else {
          setError(
            (response as { error?: string }).error ?? 'Failed to create job'
          );
        }
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to create job');
      });
  }, [imageId, quality, transparentBg, ocr, mergePaths, imageType, createJobMutation]);

  const reset = useCallback(() => {
    setImageId(null);
    setCurrentJobId(null);
    setPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setSvgFilename(null);
    setError(null);
  }, []);

  const selectJob = useCallback(
    (jobId: string) => {
      const job = jobs.find(j => j.jobId === jobId);
      if (!job || job.status !== 'done') return;
      setCurrentJobId(jobId);
      setSvgFilename(job.svgFilename ?? null);
      if (job.previewFilename) {
        client
          .fetchFile(job.previewFilename)
          .then(blob => {
            const url = URL.createObjectURL(blob);
            setPreviewUrl(prev => {
              if (prev) URL.revokeObjectURL(prev);
              return url;
            });
          })
          .catch(err => console.error('Failed to fetch preview:', err));
      }
    },
    [jobs, client]
  );

  const fetchSvg = useCallback(async (): Promise<Blob | null> => {
    if (!svgFilename) return null;
    try {
      return await client.fetchFile(svgFilename);
    } catch (err) {
      console.error('Failed to fetch SVG:', err);
      return null;
    }
  }, [svgFilename, client]);

  const isConverting =
    createJobMutation.isPending ||
    (currentJob !== null &&
      currentJob.status !== 'done' &&
      currentJob.status !== 'error');

  return {
    quality,
    transparentBg,
    ocr,
    mergePaths,
    imageType,
    supportsOcr: supportsOcrOption(imageType),
    supportsTransparentBg: supportsTransparentBgOption(imageType),
    imageId,
    isUploading: uploadMutation.isPending,
    currentJobId,
    currentJob,
    isConverting,
    previewUrl,
    svgFilename,
    jobs,
    error,
    setQuality,
    setTransparentBg,
    setOcr,
    setMergePaths,
    setImageType,
    upload,
    convert,
    reset,
    selectJob,
    fetchSvg,
  };
}
```

- [ ] **Step 2: Update exports in svgr_lib/src/index.ts**

The exports file needs to export the new types. Update the hooks export section:

```typescript
// Hooks
export {
  type ImageConverterState,
  type UseImageConverterReturn,
  type ScaleImageFn,
  useImageConverter,
  OCR_SUPPORTED_IMAGE_TYPES,
  TRANSPARENT_BG_SUPPORTED_IMAGE_TYPES,
  supportsOcrOption,
  supportsTransparentBgOption,
} from './hooks';
```

- [ ] **Step 3: Run typecheck**

Run: `cd /Users/johnhuang/projects/svgr_lib && bun run typecheck`
Expected: PASS

- [ ] **Step 4: Run tests**

Run: `cd /Users/johnhuang/projects/svgr_lib && bun test`
Expected: PASS (existing tests should still pass; type tests exercise the new interface)

- [ ] **Step 5: Commit**

```bash
cd /Users/johnhuang/projects/svgr_lib
git add src/hooks/useImageConverter.ts src/index.ts
git commit -m "feat: rework useImageConverter for job-based conversion flow"
```

---

## Task 15: svgr_app — Enable Anonymous Auth

**Files:**
- Modify: `/Users/johnhuang/projects/svgr_app/src/components/providers/AuthProviderWrapper.tsx`

- [ ] **Step 1: Change enableAnonymous to true**

In `/Users/johnhuang/projects/svgr_app/src/components/providers/AuthProviderWrapper.tsx`, change line 63:

```diff
-        enableAnonymous: false,
+        enableAnonymous: true,
```

- [ ] **Step 2: Verify typecheck**

Run: `cd /Users/johnhuang/projects/svgr_app && bun run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/johnhuang/projects/svgr_app
git add src/components/providers/AuthProviderWrapper.tsx
git commit -m "feat: enable Firebase anonymous auth for job system"
```

---

## Task 16: svgr_app — Update ConvertPage and Components

**Files:**
- Modify: `/Users/johnhuang/projects/svgr_app/src/pages/ConvertPage.tsx`
- Modify: `/Users/johnhuang/projects/svgr_app/src/components/ImageUploadPanel.tsx`
- Modify: `/Users/johnhuang/projects/svgr_app/src/components/ConvertButton.tsx`
- Modify: `/Users/johnhuang/projects/svgr_app/src/components/SvgPreviewPanel.tsx`
- Create: `/Users/johnhuang/projects/svgr_app/src/components/JobHistoryList.tsx`

This is a large UI task. The key changes:
1. `handleFileSelect` also triggers `converter.upload(file)`
2. `handleConvert` calls `converter.convert()` (no FileReader/base64)
3. `SvgPreviewPanel` shows JPEG preview, downloads SVG on demand
4. New `JobHistoryList` component

- [ ] **Step 1: Create JobHistoryList.tsx**

Create `/Users/johnhuang/projects/svgr_app/src/components/JobHistoryList.tsx`:

```typescript
import { useTranslation } from 'react-i18next';
import type { JobResult } from '@sudobility/svgr_client';

interface JobHistoryListProps {
  jobs: JobResult[];
  currentJobId: string | null;
  onSelectJob: (jobId: string) => void;
}

function formatSettings(job: JobResult): string {
  const parts = [`Q${job.quality}`];
  if (job.imageType !== 'auto') parts.push(job.imageType);
  if (job.transparentBg) parts.push('transparent');
  if (!job.ocr) parts.push('no-ocr');
  if (job.smooth > 0) parts.push(`smooth=${job.smooth}`);
  return parts.join(', ');
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    done: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
    processing: 'bg-yellow-100 text-yellow-700',
    pending: 'bg-gray-100 text-gray-600',
  };
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${colors[status] ?? colors.pending}`}
    >
      {status}
    </span>
  );
}

export function JobHistoryList({
  jobs,
  currentJobId,
  onSelectJob,
}: JobHistoryListProps) {
  const { t } = useTranslation('conversion');

  if (jobs.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="mb-2 text-sm font-medium text-gray-600">
        {t('jobHistory', 'Conversion History')}
      </h3>
      <div className="space-y-1">
        {jobs.map(job => (
          <button
            key={job.jobId}
            type="button"
            onClick={() => onSelectJob(job.jobId)}
            disabled={job.status !== 'done'}
            className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
              job.jobId === currentJobId
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:bg-gray-50'
            } ${job.status !== 'done' ? 'cursor-default opacity-60' : 'cursor-pointer'}`}
          >
            <div className="flex items-center gap-2">
              <StatusBadge status={job.status} />
              <span className="text-gray-700">{formatSettings(job)}</span>
            </div>
            <span className="text-xs text-gray-400">
              {new Date(job.createdAt).toLocaleTimeString()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update ConvertPage.tsx**

Replace the conversion flow in `/Users/johnhuang/projects/svgr_app/src/pages/ConvertPage.tsx`. Key changes:

1. Remove `FileReader` logic from `handleConvert` — the image is already uploaded
2. Add `converter.upload(file)` call in `handleFileSelect`
3. Pass JPEG `previewUrl` to `SvgPreviewPanel` instead of `svg` string
4. Add `JobHistoryList` component
5. Download fetches SVG from server

The full ConvertPage needs to be updated to use the new `converter` interface. The settings panel and layout stay the same. The changes are in the data flow:

```typescript
// In handleFileSelect — add upload call after setting local preview
converter.upload(selectedFile);

// In handleConvert — simplified, no FileReader
const handleConvert = useCallback(() => {
  if (!file || !converter.imageId) return;
  trackButtonClick('convert_to_svg', {
    file_type: file.type,
    file_size: file.size,
  });
  converter.convert();
}, [file, converter]);

// In JSX — pass previewUrl instead of svg
<SvgPreviewPanel
  previewUrl={converter.previewUrl}
  svgFilename={converter.svgFilename}
  filename={file?.name ?? null}
  onDownloadSvg={handleDownloadSvg}
  onDownloadPdf={handleDownloadPdf}
  isConverting={converter.isConverting}
/>

// Add JobHistoryList after the preview
{converter.imageId && converter.jobs.length > 0 && (
  <JobHistoryList
    jobs={converter.jobs}
    currentJobId={converter.currentJobId}
    onSelectJob={converter.selectJob}
  />
)}
```

- [ ] **Step 3: Update SvgPreviewPanel.tsx**

The panel now receives a JPEG preview URL instead of an SVG string. Downloads fetch SVG from the server.

Key prop changes:
```typescript
interface SvgPreviewPanelProps {
  previewUrl: string | null;    // JPEG object URL (was: svg string)
  svgFilename: string | null;   // For identifying file to download
  filename: string | null;      // Original filename for download naming
  onDownloadSvg: () => void;    // Parent handles SVG fetch + download
  onDownloadPdf: () => void;    // Parent handles SVG fetch + PDF conversion
  isConverting: boolean;        // Show spinner while job is running
}
```

The preview `<img>` tag uses `previewUrl` directly (already an object URL). No more Blob URL creation from SVG string. Download buttons call the parent callbacks.

- [ ] **Step 4: Update ConvertButton.tsx**

Add `isUploading` prop:

```typescript
interface ConvertButtonProps {
  disabled: boolean;
  loading: boolean;
  uploading?: boolean;
  onClick: () => void;
}
```

Show "Uploading..." text when `uploading` is true.

- [ ] **Step 5: Update ImageUploadPanel.tsx**

Add `isUploading` prop to show upload progress indicator:

```typescript
interface ImageUploadPanelProps {
  // ... existing props
  isUploading?: boolean;
}
```

Show a small spinner overlay on the image preview when `isUploading` is true.

- [ ] **Step 6: Run verify**

Run: `cd /Users/johnhuang/projects/svgr_app && bun run verify`
Expected: typecheck + lint + test + build all PASS

- [ ] **Step 7: Commit**

```bash
cd /Users/johnhuang/projects/svgr_app
git add src/pages/ConvertPage.tsx src/components/SvgPreviewPanel.tsx src/components/ConvertButton.tsx src/components/ImageUploadPanel.tsx src/components/JobHistoryList.tsx
git commit -m "feat: update UI for job-based conversion with JPEG preview and job history"
```

---

## Task 17: Integration Test — End-to-End Verification

- [ ] **Step 1: Start API server**

Run: `cd /Users/johnhuang/projects/svgr_api && bun run dev`

- [ ] **Step 2: Test image upload via curl**

```bash
curl -X POST http://localhost:3001/api/v1/images/upload \
  -H "Authorization: Bearer <test-token>" \
  -F "image=@/path/to/test.png"
```

Expected: 201 response with `imageId`, `width`, `height`

- [ ] **Step 3: Test job creation**

```bash
curl -X POST http://localhost:3001/api/v1/jobs \
  -H "Authorization: Bearer <test-token>" \
  -H "Content-Type: application/json" \
  -d '{"imageId":"<imageId-from-step-2>","quality":5}'
```

Expected: 201 response with `jobId`, `status: "pending"`

- [ ] **Step 4: Poll job status**

```bash
curl http://localhost:3001/api/v1/jobs/<jobId> \
  -H "Authorization: Bearer <test-token>"
```

Expected: Eventually returns `status: "done"` with `svgFilename`, `previewFilename`

- [ ] **Step 5: Fetch preview JPEG**

```bash
curl http://localhost:3001/api/v1/files/<previewFilename> \
  -H "Authorization: Bearer <test-token>" -o preview.jpg
```

Expected: Valid JPEG file downloaded

- [ ] **Step 6: Fetch SVG**

```bash
curl http://localhost:3001/api/v1/files/<svgFilename> \
  -H "Authorization: Bearer <test-token>" -o output.svg
```

Expected: Valid SVG file downloaded

- [ ] **Step 7: Verify legacy endpoint still works**

```bash
curl -X POST http://localhost:3001/api/v1/convert \
  -H "Content-Type: application/json" \
  -d '{"original":"<base64-image>","quality":5}'
```

Expected: 200 response with `cacheId`, `width`, `height`

- [ ] **Step 8: Test dedup**

Create a second job with identical settings:
```bash
curl -X POST http://localhost:3001/api/v1/jobs \
  -H "Authorization: Bearer <test-token>" \
  -H "Content-Type: application/json" \
  -d '{"imageId":"<same-imageId>","quality":5}'
```

Expected: Immediate `status: "done"` with `dedupJobId` set

- [ ] **Step 9: Start web app and test full flow**

Run: `cd /Users/johnhuang/projects/svgr_app && bun run dev`

Open http://localhost:5175/en/convert in browser. Test:
1. Upload image → upload indicator shows → upload succeeds
2. Click Convert → spinner shows → polls → JPEG preview appears
3. Click Download SVG → SVG file downloads
4. Click Download PDF → PDF file downloads
5. Change quality → click Convert again → new job appears in history
6. Click previous job in history → preview switches

- [ ] **Step 10: Final commit with version bumps**

```bash
# Bump versions and publish in dependency order
cd /Users/johnhuang/projects/svgr_types && bun run verify
cd /Users/johnhuang/projects/svgr_api && bun run verify
cd /Users/johnhuang/projects/svgr_client && bun run verify
cd /Users/johnhuang/projects/svgr_lib && bun run verify
cd /Users/johnhuang/projects/svgr_app && bun run verify
```

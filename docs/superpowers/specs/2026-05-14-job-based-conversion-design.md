# Job-Based Conversion System — Implementation Plan

## Context

The current SVGR conversion is synchronous: the frontend sends a base64 image, waits 10-30+ seconds for the backend to finish, then gets back a cache ID to fetch the SVG. This blocks the user on the page and breaks on mobile (network drops when app is backgrounded).

This refactoring introduces persistent job tracking: upload image → create job → conversion runs async → frontend polls for completion → preview JPEG shown → SVG fetched only on download. All five projects in the SVGR ecosystem are modified.

## Decision Summary

| Decision         | Choice                                                               |
| ---------------- | -------------------------------------------------------------------- |
| File storage     | Local filesystem                                                     |
| Database         | Same PostgreSQL (svgr schema)                                        |
| Frontend polling | Simple interval (2-3s)                                               |
| Auth             | Firebase anonymous auth required                                     |
| File access      | Through API endpoint (auth-gated)                                    |
| Retention        | No limits now, timestamps for future cleanup                         |
| Job history UI   | List all jobs per image                                              |
| Dedup            | Backend handles it                                                   |
| SVG cache        | Kept for legacy `/convert` endpoint; new jobs use persistent storage |

---

## Phase 1: svgr_types — New Type Definitions

**File**: `/Users/johnhuang/projects/svgr_types/src/index.ts`

Add alongside existing types (keep `ConvertRequest`/`ConvertResult`/`ConvertResponse` for now, mark `@deprecated`):

```typescript
// Image Upload
export interface ImageUploadResult {
  imageId: string;
  originalFilename: string;
  width: number;
  height: number;
  fileSizeBytes: number;
}
export type ImageUploadResponse = BaseResponse<ImageUploadResult>;

// Jobs
export type JobStatus = 'pending' | 'processing' | 'done' | 'error';

export interface CreateJobRequest {
  imageId: string;
  quality?: number; // 1-10, default 5
  transparentBg?: boolean; // default false
  ocr?: boolean; // default true
  mergePaths?: boolean; // default true
  smooth?: number; // 0-3, default 0
  imageType?: ImageType; // default 'auto'
}

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

export type CreateJobResponse = BaseResponse<JobResult>;
export type JobStatusResponse = BaseResponse<JobResult>;
export type JobListResponse = BaseResponse<JobResult[]>;
```

**Verification**: `bun test` in svgr_types, then publish.

---

## Phase 2: svgr_api — Backend Job System

### 2a. Database Tables

**File**: `/Users/johnhuang/projects/svgr_api/src/db/index.ts` — add to `initDatabase()`:

```sql
-- Images table
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
);
CREATE INDEX IF NOT EXISTS idx_images_user ON svgr.images (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_images_sha256 ON svgr.images (user_id, sha256);

-- Jobs table
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
);
CREATE INDEX IF NOT EXISTS idx_jobs_user ON svgr.jobs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_image ON svgr.jobs (image_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_dedup ON svgr.jobs (image_id, settings_hash, api_version) WHERE status = 'done';
```

**File**: `/Users/johnhuang/projects/svgr_api/src/db/schema.ts` — add Drizzle table definitions for `images` and `jobs`.

### 2b. Filesystem Storage

**New file**: `/Users/johnhuang/projects/svgr_api/src/services/file-storage.ts`

- `DATA_DIR` from env var or `./data`
- Subdirectories: `uploads/`, `svg/`, `preview/`
- `ensureDataDirs()` — creates dirs on startup (called from `initDatabase()`)
- `saveUpload(buffer, ext) → storageFilename` — writes `<uuid>.<ext>` to `uploads/`
- `saveSvg(svg) → filename` — writes `<uuid>.svg` to `svg/`
- `savePreview(svgString, width, height) → filename` — renders SVG to JPEG at original dimensions using sharp, writes `<uuid>.jpg` to `preview/`
- `getFilePath(filename) → absolutePath` — resolves based on extension
- `readFile(filename) → Buffer | null`

### 2c. Extract Conversion Pipeline

**New file**: `/Users/johnhuang/projects/svgr_api/src/services/conversion-pipeline.ts`

Extract lines 119-533 from `/Users/johnhuang/projects/svgr_api/src/routes/convert.ts` into:

```typescript
export async function runConversionPipeline(params: {
  imagePath: string; // path to uploaded image on disk
  quality: number;
  smooth: number;
  transparentBg: boolean;
  ocr: boolean;
  mergePaths: boolean;
  imageType: ImageType; // 'auto' or specific type
}): Promise<{ svg: string; width: number; height: number }>;
```

This function contains the existing 7 stages verbatim:

1. Load image with sharp, classify type
2. OCR detection + verification
3. Text inpainting
4. YCbCr reduction (if applicable)
5. vtracer vectorization
6. Color refinement
7. Text overlay, background removal, blur

Temp file cleanup stays in a `finally` block inside this function.

### 2d. Supporting Services

**New file**: `/Users/johnhuang/projects/svgr_api/src/services/settings-hash.ts`

- `computeSettingsHash(settings)` — canonical JSON (sorted keys, normalized defaults) → SHA-256 hex

**New file**: `/Users/johnhuang/projects/svgr_api/src/services/api-version.ts`

- `getApiVersion()` — reads + caches `version` from package.json

### 2e. New API Routes

**New file**: `/Users/johnhuang/projects/svgr_api/src/routes/images.ts`

`POST /api/v1/images/upload` (requireAuth)

- Accepts `multipart/form-data` with field `image`
- Validates image type (magic bytes, same as current `detectExtension`)
- Extracts dimensions with sharp
- Computes SHA-256 of raw bytes
- **Image dedup**: if same `user_id + sha256` exists, return existing record
- Saves file to `data/uploads/<uuid>.<ext>`, inserts DB row
- Returns `ImageUploadResult`

**New file**: `/Users/johnhuang/projects/svgr_api/src/routes/jobs.ts`

`POST /api/v1/jobs` (requireAuth)

- Validates request body with Zod schema
- Verifies image belongs to requesting user
- Computes `settings_hash` and reads `api_version`
- **Job dedup**: queries for existing job with same `image_id + settings_hash + api_version` where `status = 'done'`
  - If match: create new job row with `status = 'done'`, copy output filenames, set `dedup_job_id`. Return immediately.
  - If no match: insert job with `status = 'pending'`, return response, then fire-and-forget `processJob(jobId)`
- Returns `CreateJobResponse`

`GET /api/v1/jobs/:jobId` (requireAuth)

- Returns job status + all fields
- Verifies job belongs to requesting user

`GET /api/v1/jobs?imageId=<uuid>` (requireAuth)

- Returns all jobs for an image, ordered by `created_at DESC`
- Verifies image belongs to requesting user

**New file**: `/Users/johnhuang/projects/svgr_api/src/routes/files.ts`

`GET /api/v1/files/:filename` (requireAuth)

- Determines file type from extension (`.svg` → `svg/`, `.jpg` → `preview/`, others → `uploads/`)
- Validates user ownership (queries images/jobs table)
- Serves file with correct Content-Type
- Returns 404 if not found, 403 if not owned

### 2f. Job Processor

**New file**: `/Users/johnhuang/projects/svgr_api/src/services/job-processor.ts`

```typescript
export async function processJob(jobId: string): Promise<void>;
```

1. Update job: `status = 'processing'`, `started_at = NOW()`
2. Read image record from DB to get `storage_filename`
3. Resolve image path: `data/uploads/<storage_filename>`
4. Call `runConversionPipeline({ imagePath, quality, smooth, ... })`
5. Save SVG: `saveSvg(svg)` → `svgFilename`
6. Save preview: `savePreview(svg, width, height)` → `previewFilename`
7. Update job: `status = 'done'`, `svg_filename`, `preview_filename`, `svg_width`, `svg_height`, `completed_at = NOW()`
8. On error: update job `status = 'error'`, `error_message`, `completed_at = NOW()`

### 2g. Mount Routes & Cleanup

**File**: `/Users/johnhuang/projects/svgr_api/src/index.ts`

- Mount new routes: `images`, `jobs`, `files`
- Remove old `convert` and `svg` route mounts
- Call `ensureDataDirs()` during startup

**Remove**:

- `/Users/johnhuang/projects/svgr_api/src/services/svg-cache.ts`
- `/Users/johnhuang/projects/svgr_api/src/routes/svg.ts`
- `/Users/johnhuang/projects/svgr_api/src/routes/convert.ts` (after extraction)

**File**: `/Users/johnhuang/projects/svgr_api/src/schemas/index.ts`

- Add `createJobRequestSchema` (Zod)

**Verification**: `bun test`, then manually test endpoints with curl/httpie.

---

## Phase 3: svgr_client — New Client Methods & Hooks

**File**: `/Users/johnhuang/projects/svgr_client/src/network/SvgrClient.ts`

Add new methods:

```typescript
async uploadImage(file: File | { buffer: Buffer; filename: string; mimeType: string }): Promise<BaseResponse<ImageUploadResult>>
// POST /api/v1/images/upload (multipart/form-data)
// Uses native fetch with FormData (not NetworkClient.post, which is JSON-only)
// Auth token obtained via networkClient or passed explicitly

async createJob(request: CreateJobRequest): Promise<BaseResponse<JobResult>>
// POST /api/v1/jobs

async getJobStatus(jobId: string): Promise<BaseResponse<JobResult>>
// GET /api/v1/jobs/:jobId

async getJobsForImage(imageId: string): Promise<BaseResponse<JobResult[]>>
// GET /api/v1/jobs?imageId=:imageId

async fetchFile(filename: string): Promise<Blob>
// GET /api/v1/files/:filename → returns blob

async fetchFileUrl(filename: string): Promise<string>
// Convenience: fetchFile → createObjectURL
```

Note: `uploadImage` accepts both web `File` and a React Native-compatible object with buffer/filename/mimeType.

**File**: `/Users/johnhuang/projects/svgr_client/src/hooks/query-keys.ts`

```typescript
export const svgrKeys = {
  all: ['svgr'] as const,
  convert: () => [...svgrKeys.all, 'convert'] as const,
  jobs: () => [...svgrKeys.all, 'jobs'] as const,
  job: (jobId: string) => [...svgrKeys.jobs(), jobId] as const,
  imageJobs: (imageId: string) => [...svgrKeys.jobs(), 'image', imageId] as const,
};
```

**New hooks**:

`src/hooks/useUploadImage.ts` — `useMutation` wrapping `client.uploadImage()`

`src/hooks/useCreateJob.ts` — `useMutation` wrapping `client.createJob()`

`src/hooks/useJobStatus.ts` — `useQuery` wrapping `client.getJobStatus()` with:

- `refetchInterval: (query) => query.state.data?.data?.status === 'done' || query.state.data?.data?.status === 'error' ? false : 2500`
- `enabled: !!jobId`

`src/hooks/useImageJobs.ts` — `useQuery` wrapping `client.getJobsForImage()`

- `enabled: !!imageId`

**Update exports** in `src/index.ts`.

Mark `useConvert` and `convert()` method as `@deprecated`.

**Verification**: `bun test` in svgr_client.

---

## Phase 4: svgr_lib — Rework useImageConverter

**File**: `/Users/johnhuang/projects/svgr_lib/src/hooks/useImageConverter.ts`

The hook's interface changes significantly. New state:

```typescript
interface ImageConverterState {
  // Settings (unchanged)
  quality: number;
  transparentBg: boolean;
  ocr: boolean;
  mergePaths: boolean;
  imageType: ImageType;
  supportsOcr: boolean;
  supportsTransparentBg: boolean;

  // Upload state (new)
  imageId: string | null;
  isUploading: boolean;

  // Job state (replaces svgResult/isConverting)
  currentJobId: string | null;
  currentJob: JobResult | null;
  isConverting: boolean; // pending or processing

  // Results (changed)
  previewUrl: string | null; // JPEG object URL
  svgFilename: string | null; // for download only

  // History (new)
  jobs: JobResult[];

  error: string | null;
}
```

New actions:

- `upload(file: File): Promise<void>` — calls `uploadImage`, sets `imageId`
- `convert(): void` — calls `createJob` with current settings + `imageId`, sets `currentJobId`, polling begins
- `reset(): void` — clears all state
- `selectJob(jobId: string): void` — switches preview to a different job's results
- `downloadSvg(): Promise<Blob | null>` — fetches SVG blob from server via `fetchFile`
- `downloadFile(filename: string): Promise<Blob | null>` — generic file fetch

Internal: uses `useJobStatus` for polling, `useImageJobs` for job list. When polling detects `status === 'done'`, fetches preview JPEG via `client.fetchFileUrl(previewFilename)`.

**Verification**: `bun test` in svgr_lib.

---

## Phase 5: svgr_app — Frontend Changes

### 5a. Enable Anonymous Auth

**File**: `/Users/johnhuang/projects/svgr_app/src/components/providers/AuthProviderWrapper.tsx` (line 63)

```diff
- enableAnonymous: false,
+ enableAnonymous: true,
```

This ensures every user (even unauthenticated) gets a Firebase UID silently.

### 5b. ConvertPage Flow

**File**: `/Users/johnhuang/projects/svgr_app/src/pages/ConvertPage.tsx`

The page flow changes:

1. **Upload**: `handleFileSelect` now also calls `converter.upload(file)` to persist the image server-side. Show upload progress/spinner on the image panel.
2. **Convert**: `handleConvert` calls `converter.convert()` (no base64 reading — image already uploaded). Button shows "Converting..." while polling.
3. **Preview**: `SvgPreviewPanel` receives `previewUrl` (JPEG URL) instead of `svg` string. Displays the JPEG preview image.
4. **Download**: SVG/PDF download buttons call `converter.downloadSvg()` to fetch the SVG from server, then trigger browser download (SVG) or convert to PDF (jsPDF + svg2pdf.js).
5. **Job History**: New `JobHistoryList` component below the preview showing all conversion variations for this image.

### 5c. Component Changes

**ImageUploadPanel.tsx** — minimal changes:

- Add upload progress indicator (spinner/overlay while `isUploading`)
- Show upload error if it fails

**SvgPreviewPanel.tsx** — significant changes:

- Props change: receives `previewUrl: string | null` (JPEG) instead of `svg: string | null`
- Preview area renders `<img src={previewUrl}>` (JPEG) instead of SVG blob URL
- Download SVG: calls `onDownloadSvg` prop → fetches SVG blob from server → triggers download
- Download PDF: fetches SVG blob → parses with DOMParser → jsPDF + svg2pdf.js → download
- Shows job metadata (status, settings, dimensions)

**ConvertButton.tsx** — minor changes:

- Disabled when `isUploading` too (not just when no file)
- Shows "Uploading..." state when applicable

**New component**: `JobHistoryList.tsx`

- Receives `jobs: JobResult[]`, `currentJobId: string | null`, `onSelectJob: (id) => void`
- Each row: timestamp, settings summary (quality, imageType), status badge
- Clicking a row calls `onSelectJob` to switch preview

### 5d. Remove Old Code

- Remove direct SVG blob URL creation from `SvgPreviewPanel`
- Remove `converter.svgResult` usage (replaced by `previewUrl`)
- The `scaleImageWeb` callback may still be needed at upload time — keep it for now

**Verification**: `bun run verify` (typecheck + lint + build + tests).

---

## File Change Summary

### svgr_types

| File           | Action               |
| -------------- | -------------------- |
| `src/index.ts` | Edit — add new types |

### svgr_api

| File                                  | Action                                      |
| ------------------------------------- | ------------------------------------------- |
| `src/db/index.ts`                     | Edit — add images + jobs tables             |
| `src/db/schema.ts`                    | Edit — add Drizzle schemas                  |
| `src/services/file-storage.ts`        | **New** — filesystem storage                |
| `src/services/conversion-pipeline.ts` | **New** — extracted pipeline                |
| `src/services/job-processor.ts`       | **New** — async job runner                  |
| `src/services/settings-hash.ts`       | **New** — dedup hash                        |
| `src/services/api-version.ts`         | **New** — version reader                    |
| `src/routes/images.ts`                | **New** — image upload endpoint             |
| `src/routes/jobs.ts`                  | **New** — job CRUD endpoints                |
| `src/routes/files.ts`                 | **New** — file serving endpoint             |
| `src/routes/convert.ts`               | **Remove** — replaced by pipeline + jobs    |
| `src/routes/convert-utils.ts`         | Keep — used by conversion-pipeline          |
| `src/routes/svg.ts`                   | **Remove** — replaced by files route        |
| `src/services/svg-cache.ts`           | **Remove** — replaced by persistent storage |
| `src/schemas/index.ts`                | Edit — add job schema                       |
| `src/index.ts`                        | Edit — mount new routes, remove old         |

### svgr_client

| File                          | Action                  |
| ----------------------------- | ----------------------- |
| `src/network/SvgrClient.ts`   | Edit — add new methods  |
| `src/hooks/query-keys.ts`     | Edit — add job keys     |
| `src/hooks/useUploadImage.ts` | **New**                 |
| `src/hooks/useCreateJob.ts`   | **New**                 |
| `src/hooks/useJobStatus.ts`   | **New**                 |
| `src/hooks/useImageJobs.ts`   | **New**                 |
| `src/index.ts`                | Edit — export new hooks |

### svgr_lib

| File                             | Action                  |
| -------------------------------- | ----------------------- |
| `src/hooks/useImageConverter.ts` | Edit — major rework     |
| `src/index.ts`                   | Edit — export new types |

### svgr_app

| File                                               | Action                         |
| -------------------------------------------------- | ------------------------------ |
| `src/components/providers/AuthProviderWrapper.tsx` | Edit — `enableAnonymous: true` |
| `src/pages/ConvertPage.tsx`                        | Edit — new flow                |
| `src/components/SvgPreviewPanel.tsx`               | Edit — JPEG preview            |
| `src/components/ConvertButton.tsx`                 | Edit — upload state            |
| `src/components/ImageUploadPanel.tsx`              | Edit — upload indicator        |
| `src/components/JobHistoryList.tsx`                | **New** — job history list     |

---

## Verification Plan

1. **svgr_types**: `bun test` — types compile, existing tests pass
2. **svgr_api**:
   - `bun test` — existing + new tests pass
   - Manual: upload image via curl, create job, poll until done, fetch preview JPEG, fetch SVG
   - Manual: test dedup (same settings + version = immediate done)
   - Manual: verify file ownership (can't access other user's files)
3. **svgr_client**: `bun test` — new hooks and methods tested with mock network client
4. **svgr_lib**: `bun test` — useImageConverter state transitions tested
5. **svgr_app**: `bun run verify` — typecheck + lint + build + tests
6. **End-to-end**: run dev servers, upload image in browser, convert, see JPEG preview, download SVG, download PDF, verify job history shows multiple conversions

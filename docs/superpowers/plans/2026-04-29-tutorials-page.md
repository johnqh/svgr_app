# Tutorials Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Tutorials section with master-detail layout, 4 SEO-optimized tutorials with unique URLs, and a top menu entry.

**Architecture:** Single `TutorialsPage` component using `MasterDetailLayout` + `MasterListItem` from `@sudobility/components/layout`. Tutorial content is data-driven from i18n keys. Routes use `/:lang/tutorials/:slug?` pattern — no slug defaults to the first tutorial.

**Tech Stack:** React 19, React Router v7, i18next, `@sudobility/components/layout` (MasterDetailLayout), `@sudobility/design` (ui/typography tokens), Tailwind CSS

---

## File Structure

| File                             | Action | Responsibility                                                                |
| -------------------------------- | ------ | ----------------------------------------------------------------------------- |
| `public/locales/en/content.json` | Modify | Add all tutorial content, navigation label, SEO metadata, and sitemap entries |
| `src/components/icons/index.tsx` | Modify | Add `BookOpenIcon` for the Tutorials menu item                                |
| `src/pages/TutorialsPage.tsx`    | Create | Master-detail tutorials page with URL-driven selection                        |
| `src/App.tsx`                    | Modify | Add route, lazy import, menu item, footer link, and sitemap link              |
| `src/pages/SitemapPage.tsx`      | Modify | Add tutorials section to sitemap                                              |

---

### Task 1: Add i18n content to `content.json`

**Files:**

- Modify: `public/locales/en/content.json`

- [ ] **Step 1: Add tutorial content and SEO keys**

Add the following keys to `public/locales/en/content.json`:

1. Under `"navigation"`, add `"tutorials": "Tutorials"`
2. Add a top-level `"tutorials"` object with all 4 tutorial entries
3. Add SEO metadata under `"seo.tutorials"` for the index page and each tutorial slug
4. Add sitemap entries under `"sitemap"`

The full JSON additions:

In `"navigation"` (add alongside existing `"useCases"`):

```json
"tutorials": "Tutorials"
```

New top-level `"tutorials"` key:

```json
"tutorials": {
  "title": "Tutorials",
  "subtitle": "Step-by-step guides for converting different types of images to SVG.",
  "backButton": "Tutorials",
  "items": {
    "ai-logos-to-svg": {
      "title": "Convert AI Logos to SVG",
      "description": "Vectorize AI-generated logos for scalable use",
      "intro": "All AI logo generators — Looka, Brandmark, Hatchful, Logo.com, and others — output raster images (PNG or JPG). Raster logos lose quality when scaled up for banners, merchandise, or print. They appear blurry on high-DPI screens and cannot be edited cleanly in vector design tools like Illustrator or Figma. To use an AI-generated logo professionally, you need a scalable vector (SVG) version.",
      "steps": {
        "title": "How to Convert",
        "step1": "Upload your AI-generated logo image (PNG, JPG, or WEBP).",
        "step2": "Set Image Type to Design. This tells SVGR to preserve hard edges and flat color regions typical of logo artwork.",
        "step3": "Set Quality Level to 5. This captures fine detail without over-complicating the SVG paths. You can adjust up or down depending on the complexity of your logo.",
        "step4": "Click Convert and preview the result.",
        "step5": "Download the SVG. Each download costs 1 credit."
      },
      "tips": {
        "title": "Tips",
        "tip1": "Use a logo image with a transparent or solid background for the cleanest result.",
        "tip2": "If the result looks too simplified, increase the quality level. If it looks too complex, decrease it.",
        "tip3": "The SVG output is a great starting point for designers to fine-tune in Illustrator or Figma — even if it is not pixel-perfect."
      }
    },
    "ai-posters-to-svg": {
      "title": "Convert AI Posters to SVG",
      "description": "Vectorize AI-generated posters for large-format print",
      "intro": "AI image generators like Midjourney, DALL-E, and Stable Diffusion create stunning poster artwork — but they output raster images. Raster images have a fixed pixel resolution and become blurry when printed at large sizes. For posters, banners, and signage, you need a vector format that scales to any size without quality loss.",
      "steps": {
        "title": "How to Convert",
        "step1": "Upload your AI-generated poster image (PNG, JPG, or WEBP).",
        "step2": "Set Image Type to Design. This mode preserves the graphic style and color regions of poster artwork.",
        "step3": "Set Quality Level to 4. Poster artwork is typically less detailed than logos, so a lower quality level keeps file size manageable. Adjust upward if you need more detail.",
        "step4": "Click Convert and preview the result.",
        "step5": "Download the SVG. Each download costs 1 credit."
      },
      "warning": {
        "title": "File Size Warning",
        "text": "AI-generated poster artwork can produce large SVG files because of the complexity and number of colors. A typical poster conversion may result in an SVG file of several megabytes. This is normal for detailed artwork. If the file is too large, try reducing the quality level."
      },
      "tips": {
        "title": "Tips",
        "tip1": "Start with quality level 4 and only increase if the preview lacks important detail.",
        "tip2": "Simpler poster designs (fewer colors, bold shapes) produce smaller and cleaner SVGs.",
        "tip3": "The converted SVG can be printed at any size — from A4 to billboard — without quality loss."
      }
    },
    "qr-code-to-svg": {
      "title": "Convert QR Code to SVG",
      "description": "Vectorize QR codes for crisp large-format printing",
      "intro": "Many QR code generators output raster images (PNG or JPG). A raster QR code works fine on screens, but becomes pixelated when printed large — on banners, posters, vehicle wraps, or signage. This is especially problematic for QR codes with embedded custom graphics or logos, where the detail is lost at low resolution. Converting to SVG ensures your QR code stays crisp and scannable at any print size.",
      "steps": {
        "title": "How to Convert",
        "step1": "Upload your QR code image (PNG, JPG, or WEBP).",
        "step2": "Set Image Type to Design. QR codes are graphic patterns with hard edges, so the Design mode produces the cleanest result.",
        "step3": "Set Quality Level to 5. This captures the sharp edges and fine detail of QR patterns. Adjust if needed — lower for simple QR codes, higher for QR codes with embedded logos.",
        "step4": "Click Convert and preview the result.",
        "step5": "Download the SVG. Each download costs 1 credit."
      },
      "tips": {
        "title": "Tips",
        "tip1": "Always test your converted QR code by scanning it before using it in production. Make sure it still scans correctly after conversion.",
        "tip2": "QR codes with embedded logos or custom colors may need a higher quality level (6-7) to preserve the embedded graphic.",
        "tip3": "The SVG QR code can be resized to any dimension — from business cards to billboards — and will remain scannable."
      }
    },
    "photo-to-svg": {
      "title": "Convert Photo to SVG",
      "description": "Transform photos into abstract vector art",
      "intro": "Converting a photograph to SVG produces a stylized, abstract art effect. Unlike logos or QR codes, photos contain continuous tones and gradients that cannot be represented exactly in vector format. The result is an artistic interpretation — shapes and color regions that capture the essence of the photo in a painterly or posterized style. This is ideal for creative projects, wall art, or stylized illustrations based on real photos.",
      "steps": {
        "title": "How to Convert",
        "step1": "Upload your photo (PNG, JPG, or WEBP).",
        "step2": "Set Image Type to Photo. This mode is optimized for continuous-tone images and produces smoother color transitions.",
        "step3": "Disable Recognize Text. Photos typically don't contain text that needs to be preserved as editable paths.",
        "step4": "Click Convert and preview the result. The output will have an abstract, artistic quality.",
        "step5": "Download the SVG. Each download costs 1 credit."
      },
      "warning": {
        "title": "File Size Warning",
        "text": "Photo-to-SVG conversion can produce large files because photographs contain many color regions and gradients. A high-resolution photo may result in an SVG of several megabytes. For smaller files, use a lower-resolution source image."
      },
      "tips": {
        "title": "Tips",
        "tip1": "Photos with strong contrast, bold colors, and simple compositions produce the best results.",
        "tip2": "The result is not a photorealistic reproduction — it is an artistic vector interpretation. Embrace the abstract quality.",
        "tip3": "Try different source photos to see which styles work best. Portraits, landscapes, and still life subjects each produce distinct results."
      }
    }
  },
  "cta": {
    "title": "Ready to Try?",
    "subtitle": "Upload your image and convert it to SVG in seconds.",
    "button": "Start Converting"
  }
}
```

New SEO keys under `"seo"`:

```json
"tutorials": {
  "index": {
    "title": "SVG Conversion Tutorials - Step-by-Step Guides",
    "description": "Learn how to convert AI logos, AI posters, QR codes, and photos to SVG with step-by-step tutorials. Optimized settings for each use case.",
    "keywords": "SVG conversion tutorial, image to SVG guide, convert logo to SVG, QR code to SVG, photo to SVG"
  },
  "ai-logos-to-svg": {
    "title": "Convert AI Logos to SVG - Step-by-Step Tutorial",
    "description": "Learn how to convert AI-generated logos from PNG/JPG to scalable SVG. Step-by-step guide with recommended settings for Looka, Brandmark, and other AI logo generators.",
    "keywords": "convert AI logo to SVG, vectorize AI logo, AI logo generator SVG, Looka logo to vector, PNG logo to SVG"
  },
  "ai-posters-to-svg": {
    "title": "Convert AI Posters to SVG - Step-by-Step Tutorial",
    "description": "Learn how to convert AI-generated posters to scalable SVG for large-format printing. Step-by-step guide with recommended quality settings.",
    "keywords": "convert AI poster to SVG, vectorize poster, Midjourney to SVG, DALL-E poster to vector, large format print SVG"
  },
  "qr-code-to-svg": {
    "title": "Convert QR Code to SVG - Step-by-Step Tutorial",
    "description": "Learn how to convert raster QR codes to scalable SVG for crisp large-format printing. Step-by-step guide for QR codes with custom graphics.",
    "keywords": "QR code to SVG, vectorize QR code, scalable QR code, QR code for print, QR code vector"
  },
  "photo-to-svg": {
    "title": "Convert Photo to SVG - Step-by-Step Tutorial",
    "description": "Learn how to convert photos to stylized SVG vector art. Step-by-step guide for creating abstract vector illustrations from photographs.",
    "keywords": "photo to SVG, convert photo to vector, photo vector art, image to SVG art, vectorize photograph"
  }
}
```

New sitemap entries — add to `"sitemap.links"`:

```json
"tutorials": "Tutorials"
```

Add to `"sitemap.descriptions"`:

```json
"tutorials": "Step-by-step guides for converting AI logos, posters, QR codes, and photos to SVG."
```

- [ ] **Step 2: Verify the JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('public/locales/en/content.json','utf8')); console.log('Valid JSON')"`
Expected: `Valid JSON`

- [ ] **Step 3: Commit**

```bash
git add public/locales/en/content.json
git commit -m "feat: add tutorials i18n content and SEO metadata"
```

---

### Task 2: Add BookOpenIcon

**Files:**

- Modify: `src/components/icons/index.tsx`

- [ ] **Step 1: Add BookOpenIcon to icons file**

Add this icon component at the end of `src/components/icons/index.tsx`, after the `ImageUploadIcon` component:

```tsx
/** Book open icon used in the navigation menu for "Tutorials". */
export function BookOpenIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
      />
    </svg>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/icons/index.tsx
git commit -m "feat: add BookOpenIcon for tutorials navigation"
```

---

### Task 3: Create TutorialsPage component

**Files:**

- Create: `src/pages/TutorialsPage.tsx`

- [ ] **Step 1: Create the TutorialsPage component**

Create `src/pages/TutorialsPage.tsx` with the following content:

```tsx
/**
 * Tutorials page with master-detail layout.
 *
 * Uses MasterDetailLayout from @sudobility/components to display
 * a list of tutorials in the master panel and tutorial content in
 * the detail panel. Each tutorial has a unique URL slug.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { MasterDetailLayout, MasterListItem } from '@sudobility/components/layout';
import { ui } from '@sudobility/design';
import { buttonVariant } from '@sudobility/design';
import { trackButtonClick, trackPageView } from '../analytics';
import SEO from '../components/seo/SEO';

/** Tutorial slug identifiers — order defines master list order. */
const TUTORIAL_SLUGS = [
  'ai-logos-to-svg',
  'ai-posters-to-svg',
  'qr-code-to-svg',
  'photo-to-svg',
] as const;

type TutorialSlug = (typeof TUTORIAL_SLUGS)[number];

/** Step keys per tutorial — used to iterate i18n step entries. */
const STEP_KEYS: Record<TutorialSlug, string[]> = {
  'ai-logos-to-svg': ['step1', 'step2', 'step3', 'step4', 'step5'],
  'ai-posters-to-svg': ['step1', 'step2', 'step3', 'step4', 'step5'],
  'qr-code-to-svg': ['step1', 'step2', 'step3', 'step4', 'step5'],
  'photo-to-svg': ['step1', 'step2', 'step3', 'step4', 'step5'],
};

/** Tip keys per tutorial. */
const TIP_KEYS: Record<TutorialSlug, string[]> = {
  'ai-logos-to-svg': ['tip1', 'tip2', 'tip3'],
  'ai-posters-to-svg': ['tip1', 'tip2', 'tip3'],
  'qr-code-to-svg': ['tip1', 'tip2', 'tip3'],
  'photo-to-svg': ['tip1', 'tip2', 'tip3'],
};

/** Tutorials that have a file-size warning section. */
const TUTORIALS_WITH_WARNING: TutorialSlug[] = ['ai-posters-to-svg', 'photo-to-svg'];

export default function TutorialsPage() {
  const { t } = useTranslation();
  const { lang, slug } = useParams<{ lang: string; slug?: string }>();
  const navigate = useNavigate();
  const currentLang = lang || 'en';

  const selectedSlug: TutorialSlug =
    slug && TUTORIAL_SLUGS.includes(slug as TutorialSlug)
      ? (slug as TutorialSlug)
      : TUTORIAL_SLUGS[0];

  const [mobileView, setMobileView] = useState<'navigation' | 'content'>(
    slug ? 'content' : 'navigation'
  );

  useEffect(() => {
    trackPageView(
      `/tutorials${selectedSlug ? `/${selectedSlug}` : ''}`,
      `Tutorial: ${selectedSlug}`
    );
  }, [selectedSlug]);

  const handleSelect = useCallback(
    (tutorialSlug: TutorialSlug) => {
      navigate(`/${currentLang}/tutorials/${tutorialSlug}`, { replace: false });
      setMobileView('content');
    },
    [navigate, currentLang]
  );

  const seoKey =
    slug && TUTORIAL_SLUGS.includes(slug as TutorialSlug)
      ? `seo.tutorials.${selectedSlug}`
      : 'seo.tutorials.index';

  const canonicalPath =
    slug && TUTORIAL_SLUGS.includes(slug as TutorialSlug)
      ? `/tutorials/${selectedSlug}`
      : '/tutorials';

  // Build structured data for the selected tutorial
  const structuredData = useMemo(() => {
    if (!slug) return undefined;
    return {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: t(`seo.tutorials.${selectedSlug}.title`),
      description: t(`seo.tutorials.${selectedSlug}.description`),
      step: STEP_KEYS[selectedSlug].map((key, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        text: t(`tutorials.items.${selectedSlug}.steps.${key}`),
      })),
    };
  }, [selectedSlug, slug, t]);

  const masterContent = (
    <div>
      {TUTORIAL_SLUGS.map(tutorialSlug => (
        <MasterListItem
          key={tutorialSlug}
          isSelected={selectedSlug === tutorialSlug}
          onClick={() => handleSelect(tutorialSlug)}
          label={t(`tutorials.items.${tutorialSlug}.title`)}
          description={t(`tutorials.items.${tutorialSlug}.description`)}
        />
      ))}
    </div>
  );

  const hasWarning = TUTORIALS_WITH_WARNING.includes(selectedSlug);

  const detailContent = (
    <div className="space-y-8">
      {/* Introduction */}
      <p className={ui.text.bodyLarge}>{t(`tutorials.items.${selectedSlug}.intro`)}</p>

      {/* Steps */}
      <section>
        <h2 className={`${ui.text.h3} mb-4`}>{t(`tutorials.items.${selectedSlug}.steps.title`)}</h2>
        <ol className="list-decimal list-inside space-y-3">
          {STEP_KEYS[selectedSlug].map(key => (
            <li key={key} className={ui.text.body}>
              {t(`tutorials.items.${selectedSlug}.steps.${key}`)}
            </li>
          ))}
        </ol>
      </section>

      {/* Warning (if applicable) */}
      {hasWarning && (
        <section className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-6 border border-amber-200 dark:border-amber-800">
          <h3 className={`${ui.text.h4} text-amber-700 dark:text-amber-400 mb-2`}>
            {t(`tutorials.items.${selectedSlug}.warning.title`)}
          </h3>
          <p className={ui.text.body}>{t(`tutorials.items.${selectedSlug}.warning.text`)}</p>
        </section>
      )}

      {/* Tips */}
      <section>
        <h2 className={`${ui.text.h3} mb-4`}>{t(`tutorials.items.${selectedSlug}.tips.title`)}</h2>
        <ul className="list-disc list-inside space-y-3">
          {TIP_KEYS[selectedSlug].map(key => (
            <li key={key} className={ui.text.body}>
              {t(`tutorials.items.${selectedSlug}.tips.${key}`)}
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section
        className={`text-center py-8 bg-theme-bg-secondary rounded-2xl border ${ui.border.default}`}
      >
        <h2 className={`${ui.text.h3} mb-3`}>{t('tutorials.cta.title')}</h2>
        <p className={`${ui.text.body} mb-6`}>{t('tutorials.cta.subtitle')}</p>
        <button
          onClick={() => {
            trackButtonClick('tutorial_cta');
            navigate(`/${currentLang}`);
          }}
          className={`${buttonVariant('primary')} rounded-lg px-8 py-3 font-semibold`}
        >
          {t('tutorials.cta.button')}
        </button>
      </section>
    </div>
  );

  return (
    <>
      <SEO
        title={t(`${seoKey}.title`)}
        description={t(`${seoKey}.description`)}
        keywords={t(`${seoKey}.keywords`)}
        canonical={canonicalPath}
        ogType="article"
        structuredData={structuredData}
      />
      <MasterDetailLayout
        masterTitle={t('tutorials.title')}
        masterContent={masterContent}
        detailTitle={t(`tutorials.items.${selectedSlug}.title`)}
        detailContent={detailContent}
        mobileView={mobileView}
        onBackToNavigation={() => {
          setMobileView('navigation');
          navigate(`/${currentLang}/tutorials`, { replace: true });
        }}
        backButtonText={t('tutorials.backButton')}
        contentKey={selectedSlug}
        masterWidth={320}
      />
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/johnhuang/projects/svgr_app && bun run typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/TutorialsPage.tsx
git commit -m "feat: add TutorialsPage with master-detail layout"
```

---

### Task 4: Wire up routing, navigation, and footer

**Files:**

- Modify: `src/App.tsx`

- [ ] **Step 1: Add lazy import for TutorialsPage**

In `src/App.tsx`, add after the `UseCasesPage` lazy import (line 44):

```tsx
const TutorialsPage = lazy(() => import('./pages/TutorialsPage'));
```

- [ ] **Step 2: Add BookOpenIcon import**

In `src/App.tsx`, update the icons import (line 30) from:

```tsx
import { LightBulbIcon } from './components/icons';
```

to:

```tsx
import { LightBulbIcon, BookOpenIcon } from './components/icons';
```

- [ ] **Step 3: Add Tutorials menu item**

In `src/App.tsx`, in the `menuItems` array inside `LangLayoutInner` (around line 76), add a second entry after the `use-cases` item:

```tsx
{
  id: 'tutorials',
  label: t('navigation.tutorials'),
  icon: BookOpenIcon,
  href: `/${currentLang}/tutorials`,
},
```

- [ ] **Step 4: Add Tutorials to footer link sections**

In `src/App.tsx`, in the `linkSections` array, add a Tutorials link to the Product section (after the Use Cases link around line 110):

```tsx
{
  label: t('navigation.tutorials', { defaultValue: 'Tutorials' }),
  href: `/${currentLang}/tutorials`,
},
```

- [ ] **Step 5: Add routes for tutorials**

In `src/App.tsx`, in `AppRoutes`, add after the `use-cases` route (line 215):

```tsx
<Route path="tutorials" element={<TutorialsPage />} />
<Route path="tutorials/:slug" element={<TutorialsPage />} />
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `cd /Users/johnhuang/projects/svgr_app && bun run typecheck`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add tutorials route, menu item, and footer link"
```

---

### Task 5: Add tutorials to sitemap

**Files:**

- Modify: `src/pages/SitemapPage.tsx`

- [ ] **Step 1: Add tutorials link to sitemap sections**

In `src/pages/SitemapPage.tsx`, in the `sections` array inside the first section's `links` array (around line 89), add after the `use-cases` entry:

```tsx
{
  path: '/tutorials',
  label: t('sitemap.links.tutorials'),
  description: t('sitemap.descriptions.tutorials'),
},
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/johnhuang/projects/svgr_app && bun run typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/SitemapPage.tsx
git commit -m "feat: add tutorials to sitemap page"
```

---

### Task 6: Verify everything works end-to-end

- [ ] **Step 1: Run full verify**

Run: `cd /Users/johnhuang/projects/svgr_app && bun run verify`
Expected: All checks pass (typecheck, lint, test, build)

- [ ] **Step 2: Manual smoke test**

Run: `cd /Users/johnhuang/projects/svgr_app && bun run dev`

Verify in browser at `http://localhost:5175`:

1. "Tutorials" appears in the top nav bar
2. Clicking it navigates to `/en/tutorials/ai-logos-to-svg`
3. Master panel shows 4 tutorials in the list
4. Clicking each tutorial changes the detail content and URL
5. Each tutorial shows: intro, steps, tips (and warning for posters/photos)
6. CTA button navigates back to converter
7. Mobile view: shows list first, tap to see detail, back button returns to list
8. Footer has Tutorials link
9. Sitemap page lists Tutorials

- [ ] **Step 3: Final commit (if any lint fixes needed)**

```bash
git add -A
git commit -m "fix: address lint/formatting issues from tutorials feature"
```

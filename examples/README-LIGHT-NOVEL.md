# Red Ribbon Scans — Immersive Light Novel UI

## Integrated pages (current static site)

- **Novel detail:** \`light-novels.html\`
- **Typography-first reader:** \`light-novel-reader.html?c=intro-1\`
- **Reusable style tokens / components:** \`light-novel.css\`
- **Shared state and interactions:** \`light-novel-ui.js\`
- **Content adapter:** \`light-novel-data.js\`
- **Original demo imagery:** \`assets/ln-sample-cover.svg\`, \`assets/ln-sample-illustration.svg\`

These pages intentionally use **HTML/CSS/JS** so they work with the existing no-build Vercel site, with no React migration, Supabase schema change, or runtime CDN dependency. The default palette is dark slate with violet highlights. The current homepage already links to \`light-novels.html\`.

Reader interactions:
1. Font-size and line-height sliders, serif/sans fonts, four themes (dark/light/sepia/OLED).
2. Preferences and bookmark in browser localStorage (per browser/device).
3. Scroll progress and current reading position saved locally.
4. Header hides when scrolling down and reappears when scrolling up.
5. Previous / chapter list / next navigation; clicking illustrations expands a native dialog.
6. Responsive detail hero, metadata, tabs, character-card slots, and honest reviews empty state.

### Updating novel text

Update \`light-novel-data.js\` and add approved chapters to \`volumes[].chapters\`. A chapter is:

\`\`\`js
{
  id: "volume-1-chapter-1",
  label: "1-р бүлэг",
  readMinutes: 8,
  blocks: [
    { type: "paragraph", text: "Бүлгийн текст…" },
    { type: "illustration", src: "assets/approved-image.webp",
      alt: "Зургийн тайлбар", caption: "Тайлбар" }
  ]
}
\`\`\`

Use *textContent*-based rendering for paragraph text; do not pass untrusted HTML. Only add appropriate illustration files from approved sources. Update the preview-only messaging when real chapters are ready. The current demo has **only two small parts of the translated prologue**, not a completed chapter or volume. Original sample art is *not* an official Mushoku Tensei illustration or cover.

### Review and release

Run \`node --test tests/light-novel-ui.cjs\` and the existing site smoke suite, then visually test a narrow Android viewport and desktop in a real browser before merging. Existing protected-main checks and review rules still apply.

## React / Next.js + Tailwind option

A reusable React/Tailwind implementation is included in \`examples/LightNovelPages.jsx\`. For a Next.js app with Tailwind configured, copy it to \`components/LightNovelPages.jsx\`, import it from a client route, and pass a matching \`novel\` object plus router callbacks:

\`\`\`jsx
"use client";
import { useState } from "react";
import { NovelDetailPage, NovelReaderPage } from "@/components/LightNovelPages";

export default function NovelDemo({ novel }) {
  const [chapterId, setChapterId] = useState(null);
  return chapterId === null
    ? <NovelDetailPage novel={novel} onRead={setChapterId} />
    : <NovelReaderPage novel={novel} chapterId={chapterId}
        onNavigate={setChapterId} onBack={() => setChapterId(null)} />;
}
\`\`\`

For React, flatten data to \`novel.chapters\` with entries such as \`{id,title,blocks}\`. Put the demo image files in Next's \`public/assets/\` folder. The JSX is provided as a **reference component**; the repository's live pages use the static implementation. Next.js/Tailwind are not installed in the current static site.

# Red Ribbon Scans — Simple catalog redesign

The redesign is intentionally **inspired by Comix.to's uncluttered reading experience**, not a pixel-for-pixel copy. It preserves the Red Ribbon Scans logo, purple accent, Mongolian copy and existing business logic.

## Changed
- Small, flat header with **all navigation links still available** at mobile sizes.
- Compact introduction instead of the giant rotated-card hero banner.
- Main **cover-first manga catalog**, with newest published chapters in a right sidebar on desktop.
- Responsive mobile catalog (3 cards, down to 2 on tiny screens); updates appear underneath.
- Latest updates have small cover thumbnails, title, chapter and date.
- Manga cards keep **Favorites**, **Next chapter**, **Details**, **Share**, and a collapsible **My Library status** control.
- Clean dark theme by default; light mode remains usable via the existing theme toggle on pages that expose it.
- Manga details, Reader, My Library, Stats and Feedback share the flatter design.
- Single \`simple-comix.css\` stylesheet, appended after existing styles to avoid risky rewrites.
- Cache refresh to \`red-ribbon-v19\`.

## No database changes
**No Supabase SQL, environment variables, imports or extra backend dependencies.**
Existing authentication and user data remain untouched.

## Check before merging
1. Open the Vercel Preview from the PR, inspect desktop and phone layouts.
2. Open/close Favorites, History and the login/profile dialog.
3. Search titles, filter by genres, sort, choose random title and click a manga.
4. Use a card's "＋ Миний сан" dropdown and its next-chapter/share controls.
5. Inspect Reader (scroll/page mode), Manga Details, My Library and Stats.
6. Check light/dark theme and a narrow viewport.
7. Merge once after review. Production will build once from main; PR branch pushes can create Preview builds.

Automated checks:
\`node --test tests/site-smoke.cjs tests/next-10.cjs tests/simple-design.cjs\`

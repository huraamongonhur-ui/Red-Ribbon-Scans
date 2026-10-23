# Red Ribbon Scans — 10-feature release (one PR)

## Important: BEFORE merging

1. Ensure previous Supabase migrations are installed: \`supabase.sql\`, \`admin.sql\`, \`admin_2.sql\`, \`community_3.sql\`.
2. Open the **existing** Supabase project's SQL Editor.
3. Run all of **next_10.sql**. Confirm there are no errors.
4. Confirm RLS enabled on \`user_chapter_progress\` and \`admin_activity_log\`.
5. Verify that \`catalog_manga.publication_status\`, \`comments.edited_at\`, updated \`reader_submissions.kind\` constraint exist.
6. Only after successful SQL: review PR checks and **merge once** to main. Wait for Vercel Production "Ready".
7. Hard-refresh the app (Ctrl+Shift+R); test both normal user and admin.

No new Vercel environment secrets; no scheduled background jobs.

## The 10 features

1. **New Chapter Notifications:** bell on homepage compares the user's currently favorited manga's published chapter IDs to a *device-local* snapshot. First visit creates a baseline. Later visits show detected additions. It is **not** Web Push, email, SMS or background monitoring. Notification state is namespaced by signed-in user ID, or \`guest\`.
2. **Reading Statistics 2.0:** \`stats.html\` shows per-account or guest read-chapter/series counts, seven-day activity, bookmarks and continue-reading links. Signed-in results read private \`user_chapter_progress\` under RLS; guest history is local-only.
3. **Chapter Bookmarks:** reader **☆ Хуудас тэмдэглэх** button saves the current chapter and page, and \`stats.html\` links back to it. Signed-in bookmarks are synced; guest bookmarks remain on their device.
4. **Comment System 3.0:** user can edit their own comment, wrap a spoiler using \`[spoiler]text[/spoiler]\`, and report another user's comment to the admin moderation queue. Supabase owner-only update policy, immutable comment ownership and moderation RLS enforce safety.
5. **Reader 3.5:** failed images can be retried; page progress emits sync events and per-chapter bookmarks persist. A manga reader URL with \`?p=N\` starts on that page (for paged reading).
6. **Manga publication status:** independent from reading status, \`ongoing\`, \`completed\`, \`hiatus\`. Admin editor writes status, catalog and Details show it. Existing titles default to \`ongoing\`.
7. **SEO & Sharing 2.0:** static site-level Open Graph metadata, \`robots.txt\`, starter \`sitemap.xml\`, detail-page runtime title/description/Open Graph tags and schema.org CreativeWork JSON-LD. **Limitation:** JavaScript-generated manga-specific metadata is not guaranteed to be evaluated by social link crawlers. Static sitemap lists only the known static title; dynamic Admin-added titles require a generated sitemap/server rendering for complete indexing.
8. **Admin Bulk Upload:** ZIP uploaded and unpacked in the admin's browser (JSZip 3.10.1 CDN). Strict \`chapterNumber/imageFilename.ext\` paths, 80 MB ZIP limit, 240 MB decompressed total, 320 total images, up to 80 images per chapter, 10 MB each. Images uploaded to existing Supabase Storage and catalog updated once; on failure, already uploaded files are removed best-effort. Admin rights and Storage RLS required. **Never include ZIP files with unrelated content**; large ZIPs may stress low-RAM devices.
9. **Reading History Sync:** reader writes \`user_chapter_progress\` via RLS, and My Library now combines its old \`reading_history\` with synced chapter progress. \`stats.html\` displays it on another signed-in device. The previous device-local history remains; **guest history/bookmarks are not silently uploaded** when signing into an account.
10. **Admin Activity Log:** database triggers on \`catalog_manga\` and \`manga_workflow\` INSERT/UPDATE/DELETE record actor, action, manga ID and time. Admin-only read; client has no direct log write. Changes to comments, profile avatars and pre-migration edits are **not** logged. This is not a full immutable compliance audit system.

### Bulk ZIP example
\`\`\`
chapters.zip
  1/
    001.png
    002.png
  2/
    001.jpg
    002.webp
\`\`\`
The files above must be directly at \`1/001.png\` etc. ZIP containing nested root directories is rejected.

## Manual end-to-end checks
- Homepage: bookmark favorites, reload, add an actual chapter in Admin and check bell **on the next visit**, no alert on first baseline.
- Reader: test bookmark toggling, page switching, failed-image retry, guest and signed-in use, sign-out/sign-in isolation.
- Sign into two separate accounts and confirm no account's bookmarks, stats or history show in the other.
- Account A: read Chapter 2, open \`stats.html\` on another device signed into A; confirm the chapter appears after sync.
- Comment owner can edit own but not others; spoiler is hidden until tapped; non-owner can report; admin sees \`comment_report\`.
- Admin Manga editor: status ongoing/completed/hiatus saves and appears on details and catalog.
- Admin ZIP: small valid ZIP succeeds; wrong paths, oversized images and over-limit counts are rejected; chapter replacement asks for confirmation.
- Admin Activity Log: save/update a manga, refresh the log, verify action entry. Non-admin must not view it.
- Test links/metadata on manga detail. For dynamic social cards, consider future server-side rendering.
- Verify previous Login, My Library, Favorites, Admin Upload, requests and chapter reading are unaffected.

Run tests locally:
\`\`\`bash
node --test tests/site-smoke.cjs tests/next-10.cjs
\`\`\`

## Deployment cost
All source changes are combined into one branch/commit/PR. Pushing a branch can still trigger **one Vercel Preview deployment**. Merging to main triggers a Production deployment. Do not merge before SQL installation and Preview review.

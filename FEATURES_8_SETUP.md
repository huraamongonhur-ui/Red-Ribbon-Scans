# Red Ribbon Scans — Features 8 Batch

One branch, one commit and one PR. No action was taken on protected main.

## FIRST: run community_3.sql before merging

1. Open the existing Supabase project's SQL Editor.
2. Copy and run [community_3.sql](community_3.sql) in full.
3. Verify that \`reader_submissions\` and \`manga_workflow\` exist and have **RLS enabled**. Check \`catalog_manga.description\` column was added.
4. Only after the SQL succeeds: merge the PR once; verify Vercel Production Ready.
5. Hard refresh (Ctrl+Shift+R) and test.

SQL requires the previous \`admin.sql\` and \`admin_2.sql\` already applied. **No new Vercel secrets** or payment services needed.

## Features

1. **Manga Details 2.0** — manga.html?m=<id>, synopsis, chapters, genres, rating, heart and account-backed reading status. Synopsis is editable in Admin Dashboard; older/static manga show a safe fallback.
2. **Latest Updates 2.0** — sorted published chapter dates on homepage (up to nine). No server jobs.
3. **Reader 3.0** — image load/failure counter, fit-width setting saved on device and report link with chapter and page numbers.
4. **Manga Request System** — feedback.html creates authenticated requests visible to submitting user and admins.
5. **Broken Page Report** — same page with \`kind=report\` and manga/chapter/page query parameters; admin can triage.
6. **Advanced Search 2.0** — existing title/genre/sort plus minimum chapter count and minimum rating filters.
7. **Recommendations** — local, deterministic genre suggestions based on locally read manga and the signed-in account's favorites. Does not use AI and does not guarantee strong suggestions without browsing history.
8. **Admin Dashboard 3.0** — new submission queue with status and admin notes, editorial stages and target dates, plus editable manga synopsis.

**Editorial target dates do not automatically publish a chapter.** Admin must use existing chapter manager to publish. Do not rely on these dates as a release scheduler.

## Security & moderation

- Users can insert only their own, \`new\` submissions and read only their own submissions; no anonymous user read access.
- Only admins (validated by \`is_admin()\` and table RLS) may list all submissions and update statuses and admin notes.
- Manga workflow stages, target dates and notes are visible to admins only.
- User input displayed with DOM \`textContent\`; not interpolated into HTML.
- Existing favorites, profile, comments, manga catalog and auth tables remain untouched.

## Manual smoke check after deployment

1. Open homepage; inspect Latest Updates and recommendation section.
2. Use chapter-count and rating filters; reload and verify normal catalog behavior.
3. Open a manga detail page, all chapter links, account favorite and reading status.
4. Log in with a regular user; create request and report, review **My Requests**. Verify no other user's requests appear.
5. Open reader; toggle reading width, navigate pages, create page report; check correct manga/chapter/page data.
6. Open Admin Dashboard with an admin account; inspect submission queue, edit status/notes and target date. Confirm normal users cannot access the queue.
7. Save synopsis to managed manga and open its details page.
8. Verify mobile layout. Existing site readers, uploads, reviews and My Library should still work.

Test command: \`node --test tests/site-smoke.cjs\`. No automated SQL integration test is supplied; the SQL must be executed on the user's Supabase project before merging.

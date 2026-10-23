# Light Novel Studio 4.0 — deployment guide

This feature is implemented on top of Red Ribbon Scans' existing static pages, Supabase Auth/RLS and Vercel hosting. It does not change the Manga Manager's data model. **The SQL migrations are not applied by a GitHub merge.**

## Enable the Studio (required)

1. Confirm the existing \`admin.sql\` migration and \`public.is_admin()\` function are installed. Log in with a registered admin account.
2. In your **existing** Supabase project, open **SQL Editor** and run \`light_novel_admin.sql\` **once**. Then run \`light_novel_admin_extra.sql\` **once**.
3. Open \`light-novel-admin.html\` through Admin Dashboard → **LN удирдах**. Verify novel creation and a draft chapter.
4. Before production release: test unauthenticated select against \`ln_chapters\` (draft must be invisible); reviewer access to assigned novels only; published/scheduled chapter access by anon when due; storage uploads; review queues.
5. Test Android and desktop and get \`static-audit\` green before merging the PR.

## Features

- **Smart Import**: TXT, Markdown, DOCX (Mammoth 1.8.0), EPUB (JSZip 3.10.1). Inspect extracted text and either paste into the editor or automatically detect chapter headings and bulk save **draft** chapters. EPUB images/formatting are **not** automatically preserved; add approved illustrations separately. Import max 20MB/file, 80 chapters/action, 300K characters/chapter.
- **Translation Glossary**: per-novel source/translation/note, admin-managed, readable by assigned reviewers.
- **Quality Check**: local deterministic duplicate paragraphs, long paragraphs, repeated punctuation, glossary terms. It is **not** AI proofreading or a guarantee of natural Mongolian.
- **Scheduled Publishing**: admin approves, then marks a chapter \`scheduled\` with future \`release_at\`; RLS makes it visible at the scheduled timestamp **without** an always-on job. The **novel** must also be \`published\`. Dates are stored UTC and input in the editor's local time.
- **Chapter Organizer**: drag/drop and atomic \`ln_reorder_chapters()\` RPC, checked against the currently selected novel.
- **Analytics**: RLS-backed signed-in reader open/completion (90% scroll), at most one event per user/chapter/day/type. Admin summaries are based on capped recent rows; **not** all user traffic. Guests are untracked.
- **Private Reviewer Access**: admin grants an existing Supabase Auth user UUID per novel. Reviewer logs in on \`light-novel-admin.html\` to view assigned draft manuscripts and leave notes; RLS prevents unauthorized draft reads. The older \`ln-review-mushoku-v1.html\` is **not** secure and must not be used to hold private manuscripts.
- **Release Notifications**: signed-in followers get **in-app notices on a future visit** to the Light Novel catalog when a newly published/scheduled chapter appears. No push permission, email, cron or external notification job. A new follower's first check establishes the baseline.
- **Version History and Art**: previously saved chapter content automatically snapshots before changes. Admin can restore an older version as **draft**; approved public art uploads use the \`ln-public-art\` storage bucket. **This bucket is public — do not upload confidential artwork before release.**

## Adding novels

Novel slugs must be unique. New records and chapters live in Supabase instead of committing a new \`light-novel-data.js\` for every novel. Reader pages automatically load public records with published chapters only; approved and unpublished drafts remain private.

The original Mushoku Tensei short prologue sample remains in the built-in demo catalog until replaced by a published Supabase record with the same slug. A sample is not a complete translated volume.

## Permissions and release caution

- The interface checks \`public.is_admin()\` but **Supabase RLS**, not hidden client controls, protects content.
- \`ln_reviewers\` grants are per-novel; reviewers cannot update text or publish chapters.
- Never place service-role tokens in client files.
- Both SQL migration scripts must be applied before the new admin screens can store any changes.
- If the third-party DOCX/EPUB libraries fail to load, TXT/Markdown import still works; retry the others with a working connection.
- Any pre-existing public GitHub HTML/preview samples remain public. Use only the new RLS-backed Studio for private drafts.

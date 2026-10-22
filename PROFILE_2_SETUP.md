# User Profile 2.0 — Supabase setup (Red Ribbon Scans)

## Required deployment order

**1. Run the database migration FIRST**, while your current site is still live:

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your Red Ribbon Scans project.
2. Open **SQL Editor** → **New query**.
3. Copy the full contents of [profile_2.sql](profile_2.sql), run it once.
4. Confirm success; this extends existing profiles and creates cloud reading history and a public avatar bucket. It does **not** delete existing users or comments.
5. Check Supabase Storage → Buckets for a Public bucket named profile-avatars, allowing JPEG/PNG/WebP up to 2 MB.

**2. Merge the Pull Request into main**, then allow Vercel to deploy it.

**3. Test on https://red-ribbon-scans.vercel.app**

- Sign in using an existing account.
- Click the **👤 account button** (the old button logged out immediately).
- Edit username + short bio and save; close/reopen to verify persistence.
- Choose an emoji avatar or upload a JPEG/PNG/WebP file (max 2 MB).
- Visit a manga chapter as a signed-in user; check the chapter count in your profile.
- Click the **Энэ төхөөрөмжийн уншсан түүхийг аккаунтад хадгалах** button to import older browser-local history explicitly, then refresh.
- Verify comments/ratings remain functional and admin access is unchanged.
- Verify Logout works inside the profile dialog.
- Test on mobile and desktop.

## Features and data behavior

- **Profiles:** username, bio and selected emoji/uploaded photo stored in public.profiles; updates use owner-only row-level security.
- **Avatars:** optional images stored under profile-avatars/<user-id>/<random>.png|jpg|webp. Photos are **publicly readable**; only the signed-in owner may upload/delete in their own folder. No secret keys are sent to the browser.
- **Stats:** number of unique manga chapters in public.reading_history, plus the signed-in user's comment and review counts.
- **Reading history:** new chapter visits while signed in are saved to Supabase to follow the account across devices. Older reads only in localStorage are imported **on explicit user click**, not automatically into another account.
- **Achievements:** six badges based on reading, comments, reviews and local favorites.
- **Favorites:** the existing site stores favorites in browser localStorage, **not Supabase**. Favorite manga and favorite count are per-device, not synced across devices.
- **Profile dialog:** available from the homepage and chapter reader with existing Login/Sign Up preserved.

## Troubleshooting

- Profile error about profile_2.sql: run the migration before merging.
- Avatar upload error: check the bucket, MIME/size limits and own-folder insert policy.
- Zero reading stats: read one chapter while signed in, or import older history.
- Old UI: wait for Vercel production deployment and refresh site/service worker cache.
- No new Vercel environment variables needed; existing Supabase Login configuration stays the same.

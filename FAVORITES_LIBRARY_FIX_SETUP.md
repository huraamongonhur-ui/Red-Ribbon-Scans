# Favorites + My Library fixes — Red Ribbon Scans

## Required rollout order
1. Open the Supabase project's **SQL Editor**.
2. Copy and run all of [favorites_cloud.sql](favorites_cloud.sql). It adds an account-scoped favorites table with RLS; existing My Library statuses are unchanged.
3. Merge the PR into GitHub main; wait until Vercel production is Ready.
4. Refresh the site with **Ctrl+Shift+R**.

## Expected behavior
- **Heart (♡/♥)** on the homepage: when signed in, favorite manga is saved in the account's private Supabase favorites table. Clicking again removes it **from favorites only**; Reading / Completed / Planned status is preserved.
- The heart modal, Profile 2.0 favorites, and the **♥ Хайртал** tab on My Library all show the **same account-synced favorites**.
- When signed out, the homepage's existing heart continues to save favorites **on this device only**, preserving anonymous behavior and older saved data.
- **Import previous favorites:** On My Library while signed in, select **Энэ төхөөрөмжийн хуучин зүрхэлсэн мангуудыг синк хийх**. This imports only after explicit confirmation, never silently transfers another person's anonymous/device favorites into an account. Existing device favorites are not deleted.
- **Өөр манга нэмэх:** Open the My Library page and click **+ Өөр манга нэмэх**; choose from the site's available manga by searching titles. Set Reading / Completed / Planned or tap the heart inside the modal. No detour to homepage.
- Removing a status does not remove a heart; removing a heart does not remove a status. To remove a manga completely from **My Library**, clear its status AND unheart it.
- Adding completely new manga chapters/content to the **site** remains an Admin Dashboard task; "Өөр манга нэмэх" adds existing manga to *your personal list*.

## Safety
- New table \`public.user_manga_favorites\` uses \`auth.uid()\` RLS for SELECT/INSERT/DELETE and is inaccessible to anonymous users.
- Neither \`public.user_manga_library\` nor existing \`rr_favs\` is deleted. No admin/service-role key is needed in the browser.
- Account lists never sync old anonymous favorites without user confirmation.
- Favorites errors remain visible if the new SQL migration is missing; reading statuses can still work.

## Test checklist
1. Run favorites_cloud.sql before merging.
2. Sign in, heart a manga on the homepage, then check both the top heart modal and the **♥ Хайртал** tab. Refresh and check again.
3. Change manga's status to Reading, unheart it. Check the Reading status remains.
4. In My Library, click **+ Өөр манга нэмэх**, search a different manga and set its status. Check that both appear in the list.
5. On a different device with the same account, verify favorites/statuses appear after signing in and refreshing.
6. Log out, then sign in with another account and ensure the previous account's favorites aren't shown.
7. If the device has old anonymous favorites, use the explicit import button. Confirm it doesn't delete the local list.
8. Confirm existing Login, manga reader, comments, rating, User Profile, and Admin Dashboard still work.

# Changelog

Notable changes to BookHoarder. Versions correspond to iOS build numbers on TestFlight / App Store Connect.

## [Unreleased]

### Added
- **Privacy Policy and Help & Support links** in Settings → About. They open the new pages in the repo's `docs/` folder (served by GitHub Pages), which replace the unfilled `privacy-policy.html` template. App Store Connect needs the privacy and support URLs, and the policy must also be reachable in-app.

- **Report and block** (App Store Guideline 1.2). A ⋯ button on other readers' reviews, on shared shelves (in the header), on card applications, cardholders and book requests on your shelves, and on suggested catalog edits opens **Report** and **Block**.
  - Reports go to the developer with the reason and a server-side snapshot of the content. Signed-out viewers can report by email.
  - Blocking someone hides their reviews, shelves, applications, requests and suggestions from you. It also stops them applying to or requesting from your shelves and removes their existing cards and requests there.
  - Blocked users are managed in Settings → Account → **Blocked users**.
  - Enforced in the database: migration `20261007000000_report_and_block.sql` adds restrictive RLS policies, plus `report_content()` and a block trigger. It was tested against a database rebuilt from all migrations; the moderation runbook is in `supabase/tools/MODERATION.md`.
- **Terms of Use** (`docs/terms.html`), including no tolerance for objectionable content. The sign-in sheet now says that continuing means agreeing to the Terms and Privacy Policy, and Settings → About links to the Terms.

### Changed
- The Claude API key note in Settings no longer says the key "never leaves your phone". It is sent to Anthropic with each Claude request.

### Security (Supabase)
- **Re-closed shelf privilege-escalation holes** (`20261006000000_reharden_shelf_policies.sql`) — the repo's original shelf migrations still held the pre-July policies, and CI's first `supabase db push` (2026-08-08) re-created them next to the hardened ones. From then until this fix, unclaimed invite tokens were readable (even signed out), any signed-in user could claim an invite card without its token, and applicants/requesters could approve their own cards and requests. The migration drops those policies and restores owner-only updates with no direct access to invite rows (invites go through `get_invite` / `claim_invite`). Verified against the vulnerable state: 6 exploits reproduced before, all blocked after, owner/cardholder flows unaffected.
- **Revoked exposed invites** (`20261006000100_revoke_exposed_invites.sql`) — every unclaimed invite created before the fix deployed is deleted, since its token was publicly readable. Old links now show "Invite Not Found"; owners re-share from the shelf screen. An audit of members and approvals since 2026-08-08 found no abuse.
- **Production schema now fully captured in migrations** — `profiles`, `book_ratings`, the `handle_new_user` trigger, the `get_invite` / `claim_invite` RPCs, and the realtime settings had only ever been applied by hand. `20240831000000_profiles_and_ratings.sql` and `20261006000200_capture_invite_rpcs.sql` re-declare them (no-ops on production), a duplicate owner-only card policy is dropped, and CI now uses `db push --include-all`. A database rebuilt from the migrations alone matches a read-only export of production; `supabase/tools/` keeps that drift check runnable.

## [Build 20] — 2026-10-05 (TestFlight)

### Added
- **Edit every book detail in one place** — the book detail screen's pencil opens an "Edit Details" sheet that edits cover image, title, author(s), publisher, year, pages, synopsis, classification (3-step Class → Section → Division picker), and Level 4 format/tags. Classification, format, and tag editing (previously inline on the detail screen) now live here too; the detail body shows them read-only and taps through to the editor. Edits are drafted and saved together, then synced to Supabase shelves. An "Ask Claude to suggest classification" button appears in the sheet, proposing the division plus Level 4 suffix and tags in one shot.
- **Set a custom cover image** — a book's cover can be chosen from the photo library or removed from the Edit Details sheet. Picked images are copied into the app's covers directory (adds the `expo-image-picker` native module, so this feature needs a new build).
- **Shared community catalog** — when you add or edit a book, its metadata is contributed to a shared, ISBN-keyed catalog. When another user adds the same ISBN, the lookup returns the community-curated version, with the external APIs (OpenLibrary / Google Books) filling any gaps. MVP scope: text metadata only (custom covers stay on-device), and it seeds new adds rather than back-filling copies already added.
- **Catalog edits need the contributor's approval** — the reader who first adds a book to the shared catalog owns that entry. Their own edits apply directly; anyone else's Edit Details changes become a suggestion ("Suggestion Sent") that the contributor approves or rejects from Settings → Account → Suggested edits, which shows each change as old → new. Adding a book never changes or suggests changes to an existing entry, and details guessed by Claude are never published. Covers are only shared from OpenLibrary/Google, and field lengths are capped.

### Changed
- **Search results survive opening a result** — in Add Book, selecting a search result and then going back now returns to the results list ("Back to results") instead of resetting the search.
- **"Ask Claude" buttons only show with an API key** — the classification-suggestion and fill-missing-fields buttons on the Add and detail screens are hidden unless an Anthropic API key is saved, instead of always showing and alerting on tap.
- **Empty shelves are hidden from public browse** — public shelves with no books no longer appear in Browse until they contain at least one book.

### Fixed
- **Due dates were off by a day in US time zones** — a due date picked in the evening was saved as the next day (it was converted to UTC first), and stored due dates were read as UTC midnight, so loans showed as overdue from the evening *before* they were due and displayed a day early. Due dates are now plain local calendar days throughout: a loan is due all day on its due date, shows "Due today", and is overdue from the next morning. Lateness on returned loans counts calendar days. (Due dates saved by earlier builds may still be a day late.) The three copies of the overdue check now share one implementation.
- **ISBNs are stored in one canonical form** — books were saved with the ISBN exactly as typed or scanned, so a hyphenated or ISBN-10 entry created a duplicate record instead of a second copy and missed community ratings / catalog matches. ISBNs are now normalized to ISBN-13 on save, existing records are converted by a schema v6 migration, and only valid ISBN-13s are contributed to the community catalog.
- **Scanner fixes** — scanning a second book in the same Add Book session was silently ignored; scanning a non-ISBN barcode (e.g. a price/UPC code) now says so and keeps the camera open instead of looking it up; EAN-8 (never an ISBN) is no longer scanned.
- **Picked search results are no longer wiped** — if the follow-up ISBN lookup failed or found nothing, the chosen search result was cleared from the form. It's now kept, and a successful lookup only fills fields the lookup itself provides.
- **Duplicate copy numbers** — adding a copy after deleting an earlier one could reuse an existing copy number; numbering now continues from the highest existing copy.
- **Covers could disappear after an app update** — covers were stored as absolute file paths, which break if iOS moves the app's data container on update or restore. Cover paths are now rebuilt against the current app directory when read (fixes existing covers too).
- **Patron colors missing on loans** — loan lists and the book detail's current-loan card never loaded the patron's color (or "patron since" date).
- **Failed adds left orphaned cover files** — the cleanup after a failed save used a file API that always throws in Expo SDK 54.
- **Default sort in Settings** — Settings only knew Author/Title, showed the wrong value when a classification sort was chosen, and overwrote it when tapped; it now cycles through all five sorts, and both screens pick up a change made in the other.
- **"BookVault" in user-facing text** — the patron shelf invite and library export now say BookHoarder.
- **Shelf management features were unreachable** — the shelf screen opened from the Shelves tab was an older duplicate. The per-book Remove list (listed under Build 14) and live updates for card applications and book requests lived in a Settings copy of the screen that nothing navigated to. The Shelves tab now uses the full screen, and the orphaned `app/settings/library/` copy (including its never-reachable "make all shelves public/private" toggle) is removed.
- **Books returned from the Lending tab stayed "on loan" on shared shelves** — "Mark Returned" on the Lending tab updated the local loan but never cleared the shelf copy's on-loan flag (the book detail and patron screens already did). It now syncs like the other return paths.

### Backend (Supabase)
- **`community_books` table** (deployed 2026-08-08) — shared, ISBN-keyed metadata catalog with RLS, readable by any authenticated user. Its original open write policies (any signed-in user could overwrite any entry) were replaced by the approval migration below before any app build wrote to it.
- **`public_library_directory` view** — public shelves with at least one book, with owner display name and book count precomputed; powers Browse and excludes empty shelves at the database level.
- **Catalog edit approval** (`20261005000000_community_edit_approval.sql`) — `community_books.created_by` ownership (backfilled from `updated_by`; orphaned entries are adopted by the next contributor), `community_book_edits` suggestions table with RLS (proposer + owner read, proposer withdraws pending), writes only through SECURITY DEFINER RPCs `contribute_community_book` / `review_community_edit` (direct insert/update policies removed), validated field limits and a cover-host allow-list. Existing rows are cleaned to fit: rows with non-ISBN-13 keys or blank titles are deleted, `http` covers upgraded and foreign covers removed, over-long text trimmed. Tested against a throwaway Postgres 17 with simulated users.
- **Migrations are now CLI-managed and auto-deployed** — the hand-run SQL files moved into `supabase/migrations/` (idempotent) and a GitHub Actions workflow runs `supabase db push` against the linked project on pushes to `main`.

### Notes
- iOS build numbers now come from EAS (`appVersionSource: remote`). Builds 17–18 were never created (the counter advanced without a build) and build 19 failed on the EAS worker (lost connection), so 20 is the first build of this release.
- Opening this build runs local schema v6, a one-time conversion of stored ISBNs to ISBN-13.
- Pushing to `main` does not start an EAS build; builds are run manually with `eas build --auto-submit`.

## [Builds 15–16] — 2026-07-19 / 2026-08-08 (TestFlight)

Both built from the same commit; 16 is a rebuild of 15.

### Added
- **Classify books from the detail screen** — books without a classification showed a "Classify this book" row; classified books showed a pencil icon on the classification card. Both opened the 3-step picker (Class → Section → Division), alongside an "Ask Claude to suggest classification" button proposing the division plus Level 4 suffix and tags. Changes synced to Supabase shelves immediately. (Folded into the Edit Details sheet in Build 20.)

### Fixed
- **Orphaned shelf entries are now removable** — if a copy was deleted with "Keep on Shelves", navigating to its detail showed a dead-end "Book not found." screen. It now shows a "Remove from All Shelves" button to clean up the dangling shelf entry.
- **Shelf pills only show shelves you own** — cardholders of a public shelf were seeing a pill on book detail and add screens that let them add books to that shelf (an action only the owner can perform). `getMyLibraries` now filters by `owner_id` so member-only shelves never appear in the UI.

## [Build 14] — 2026-07-12 (TestFlight)

### Added
- **RFFC v4.0 classification system** — `RFFC-v4-comprehensive.md` (repo root) is the schema source of truth. `node scripts/generate-rffc.js` regenerates the bundled seed data (10 classes / 87 divisions / 470 sections, plus the Level 4 suffix table and tag vocabulary). Settings → Classifications has an "Import RFFC v4.0" button; the import is transactional and merges by code, so re-importing after a doc update only adds what's new. Terminology note: RFFC Class → Division → Section maps onto the app's MainClass → Section → Division.
- **Level 4 suffixes & tags** — each copy can carry one form/audience suffix (`–a` anthology, `–g` graphic novel, `–y` young adult, …) and lowercase secondary-genre tags. A collapsible "Format & Tags" chip section appears on the Add Book and book detail screens (detail-screen edits save immediately; custom tags supported). Full call numbers render as `500.20.03 –a , scifi`.
- **Classification-level sorting** — the Library tab now sorts by Class, Section, or Division in addition to Author and Title. Classification sorts order hierarchically to the chosen depth (unclassified books last), and each row's call chip shows the code at that depth.
- **Shelf book management** — the owner's shelf screen (Settings → Shelves) lists the books on the shelf with a per-book Remove action.
- **Delete-copy shelf prompt** — deleting a copy that is on shared shelves now asks whether to remove it from those shelves too, and reports (rather than silently swallowing) a failed shelf removal.

### Changed
- **AI classification suggestions are ~20× cheaper and faster on repeat use** — the prompt sends RFFC codes instead of internal UUIDs (about half the tokens), the taxonomy lives in a prompt-cached system block with a 1-hour TTL, and the serialized taxonomy is memoized until the hierarchy changes. Suggestions now also propose a Level 4 suffix and tags.

### Fixed
- **Display-name prompt never appeared after sign-in** — the prompt's modal was being presented while the sign-in sheet was still up, so iOS tore it down when the sheet dismissed. It now waits for the sheet to fully close.
- **Foreign-key enforcement was silently off after the first app session** — `PRAGMA foreign_keys = ON` is connection-scoped but was only set during the initial migration; it now runs on every database open.
- **Schema migrations are now transactional** — a crash mid-migration can no longer leave the database version pointing at a partially applied schema.

### Backend (Supabase, applied 2026-07-08, not tied to an app build)
- `library_cards` and `book_requests` set to `REPLICA IDENTITY FULL` so the owner screen's filtered realtime subscription receives DELETE events (e.g. a withdrawn card application now disappears live).

## [Build 13] — 2026-07-07 (TestFlight)

### Added
- Sign in with Apple (native flow, black button style; name captured on first authorization).
- Email/password sign-in and sign-up with mandatory email confirmation; password policy of 8+ characters with mixed classes.
- Editable display name: prompted once after first sign-in, editable anytime in Settings.
- Account deletion in Settings via the `delete-account` Supabase Edge Function (App Store guideline 5.1.1(v)).

### Fixed / Security
- Closed three confirmed RLS privilege-escalation holes: card self-approval, book-request self-approval, and invite-token exposure (invite flow moved to SECURITY DEFINER RPCs `get_invite`/`claim_invite`).
- Invite tokens generated with `expo-crypto` CSPRNG instead of `Math.random()`.
- `userInterfaceStyle` corrected to `light` to match the theme.

### Notes
- Builds 10–12 failed (npm lockfile drift on `expo-crypto`; provisioning profile missing the Sign In with Apple entitlement). Build 13 was the first clean build of this release; credentials on EAS are now correct for non-interactive builds.

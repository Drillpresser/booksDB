# Changelog

Notable changes to BookHoarder. Versions correspond to iOS build numbers on TestFlight / App Store Connect.

## [Unreleased]

### Added
- **Classify books from the detail screen** — books without a classification now show a "Classify this book" row; classified books show a pencil icon on the classification card. Both open the same 3-step picker (Class → Section → Division). An "Ask Claude to suggest classification" button also appears, proposing the division plus Level 4 suffix and tags in one shot. Changes sync to Supabase shelves immediately.

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

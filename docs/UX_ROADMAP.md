# Deck and collection experience roadmap

Updated October 1, 2026. This records the implementation baseline and verification scope. Existing working features are retained rather than reimplemented.

| Phase | Existing baseline | Changes in this implementation |
| --- | --- | --- |
| Shared foundations | Button, Panel, Tabs, DialogSheet, 48px control token, reduced motion and collection vocabulary | Stronger selected pill state, restrained feedback animation, button refs for focus restoration, explicit expressive guidance in UX_PATTERNS |
| Deck previews and details | DeckPreviewCard adapters for official products, event lists, tournament favorites, public/community decks and popular results; main card sorting; persistent legality warnings | Larger lead art and titles, quieter footer surface, champion first in saved deck strips, explicit primary action and accessible inline secondary actions on saved builds |
| Collection readiness | Quantity filters, ownership editing, missing card shopping/acquisition, Undo, locations, loans, reservations and explicit transfer review | Shared deckLocationSummary, separate owned/available progress, blockers and direct card location links, visible refresh failures, one location controller per deck panel |
| Organization and importing | Private flexible folders, official products separated from favorites, optimistic revision checks, import parsing and canonicalization | Shared importer sheet and keyboard tabs, card previews in selection and review, draft protection, confirmation footer, focus restoration, optional favorites failure notice and distinct empty search state |
| Mobile Goldfish | Card play area, turn controls and tool sheets | Direct Memory/Material controls, latest action feedback, measured footer clearance and focus scrolling space |
| Notifications and homepage | Toast queue with Undo/retry, dialog host, persistent legality warnings, collection homepage section and draw adjusted consistency example | Restore focus after toast actions, restrained toast entry, homepage copy distinguishes ownership from availability |

## Acceptance evidence

App and shared typechecks passed. App lint passed with six existing Fast Refresh warnings. All 45 focused regression tests passed.

Follow-up release verification passed the production build (`npm run build`, including the app typecheck) and 32 additional tests: 15 account persistence tests for collection tracking, collection updates and folders, plus 17 app tests for collection notifications, save queues, batch calculations and quantity drafts. Account tests use in-memory SQLite with real migrations and transactional batches. They cover rollback, duplicate retries, concurrent revision conflicts, loan returns and assignment conservation. Notification tests simulate local and peer events; these do not replace signed-in browser or deployed D1 verification.

Automated checks cover preview counts and unknown lists, import identity preservation, collection completion and shopping quantities, location transfers and loan returns, simulator replay and payments. New coverage tests distinguish purchases, unavailable owned copies, transfers, sideboard scope, unresolved catalog names, reconciliation, normalized names, multiple printings and proxies.

Browser checks at 360px, 390px and 1280px used a temporary local fixture rendering real components with mocked account reads. Verified narrow mobile and desktop layouts, no horizontal overflow, minimum control heights, card name fallbacks, expanded source details, saved deck secondary actions, importer keyboard tabs and draft dismissal, import confirmation, collection refresh failure/recovery, and Goldfish draw feedback and tool sheets. The fixture was removed after verification.

## Release verification still required

* Signed-in end-to-end acquisition, Undo, quantity edits, loan return and transfer writes against the deployed account service.
* Cross-tab updates with real accounts and concurrent revision conflicts.
* Physical mobile keyboard behavior and assistive technology announcements. Browser geometry and keyboard checks do not replace device or screen-reader testing.
* Production deployment smoke checks after an explicitly requested commit and push.

The original consistency pass did not change game formulas, legality rules, recommendation acceptance behavior or persistence schema.

## Expressive design follow-up

The first expressive implementation focuses on My Decks, saved deck details and collection progress:

* Champion artwork, readable card names and consistent decorative accents in saved deck cards and prominent headers. Saved deck details resolve their actual material Champion before falling back to representative art.
* Private folder cover cards and four theme accents, with a live preview, searchable card choices, a plain cover option and a progressively disclosed folder gallery. Preferences save atomically with membership; omitted preferences preserve existing appearance for older membership clients.
* Larger ownership and availability counts, restrained progress transitions and an explicit completion message that still explains loans, reservations and transfers. Unknown data and reconciliation issues suppress completion. Reduced motion remains supported.
* Save errors stay in the folder editor footer, alongside retry, so an expanded card picker cannot hide them. Existing folder success toasts remain in use.

Verification: 14 focused tests passed, including appearance rollback, create/update retries, competing creates, stale edits, duplicate names, input validation and completion-state accuracy. App, shared and account-worker typechecks passed; lint retained its six existing Fast Refresh warnings. Real components were checked with a temporary mocked-write fixture at 360px, 390px and 1280px: card artwork and name fallbacks, long titles, expanded editor, empty library/search, save pending/failure, draft protection, saved preview, keyboard color choice, focus restoration, touch targets and horizontal overflow. Temporary fixtures were removed. Physical keyboard/screen-reader and deployed account verification remain outstanding.

Deployment order: apply account-worker migration `0030_deck_folder_appearance.sql`, then deploy the account service and frontend. This follow-up is not deployed. Later expressive work can address Goldfish card/zone motion, analysis result hierarchy, and broader empty-state compositions.

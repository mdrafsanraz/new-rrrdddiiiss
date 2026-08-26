IMPORTANT ARCHITECTURE CONTEXT — READ THIS BEFORE IMPLEMENTING USER MANAGEMENT, ARTISTS, RELEASES, OR LABELGRID INTEGRATION

RDISTRO  uses ONE LabelGrid API account.

There is NOT one LabelGrid account per end user.

Our users, artists, labels, releases, tracks, subscriptions, permissions, and support relationships are managed inside OUR OWN application and database.

LabelGrid is the downstream distribution infrastructure.

Think of the system like this:

END USER / ARTIST / LABEL         ↓ RDISTRO  DASHBOARD         ↓ RDISTRO AUTH + DATABASE + BUSINESS LOGIC         ↓ RDISTRO BACKEND         ↓ ONE LABELGRID API ACCOUNT         ↓ LABELGRID         ↓ SPOTIFY / APPLE MUSIC / YOUTUBE / ETC.

==================================================

1. CORE PRINCIPLE

==================================================

LabelGrid should never be treated as our user-management system.

LabelGrid sees RDISTRO as the API partner/distributor.

Our artists and users do NOT:

- create LabelGrid accounts
- log into LabelGrid
- receive LabelGrid credentials
- call LabelGrid APIs directly
- see the LabelGrid API token

They only interact with RDISTRO .

Our backend is the only thing that communicates with LabelGrid.

==================================================
2. OUR DATABASE IS THE SOURCE OF USER OWNERSHIP
==================================================

We must know which local user owns every artist, release, track, payout record, and other object.

Example conceptual schema:

users

- id
- email
- name
- plan
- stripe_customer_id
- subscription_status
- created_at

artists

- id
- user_id
- labelgrid_artist_id
- name
- spotify_artist_id
- apple_artist_id
- metadata
- created_at

releases

- id
- user_id
- artist_id
- labelgrid_release_id
- title
- upc
- release_date
- status
- artwork_url
- created_at

tracks

- id
- user_id
- release_id
- labelgrid_track_id
- title
- isrc
- audio_url
- status
- created_at

contributors

- id
- release_id or track_id
- name
- role
- identifiers

subscriptions

- id
- user_id
- plan
- stripe_subscription_id
- status
- current_period_end

usage

- user_id
- artist_count
- releases_submitted_this_month
- other entitlement counters

The exact schema can differ depending on the existing project, but the ownership model must remain the same.

==================================================
3. NEVER TRUST LABELGRID IDS AS AUTHORIZATION
==================================================

A LabelGrid ID is only an external reference.

It must NEVER be enough to determine whether a user is allowed to access or modify something.

Bad:

GET /api/releases/:labelgridReleaseId
→ fetch LabelGrid release directly
→ return it to user

This creates an IDOR/security risk.

Correct:

1. Get authenticated local user.
2. Query our database for the local release.
3. Verify:
  release.user_id === authenticated_user.id
4. Only then use:
  release.labelgrid_release_id
5. Call LabelGrid from the server.

Every artist, release, track, document, payout record, or related object must follow this ownership check.

==================================================
4. LABELGRID IS A SHARED DISTRIBUTOR ACCOUNT
==================================================

All users' releases ultimately exist inside the same RDISTRO LabelGrid account.

Example:

User A:

- Artist A
- Release A
- Track A

User B:

- Artist B
- Release B
- Track B

Both are created through the same LabelGrid API credentials.

We distinguish ownership in OUR database.

Example:

release_1
user_id = USER_A
labelgrid_release_id = LG_123

release_2
user_id = USER_B
labelgrid_release_id = LG_456

Both LabelGrid IDs belong to the same RDISTRO LabelGrid account.

Our application decides which user can see which one.

==================================================
5. USER PLAN LIMITS VS LABELGRID ACCOUNT LIMITS
==================================================

There are TWO COMPLETELY DIFFERENT TYPES OF LIMITS.

A. RDISTRO USER PLAN LIMITS

These are our own commercial rules.

Free:

- 1 artist
- 5 submitted releases per month

Starter:

- 1 artist
- unlimited releases

Pro:

- 3 artists
- unlimited releases
- analytics
- priority review

These limits apply PER USER.

Example:

User A on Free:
1 artist max
5 submitted releases/month

User B on Pro:
3 artists max
unlimited submitted releases

These limits must be enforced by OUR backend.

B. LABELGRID ACCOUNT LIMITS

These apply to the ENTIRE RDISTRO DISTRIBUTOR ACCOUNT collectively.

Current Starter API limits include:

- 3,000 active tracks
- 5 registered labels
- $35,000 USD/month royalties processed

These are NOT per user.

Example:

User A has 500 active tracks
User B has 700
User C has 300

Total LabelGrid active tracks = 1,500

All of those consume the same RDISTRO 3,000-track allowance.

The dashboard architecture must keep these two layers separate.

==================================================
6. WHAT COUNTS AS A LABELGRID ACTIVE TRACK
==================================================

The LabelGrid limit counts distributed active tracks.

Drafts do not count.

Incomplete uploads do not count.

Pending/review releases do not count until distributed.

Tracks are counted by unique ISRC.

A recording that appears on more than one release but uses the same ISRC counts once.

If a track is removed from every DSP, it stops counting.

If it remains live on even one DSP, it continues counting.

Therefore:

Do not block a user from creating a draft just because the global LabelGrid active-track limit is close.

Global capacity checks should matter at submission/distribution time, not during basic draft creation.

==================================================
7. LABEL HANDLING
==================================================

LabelGrid Starter API supports 5 registered labels.

RDISTRO plans to standardize distribution under RDISTRO instead of allowing every user to create a new LabelGrid label.

Do NOT automatically create a new LabelGrid label every time a user signs up.

In most cases, releases should use the shared RDISTRO LabelGrid label/imprint unless business logic later explicitly supports additional labels.

User-facing artist accounts are NOT LabelGrid labels.

Artist != Label.

==================================================
8. LABELGRID API CREDENTIALS
==================================================

LabelGrid credentials must exist ONLY server-side.

Never expose:

- API token
- API secret
- sandbox credentials
- production credentials

to:

- browser JavaScript
- client components
- localStorage
- public environment variables

All LabelGrid calls must pass through our server/backend.

==================================================
9. SANDBOX FIRST
==================================================

Current implementation is SANDBOX ONLY.

Do not use production LabelGrid endpoints.

Sandbox:

- creates test objects
- simulates delivery
- sends nothing to real DSPs

Production:

- creates real releases
- can trigger real distribution

Create a dedicated LabelGrid client layer.

Example:

lib/labelgrid/
  client.ts
  config.ts
  artists.ts
  releases.ts
  tracks.ts
  stores.ts
  documents.ts
  webhooks.ts
  errors.ts
  types.ts

or an equivalent structure appropriate to the existing project.

Environment configuration should explicitly distinguish:

LABELGRID_ENV=sandbox

LABELGRID_SANDBOX_BASE_URL=
LABELGRID_PRODUCTION_BASE_URL=
LABELGRID_API_TOKEN=

Do not silently fall back to production.

If sandbox configuration is missing, fail safely.

==================================================
10. LOCAL OBJECTS SHOULD EXIST BEFORE LABELGRID OBJECTS
==================================================

Prefer this workflow:

1. User creates local draft.
2. Save draft to our database.
3. User fills metadata/audio/artwork.
4. Validate locally.
5. Enforce subscription entitlement.
6. When appropriate, create/sync LabelGrid objects.
7. Save returned LabelGrid IDs locally.
8. Continue lifecycle through our backend.



Do not make LabelGrid the only copy of a draft.

Our application must remain usable even if LabelGrid is temporarily unavailable.

==================================================
11. RELEASE STATE MODEL
==================================================

Maintain a local release status/state.

Example statuses:

DRAFT
INCOMPLETE
READY_TO_SUBMIT
SYNCING
SUBMITTED
IN_REVIEW
CHANGES_REQUIRED
REJECTED
APPROVED
DELIVERING
LIVE
TAKEDOWN_PENDING
TAKEN_DOWN
ERROR

Map LabelGrid statuses into this local model.

Do not force UI components to understand raw LabelGrid responses everywhere.

Create a translation/mapping layer.

==================================================
12. WEBHOOKS
==================================================

LabelGrid webhooks should update our local state.

Example:

LabelGrid webhook:
release status = changes_required

Our backend:

1. Verify webhook authenticity.
2. Find release by labelgrid_release_id.
3. Update local release status.
4. Save returned issues.
5. Display issues to correct user.
6. Notify user if appropriate.

Never trust webhook IDs without matching them to an existing local record.

==================================================
13. CHANGES REQUIRED / DOCUMENT WORKFLOW
==================================================

If LabelGrid requests proof or documentation:

User should see the request inside RDISTRO.

Example:

LabelGrid:
proof_documents_required

RDISTRO UI:
"Proof of rights required"

User uploads document inside RDISTRO.

Our backend:

- validates upload
- associates file with correct local track/release
- sends it to LabelGrid through the API
- updates local status

Users should never need to contact LabelGrid directly.

==================================================
14. SUPPORT OWNERSHIP
==================================================

RDISTRO is the first-line support provider.

Users contact RDISTRO.

Normal issues:

- metadata problems
- incomplete release
- subscription questions
- upload errors
- plan limits
- basic release status

should be handled by us.

Only distributor-level issues that genuinely require LabelGrid should be escalated.

==================================================
15. STRIPE IS SEPARATE FROM LABELGRID
==================================================

Stripe manages OUR user subscriptions.

LabelGrid does not know or care whether an RDISTRO user is Free, Starter, or Pro.

Stripe flow:

User
↓
Stripe
↓
Verified Stripe webhook
↓
Our database subscription state
↓
Our entitlement engine
↓
User capabilities inside RDISTRO

Do not map Stripe users directly to LabelGrid accounts.

There is one RDISTRO LabelGrid account, regardless of how many Stripe customers we have.

==================================================
16. ENTITLEMENT ENGINE
==================================================

Create centralized entitlement logic.

Do NOT scatter:

if (user.plan === "pro")

throughout the app.

Use functions/services such as:

getEntitlements(user)
canCreateArtist(user)
canSubmitRelease(user)
getArtistUsage(user)
getMonthlyReleaseUsage(user)
hasAnalyticsAccess(user)
hasPriorityReview(user)

Example configuration:

FREE:
artistLimit: 1
monthlyReleaseLimit: 5
analytics: false
priorityReview: false

STARTER:
artistLimit: 1
monthlyReleaseLimit: unlimited
analytics: false
priorityReview: false

PRO:
artistLimit: 3
monthlyReleaseLimit: unlimited
analytics: true
priorityReview: true

==================================================
17. RELEASE LIMIT COUNTING
==================================================

For the Free plan:

5 releases/month means 5 releases actually submitted.

Do NOT count:

- drafts
- abandoned drafts
- incomplete uploads
- failed draft attempts

Only increment usage when a release is genuinely submitted into the review/distribution workflow.

This should be transaction-safe so repeated clicks or retries do not consume quota twice.

==================================================
18. GLOBAL LABELGRID CAPACITY MONITORING
==================================================

Because all users share one LabelGrid account, create an internal admin/service-level capacity model.

Eventually the admin dashboard should be able to show:

LabelGrid account usage

Active tracks:
1,840 / 3,000

Registered labels:
1 / 5

Monthly royalties:
$12,480 / $35,000

This is global distributor-level information.

Normal users should NOT see the global account usage.

User dashboards should only show their personal plan usage.

==================================================
19. MULTI-TENANT SECURITY
==================================================

Treat the application as multi-tenant.

Every query involving user-owned content must be scoped to authenticated user ownership.

For example:

artists:
WHERE user_id = currentUser.id

releases:
WHERE user_id = currentUser.id

tracks:
must belong to release owned by current user

documents:
must belong to track/release owned by current user

Never trust:

- user_id sent from frontend
- owner_id sent from frontend
- LabelGrid IDs from URLs
- Stripe customer IDs from frontend

Resolve all ownership server-side.

==================================================
20. USER DELETION / ACCOUNT CANCELLATION
==================================================

Do not delete LabelGrid content automatically when a user deletes their dashboard account.

Distribution/takedown is a separate business workflow.

For example:

Account cancellation:

- cancel Stripe subscription if applicable
- restrict dashboard features
- preserve catalog ownership records
- determine whether releases remain distributed or require takedown based on policy

Do not confuse deleting an app account with DSP takedown.

==================================================
21. DATABASE MAPPING REQUIREMENT
==================================================

Every external system object should have a local representation.

Examples:

local_user_id
stripe_customer_id

local_artist_id
labelgrid_artist_id

local_release_id
labelgrid_release_id

local_track_id
labelgrid_track_id

local_subscription_id
stripe_subscription_id

Never use an external provider ID as the primary application identity.

==================================================
22. ERROR HANDLING
==================================================

LabelGrid failures should not corrupt our local database.

Use clear synchronization states.

Example:

User submits release
↓
local transaction validates eligibility
↓
set status = SYNCING
↓
call LabelGrid
↓
success:
save external IDs
status = SUBMITTED

failure:
status = ERROR or READY_TO_SUBMIT
save safe error metadata
allow retry

Design idempotency carefully so retries do not create duplicate LabelGrid releases.

==================================================
23. ADMIN DASHBOARD LATER
==================================================

Do NOT build the admin dashboard yet.

But structure the database so we can later build an admin dashboard capable of:

- view all users
- view all artists
- view all releases
- moderation
- release issues
- global LabelGrid capacity
- Stripe subscription status
- royalty administration
- support
- takedowns
- suspicious content
- document verification
- user account suspension
- audit logs

Current priority is the USER DASHBOARD.

==================================================
24. UI EXPECTATIONS FOR NORMAL USERS
==================================================

Normal users should feel like RDISTRO is the distributor.

Do not expose unnecessary LabelGrid terminology.

For example:

Prefer:
"Submitted for review"

instead of:
"LabelGrid object created"

Prefer:
"Changes required"

instead of raw API error names.

Internally store raw provider responses where useful, but translate them into our own user-friendly UI.

==================================================
25. IMPORTANT PRODUCT MENTAL MODEL
==================================================

Remember:

RDISTRO is not simply a frontend for individual LabelGrid accounts.

RDISTRO is a MULTI-TENANT MUSIC DISTRIBUTION PLATFORM using ONE LabelGrid distributor/API account underneath.

Our application owns:

- users
- authentication
- plans
- subscriptions
- permissions
- artist ownership
- release ownership
- user support
- entitlement enforcement
- moderation workflow
- user-facing UX

LabelGrid owns/provides:

- downstream distribution infrastructure
- distributor-level catalog objects
- DSP delivery
- royalty infrastructure
- review/compliance infrastructure
- sandbox/production API
- distributor-level status/events

Every implementation decision must preserve this separation.

Before implementing LabelGrid-related functionality, inspect document.json and map the actual endpoint/schema requirements to this architecture.

Do not invent LabelGrid behavior that is not present in document.json.

If the API schema conflicts with an assumption above, preserve the multi-tenant ownership/security model and adapt the integration layer accordingly.

Build everything so that many thousands of RDISTRO users can safely share the single RDISTRO LabelGrid API account without ever seeing or accessing one another's data.
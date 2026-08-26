# Graph Report - RDISTRO  (2026-08-27)

## Corpus Check
- 234 files · ~157,254 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1302 nodes · 3180 edges · 86 communities (62 shown, 24 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `56cb988f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- cn
- users/page.tsx
- series-dash-tail-overlay.tsx
- chart-tooltip.tsx
- lucide-react
- signup-flow.tsx
- devDependencies
- compilerOptions
- components.json
- status-sync.ts
- time-series-chart-shell.tsx
- projection-utils.ts
- pricing-cards.tsx
- series-markers.tsx
- button.tsx
- projection-config.ts
- y-domain-utils.ts
- chart-context.tsx
- admin/releases/[id]/page.tsx
- area.tsx
- y-axis-ticks.ts
- Railway production
- AGENTS.md
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- chart-defs.ts
- labelgrid/index.ts
- site.ts
- submit/route.ts
- buttonVariants
- use-chart-interaction.ts
- x-axis.tsx
- status.ts
- release-builder.tsx
- section-placeholder.tsx
- getUserUsage
- prisma
- plans.ts
- session.ts
- useChartStable
- animation.ts
- db.ts
- start.sh
- dashboard/page.tsx
- app/layout.tsx
- artists/[id]/route.ts
- @base-ui/react
- dependencies
- approve/route.ts
- d3-array
- admin.ts
- admin/page.tsx
- motion
- next
- @phosphor-icons/react
- scripts
- react
- grid.tsx
- stripe
- tailwind-merge
- tw-animate-css
- admin/releases/page.tsx
- documents/page.tsx
- @visx/gradient
- @visx/grid
- admins/page.tsx
- @visx/scale
- @visx/shape
- ReleaseReviewActions
- checkout/route.ts
- getSessionUser
- store.ts
- gradient-button.tsx
- payloads.ts
- y-axis-scales.ts
- AddAdminForms
- UpgradeButtons
- reference-area-config.ts
- shadcn
- @visx/curve

## God Nodes (most connected - your core abstractions)
1. `cn()` - 95 edges
2. `prisma` - 62 edges
3. `getSessionUser()` - 42 edges
4. `buttonVariants` - 35 edges
5. `labelgridFetch()` - 32 edges
6. `TimeSeriesChartCore` - 29 edges
7. `requirePermission()` - 29 edges
8. `Button()` - 28 edges
9. `logReleaseActivity()` - 28 edges
10. `requireUser()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `AdminAdminsPage()` --calls--> `requirePermission()`  [EXTRACTED]
  src/app/(admin)/admin/admins/page.tsx → src/lib/auth/admin.ts
- `Meta()` --calls--> `cn()`  [EXTRACTED]
  src/app/(admin)/admin/releases/[id]/page.tsx → src/lib/utils.ts
- `Kpi()` --calls--> `cn()`  [EXTRACTED]
  src/app/(dashboard)/dashboard/page.tsx → src/lib/utils.ts
- `PATCH()` --calls--> `getSessionUser()`  [EXTRACTED]
  src/app/api/artists/[id]/route.ts → src/lib/auth/session.ts
- `POST()` --calls--> `getSessionUser()`  [EXTRACTED]
  src/app/api/releases/route.ts → src/lib/auth/session.ts

## Import Cycles
- None detected.

## Communities (86 total, 24 thin omitted)

### Community 0 - "cn"
Cohesion: 0.09
Nodes (33): Empty(), FeaturesPage(), metadata, Home(), steps, AdminCommandSearch(), SearchHit, AreaChart() (+25 more)

### Community 1 - "users/page.tsx"
Cohesion: 0.13
Nodes (21): AdminUsersPage(), metadata, Props, DELETE(), demoteSchema, Params, createSchema, GET() (+13 more)

### Community 2 - "series-dash-tail-overlay.tsx"
Cohesion: 0.22
Nodes (9): DashTailStroke(), DashTailStrokeProps, EMPTY_METRICS, PathStrokeMetrics, resolveDashStartX(), resolveDashTailBounds(), SeriesDashTailOverlay, SeriesDashTailOverlayImpl() (+1 more)

### Community 3 - "chart-tooltip.tsx"
Cohesion: 0.08
Nodes (43): ChartConfigContext, ChartConfigProviderProps, ChartConfigValue, DEFAULT_CHART_CONFIG, resolveTooltipBoxMotion(), SpringConfig, useChartConfig(), chartCssVars (+35 more)

### Community 5 - "signup-flow.tsx"
Cohesion: 0.14
Nodes (16): metadata, valueProps, planIcons, Screen, SignupFlow(), Step, stepLabels, digitsOnly() (+8 more)

### Community 6 - "devDependencies"
Cohesion: 0.09
Nodes (23): babel-plugin-react-compiler, eslint, eslint-config-next, devDependencies, babel-plugin-react-compiler, eslint, eslint-config-next, tailwindcss (+15 more)

### Community 7 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 8 - "components.json"
Cohesion: 0.08
Nodes (23): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+15 more)

### Community 9 - "status-sync.ts"
Cohesion: 0.16
Nodes (20): Params, POST(), schema, POST(), runtime, unwrapPayload(), verifySignature(), isLabelGridLive() (+12 more)

### Community 10 - "time-series-chart-shell.tsx"
Cohesion: 0.10
Nodes (26): AreaChartLoading(), CHART_CLIP_PASSTHROUGH, CLIP_EXCLUDED_COMPONENT_NAMES, isClipExcludedComponent(), isPostOverlayComponent(), isUnderlayComponent(), resolveChartChildElement(), UNDERLAY_COMPONENT_NAMES (+18 more)

### Community 11 - "projection-utils.ts"
Cohesion: 0.20
Nodes (16): buildAutoFutureValues(), buildProjectionPath(), BuildProjectionPathOptions, buildTargetPath(), computeProjectionAnchorTangentSlope(), intervalFromAdjacentRows(), intervalFromSeriesSpan(), linearRegressionSlope() (+8 more)

### Community 12 - "pricing-cards.tsx"
Cohesion: 0.16
Nodes (9): metadata, metadata, faqs, metadata, ContactForm(), LoginForm(), planAccents, PricingCards() (+1 more)

### Community 13 - "series-markers.tsx"
Cohesion: 0.12
Nodes (21): useChartHover(), ChartLegendHoverContext, ChartLegendHoverContextValue, useChartLegendHover(), SeriesHoverDim(), SeriesHoverDimProps, MarkerStyle, PointAt (+13 more)

### Community 14 - "button.tsx"
Cohesion: 0.11
Nodes (16): OutletRow, DOC_KINDS, REASONS, TakedownForm(), CreateArtistForm(), ArtistFields, EditArtistForm(), FILTERS (+8 more)

### Community 15 - "projection-config.ts"
Cohesion: 0.26
Nodes (12): isChartClipPassthrough(), extractProjectionLineConfigs(), getChildComponentName(), isProjectionLineElement(), mergeProjectionXDomainMax(), mergeProjectionYDomain(), normalizeProjectionData(), ProjectionLineConfig (+4 more)

### Community 16 - "y-domain-utils.ts"
Cohesion: 0.23
Nodes (15): Y_DOMAIN_TWEEN_SKIP_THRESHOLD, lerpDomain(), snapDomains(), tweenDomains(), useAnimatedYDomains(), UseAnimatedYDomainsOptions, normalizeYAxisId(), computeYDomainsByAxis() (+7 more)

### Community 17 - "chart-context.tsx"
Cohesion: 0.10
Nodes (33): AreaChartProps, ChartInner(), ChartInnerProps, DEFAULT_MARGIN, extractAreaConfigs(), AreaChartLoadingProps, ChartContextValue, ChartHoverContext (+25 more)

### Community 18 - "admin/releases/[id]/page.tsx"
Cohesion: 0.16
Nodes (12): AdminReleaseDetailPage(), formatDuration(), Meta(), Props, safeJsonArray(), ReleaseDeliveryPanel(), ReleaseQcPanel(), AdminStatusBadge() (+4 more)

### Community 19 - "area.tsx"
Cohesion: 0.22
Nodes (18): Area(), AreaProps, CurveFactory, AreaGradientDefs(), AreaGradientDefsProps, useAreaLoadingPulseState(), FadeEdges, FadeGradientStop (+10 more)

### Community 20 - "y-axis-ticks.ts"
Cohesion: 0.40
Nodes (3): Y_AXIS_DEFAULT_TICK_COUNT, Y_AXIS_MAX_TICK_COUNT, Y_AXIS_MIN_TICK_COUNT

### Community 21 - "Railway production"
Cohesion: 0.20
Nodes (9): 1. Services, 2. Variables (web service — this is the step that usually fails), 3. Deploy settings, 4. Stripe webhook (when ready), Architecture notes, Local development, Railway production, RDISTRO (+1 more)

### Community 28 - "chart-defs.ts"
Cohesion: 0.46
Nodes (7): collectChartDefsChildren(), getChartChildComponentName(), isChartDefsComponent(), isGradientDefComponent(), isPatternDefComponent(), partitionChartDefNodes(), VISX_PATTERN_COMPONENT_NAMES

### Community 29 - "labelgrid/index.ts"
Cohesion: 0.06
Nodes (69): AdminRoyaltiesPage(), metadata, AdminSystemPage(), POST(), schema, GET(), getAdminHomeSnapshot(), HealthState (+61 more)

### Community 31 - "site.ts"
Cohesion: 0.12
Nodes (13): DashboardShell(), SiteFooter(), isActive(), SiteHeader(), AnimatedBrandLogo(), AnimatedBrandLogoProps, StoreTicker(), adminNav (+5 more)

### Community 32 - "submit/route.ts"
Cohesion: 0.11
Nodes (29): allocateCatalogNumber(), POST(), schema, Params, schema, trackSchema, ai, allocateCatalogNumber() (+21 more)

### Community 33 - "buttonVariants"
Cohesion: 0.11
Nodes (26): AdminArtistsPage(), metadata, AdminLayout(), AdminSupportTicketPage(), Props, AdminSupportPage(), metadata, Props (+18 more)

### Community 34 - "use-chart-interaction.ts"
Cohesion: 0.29
Nodes (8): TooltipData, ChartInteractionResult, ScaleLinear, ScaleTime, useChartInteraction(), defaultDedupeKey(), ScheduledTooltipControls, useScheduledTooltip()

### Community 35 - "x-axis.tsx"
Cohesion: 0.06
Nodes (48): ChartLoadingLabel(), ChartLoadingLabelProps, LINE_LOADING_LOOP_PAUSE_MS, LINE_LOADING_PULSE_CYCLE_S, LINE_LOADING_PULSE_EASE, LOADING_LABEL_EXIT_S, LOADING_LABEL_EXIT_Y_PX, BarLoadingSkeleton() (+40 more)

### Community 36 - "status.ts"
Cohesion: 0.15
Nodes (19): Props, ReleaseDetailPage(), statusLabel(), tones, getUserFacingReleaseStatus(), getUserFacingStatusDescription(), getUserFacingStatusLabel(), isPendingInternalReview() (+11 more)

### Community 37 - "release-builder.tsx"
Cohesion: 0.08
Nodes (32): ArtistOption, buildPayload(), ChipGroup(), COMMON_COUNTRIES, CONTENT_TYPE_OPTIONS, currentYear, EXPLICIT_FRIENDLY, formatBytes() (+24 more)

### Community 38 - "section-placeholder.tsx"
Cohesion: 0.19
Nodes (5): metadata, metadata, metadata, metadata, SectionPlaceholder()

### Community 39 - "getUserUsage"
Cohesion: 0.24
Nodes (10): createSchema, GET(), POST(), createSchema, GET(), POST(), ArtistsPage(), metadata (+2 more)

### Community 41 - "plans.ts"
Cohesion: 0.18
Nodes (15): metadata, NewReleasePage(), Props, metadata, SubscriptionPage(), UsageMeter(), buildUsageSnapshot(), getArtistUsage() (+7 more)

### Community 42 - "session.ts"
Cohesion: 0.11
Nodes (27): POST(), schema, POST(), POST(), schema, POST(), GET(), POST() (+19 more)

### Community 43 - "useChartStable"
Cohesion: 0.22
Nodes (11): useChartStable(), computeSegmentBounds(), INACTIVE_SEGMENT, SegmentBounds, HighlightSegment(), HighlightSegmentProps, LineLoadingSweep(), SeriesHighlightLayer() (+3 more)

### Community 44 - "animation.ts"
Cohesion: 0.17
Nodes (8): clipRevealTransition(), DEFAULT_ANIMATION_DURATION_MS, DEFAULT_ANIMATION_EASING, DEFAULT_CHART_ENTER_TRANSITION, ChartRevealClip(), ChartRevealClipMode, ChartRevealClipProps, SpringOptions

### Community 45 - "db.ts"
Cohesion: 0.10
Nodes (23): Params, POST(), GET(), Params, PATCH(), POST(), replySchema, statusSchema (+15 more)

### Community 46 - "start.sh"
Cohesion: 0.50
Nodes (3): HOSTNAME, PORT, start.sh script

### Community 47 - "dashboard/page.tsx"
Cohesion: 0.13
Nodes (17): AdminSubscriptionsPage(), metadata, ArtistDetailPage(), Props, DashboardHomePage(), Kpi(), metadata, metadata (+9 more)

### Community 48 - "app/layout.tsx"
Cohesion: 0.40
Nodes (3): geistMono, metadata, outfit

### Community 49 - "artists/[id]/route.ts"
Cohesion: 0.40
Nodes (5): GET(), ownedArtist(), Params, PATCH(), patchSchema

### Community 51 - "dependencies"
Cohesion: 0.09
Nodes (23): bcryptjs, class-variance-authority, clsx, d3-shape, jose, @number-flow/react, dependencies, bcryptjs (+15 more)

### Community 52 - "approve/route.ts"
Cohesion: 0.21
Nodes (12): Params, POST(), schema, Params, POST(), schema, Params, POST() (+4 more)

### Community 54 - "admin.ts"
Cohesion: 0.22
Nodes (11): AdminAnalyticsPage(), metadata, AdminAuditPage(), metadata, Props, AdminSettingsPage(), metadata, listAuditLogs() (+3 more)

### Community 55 - "admin/page.tsx"
Cohesion: 0.20
Nodes (10): AdminHomePage(), metadata, trackCountEstimate(), metadata, HealthDot(), ICONS, PlatformSummaryCards(), SummaryCard() (+2 more)

### Community 59 - "scripts"
Cohesion: 0.14
Nodes (13): name, private, scripts, build, build:standalone-assets, db:deploy, db:migrate, db:push (+5 more)

### Community 61 - "grid.tsx"
Cohesion: 0.42
Nodes (8): useYScale(), Grid(), GridProps, hideEdgeTicks(), resolveRowTickValues(), useGridShimmer(), isLoadingChromePhase(), isLoadingGridChromePhase()

### Community 66 - "admin/releases/page.tsx"
Cohesion: 0.19
Nodes (12): AdminReleasesPage(), metadata, Props, ADMIN_RELEASE_FILTERS, AdminReleaseFilter, adminReleaseWhere(), CHANGES, LG_REVIEW (+4 more)

### Community 67 - "documents/page.tsx"
Cohesion: 0.29
Nodes (7): AdminDocumentsPage(), metadata, Props, STATUSES, AdminTakedownsPage(), metadata, formatShortDate()

### Community 70 - "admins/page.tsx"
Cohesion: 0.40
Nodes (4): AdminAdminsPage(), metadata, RemoveAdminButton(), STAFF_ROLES

### Community 75 - "checkout/route.ts"
Cohesion: 0.29
Nodes (12): POST(), schema, POST(), mapStatus(), POST(), runtime, syncSubscription(), appUrl() (+4 more)

### Community 76 - "getSessionUser"
Cohesion: 0.21
Nodes (22): kindSchema, Params, POST(), PATCH(), Params, POST(), GET(), Params (+14 more)

### Community 77 - "store.ts"
Cohesion: 0.16
Nodes (15): contentTypeFor(), GET(), Params, ARTWORK_TYPES, AUDIO_TYPES, DOCUMENT_TYPES, extFor(), loadStoredUpload() (+7 more)

### Community 78 - "gradient-button.tsx"
Cohesion: 0.40
Nodes (4): ColorVariant, GradientButton(), GradientButtonProps, GradientColors

### Community 79 - "payloads.ts"
Cohesion: 0.17
Nodes (8): ReleaseArtistInput, releaseToWizardSnapshot(), TitleLoc, UI_COMPOSITION_TO_LG, UI_CONTENT_TYPE_TO_LG, UI_EXPLICIT_TO_LG, UI_SAMPLES_TO_LG, parseJsonObject()

### Community 80 - "y-axis-scales.ts"
Cohesion: 0.28
Nodes (7): buildYScalesForLines(), buildYScalesFromDomains(), DEFAULT_Y_AXIS_ID, getPrimaryYScale(), groupLinesByYAxisId(), YAxisOrientation, YScale

### Community 83 - "reference-area-config.ts"
Cohesion: 0.29
Nodes (7): extractReferenceAreaConfigs(), getChildComponentName(), isReferenceAreaElement(), ReferenceAreaConfig, ReferenceAreaConfigProps, ReferenceAreaRegistrationContext, ReferenceAreaRegistrationContextValue

## Knowledge Gaps
- **369 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+364 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `buttonVariants`, `admin/releases/page.tsx`, `documents/page.tsx`, `users/page.tsx`, `status.ts`, `x-axis.tsx`, `chart-tooltip.tsx`, `release-builder.tsx`, `plans.ts`, `signup-flow.tsx`, `pricing-cards.tsx`, `gradient-button.tsx`, `dashboard/page.tsx`, `button.tsx`, `chart-context.tsx`, `admin/releases/[id]/page.tsx`, `admin/page.tsx`, `site.ts`?**
  _High betweenness centrality (0.240) - this node is a cross-community bridge._
- **Why does `prisma` connect `db.ts` to `users/page.tsx`, `status-sync.ts`, `admin/releases/[id]/page.tsx`, `labelgrid/index.ts`, `submit/route.ts`, `buttonVariants`, `status.ts`, `getUserUsage`, `plans.ts`, `session.ts`, `dashboard/page.tsx`, `artists/[id]/route.ts`, `approve/route.ts`, `admin.ts`, `admin/page.tsx`, `admin/releases/page.tsx`, `documents/page.tsx`, `admins/page.tsx`, `checkout/route.ts`, `getSessionUser`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `ReleaseBuilder()` connect `release-builder.tsx` to `cn`, `plans.ts`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _369 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.08985200845665962 - nodes in this community are weakly interconnected._
- **Should `users/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12923076923076923 - nodes in this community are weakly interconnected._
- **Should `chart-tooltip.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08417508417508418 - nodes in this community are weakly interconnected._
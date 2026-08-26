# Graph Report - RDISTRO  (2026-08-27)

## Corpus Check
- 234 files · ~157,508 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1303 nodes · 3181 edges · 96 communities (67 shown, 29 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5590102b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- cn
- db.ts
- area.tsx
- chart-tooltip.tsx
- lucide-react
- signup-flow.tsx
- devDependencies
- compilerOptions
- components.json
- status-sync.ts
- time-series-chart-shell.tsx
- projection-utils.ts
- (marketing)/page.tsx
- series-markers.tsx
- button.tsx
- projection-config.ts
- y-domain-utils.ts
- area-chart.tsx
- admin/releases/[id]/page.tsx
- line-loading-pulse.tsx
- y-axis-ticks.ts
- Railway production
- AGENTS.md
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- chart-defs.ts
- labelgrid/index.ts
- header.tsx
- submit/route.ts
- buttonVariants
- chart-context.tsx
- x-axis.tsx
- dashboard/releases/[id]/page.tsx
- release-builder.tsx
- section-placeholder.tsx
- getSessionUser
- prisma
- dashboard/page.tsx
- session.ts
- useChartStable
- animation.ts
- requireAdminApi
- start.sh
- config.ts
- app/layout.tsx
- sync-submit.ts
- constants.ts
- dependencies
- quality-report.ts
- d3-array
- requirePermission
- admin/page.tsx
- motion
- next
- @phosphor-icons/react
- permissions.ts
- react
- grid.tsx
- stripe
- tailwind-merge
- tw-animate-css
- admin/releases/page.tsx
- documents/page.tsx
- @visx/gradient
- @visx/grid
- bcryptjs
- @visx/scale
- @visx/shape
- ReleaseReviewActions
- checkout/route.ts
- status.ts
- store.ts
- line-loading-timing.ts
- payloads.ts
- ReleaseBuilder
- loading-sweep.tsx
- useChartHover
- y-axis-scales.ts
- clsx
- d3-shape
- jose
- @number-flow/react
- @prisma/client
- @visx/event
- @visx/responsive
- zod
- use-animated-series-path.ts
- audit/page.tsx
- MediaDropzone
- class-variance-authority

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
- `Kpi()` --calls--> `cn()`  [EXTRACTED]
  src/app/(dashboard)/dashboard/page.tsx → src/lib/utils.ts
- `GET()` --calls--> `getSessionUser()`  [EXTRACTED]
  src/app/api/releases/[id]/route.ts → src/lib/auth/session.ts
- `XAxis()` --calls--> `useChartStable()`  [EXTRACTED]
  src/components/charts/x-axis.tsx → src/components/charts/chart-context.tsx
- `XAxisLabel()` --calls--> `cn()`  [EXTRACTED]
  src/components/charts/x-axis.tsx → src/lib/utils.ts
- `Panel()` --calls--> `cn()`  [EXTRACTED]
  src/components/dashboard/release-builder.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (96 total, 29 thin omitted)

### Community 0 - "cn"
Cohesion: 0.09
Nodes (28): Meta(), ArtistDetailPage(), Props, AreaChart(), EditArtistForm(), CardFlip(), CardFlipProps, ColorVariant (+20 more)

### Community 1 - "db.ts"
Cohesion: 0.11
Nodes (30): metadata, metadata, metadata, DELETE(), demoteSchema, Params, createSchema, GET() (+22 more)

### Community 2 - "area.tsx"
Cohesion: 0.18
Nodes (14): Area(), CurveFactory, useAreaLoadingPulseState(), DashTailStroke(), DashTailStrokeProps, resolveLineLoadingPulseMode(), EMPTY_METRICS, PathStrokeMetrics (+6 more)

### Community 3 - "chart-tooltip.tsx"
Cohesion: 0.08
Nodes (43): ChartConfigContext, ChartConfigProviderProps, ChartConfigValue, DEFAULT_CHART_CONFIG, resolveTooltipBoxMotion(), SpringConfig, useChartConfig(), chartCssVars (+35 more)

### Community 5 - "signup-flow.tsx"
Cohesion: 0.18
Nodes (14): planIcons, Screen, SignupFlow(), Step, stepLabels, digitsOnly(), formatCard(), formatExpiry() (+6 more)

### Community 6 - "devDependencies"
Cohesion: 0.05
Nodes (36): babel-plugin-react-compiler, eslint, eslint-config-next, devDependencies, babel-plugin-react-compiler, eslint, eslint-config-next, tailwindcss (+28 more)

### Community 7 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 8 - "components.json"
Cohesion: 0.08
Nodes (23): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+15 more)

### Community 9 - "status-sync.ts"
Cohesion: 0.17
Nodes (19): GET(), POST(), runtime, unwrapPayload(), verifySignature(), isLabelGridLive(), getRelease(), listDistroOutlets() (+11 more)

### Community 10 - "time-series-chart-shell.tsx"
Cohesion: 0.10
Nodes (24): AreaChartLoading(), CHART_CLIP_PASSTHROUGH, CLIP_EXCLUDED_COMPONENT_NAMES, isClipExcludedComponent(), isPostOverlayComponent(), isUnderlayComponent(), resolveChartChildElement(), UNDERLAY_COMPONENT_NAMES (+16 more)

### Community 11 - "projection-utils.ts"
Cohesion: 0.20
Nodes (16): buildAutoFutureValues(), buildProjectionPath(), BuildProjectionPathOptions, buildTargetPath(), computeProjectionAnchorTangentSlope(), intervalFromAdjacentRows(), intervalFromSeriesSpan(), linearRegressionSlope() (+8 more)

### Community 12 - "(marketing)/page.tsx"
Cohesion: 0.09
Nodes (22): metadata, FeaturesPage(), metadata, metadata, Home(), steps, faqs, metadata (+14 more)

### Community 13 - "series-markers.tsx"
Cohesion: 0.18
Nodes (14): defaultScatterColors, MarkerStyle, PointAt, SeriesMarkers(), SeriesMarkersActiveHighlightProps, SeriesMarkersDimWrapperProps, SeriesMarkersProps, getSeriesMarkerVisualExtent() (+6 more)

### Community 14 - "button.tsx"
Cohesion: 0.11
Nodes (17): AdminUserDetailPage(), Props, metadata, Props, ImpersonationBanner(), LoginAsUserButton(), OutletRow, DOC_KINDS (+9 more)

### Community 15 - "projection-config.ts"
Cohesion: 0.26
Nodes (12): isChartClipPassthrough(), extractProjectionLineConfigs(), getChildComponentName(), isProjectionLineElement(), mergeProjectionXDomainMax(), mergeProjectionYDomain(), normalizeProjectionData(), ProjectionLineConfig (+4 more)

### Community 16 - "y-domain-utils.ts"
Cohesion: 0.30
Nodes (12): ChartContextValue, ChartPhase, lerpDomain(), snapDomains(), tweenDomains(), useAnimatedYDomains(), UseAnimatedYDomainsOptions, domainsEqual() (+4 more)

### Community 17 - "area-chart.tsx"
Cohesion: 0.15
Nodes (21): AreaChartProps, ChartInner(), ChartInnerProps, DEFAULT_MARGIN, extractAreaConfigs(), AreaChartLoadingProps, LineConfig, Margin (+13 more)

### Community 18 - "admin/releases/[id]/page.tsx"
Cohesion: 0.17
Nodes (11): AdminReleaseDetailPage(), formatDuration(), Props, safeJsonArray(), ReleaseDeliveryPanel(), ReleaseQcPanel(), AdminStatusBadge(), QcBadge() (+3 more)

### Community 19 - "line-loading-pulse.tsx"
Cohesion: 0.26
Nodes (13): AreaProps, AreaGradientDefs(), AreaGradientDefsProps, FadeEdges, FadeGradientStop, fadeGradientStops(), FadeSides, resolveFadeSides() (+5 more)

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
Cohesion: 0.16
Nodes (22): labelgridFetch(), confirmReleaseReview(), distributeRelease(), getArtist(), getMe(), getReleaseDeliveryStatus(), getTrackFileUploadUrl(), listArtists() (+14 more)

### Community 31 - "header.tsx"
Cohesion: 0.17
Nodes (8): DashboardShell(), SiteFooter(), isActive(), SiteHeader(), AnimatedBrandLogo(), AnimatedBrandLogoProps, dashboardNav, navLinks

### Community 32 - "submit/route.ts"
Cohesion: 0.20
Nodes (16): allocateCatalogNumber(), POST(), schema, ai, allocateCatalogNumber(), contributorSchema, intOrNull(), payloadSchema (+8 more)

### Community 33 - "buttonVariants"
Cohesion: 0.14
Nodes (21): AdminArtistsPage(), AdminLayout(), AdminSupportTicketPage(), Props, AdminSupportPage(), metadata, Props, Props (+13 more)

### Community 34 - "chart-context.tsx"
Cohesion: 0.10
Nodes (22): ChartHoverContext, ChartHoverContextValue, ChartProvider(), ChartStableContext, ChartStableContextValue, ScaleBand, ScaleLinear, ScaleTime (+14 more)

### Community 35 - "x-axis.tsx"
Cohesion: 0.15
Nodes (22): allIndexLayouts(), appendProjectionTailTicks(), AxisTick, binomial(), buildDataAlignedTicks(), buildDomainTicks(), composePositiveSum(), dedupeIndicesByLabel() (+14 more)

### Community 36 - "dashboard/releases/[id]/page.tsx"
Cohesion: 0.13
Nodes (17): Props, ReleaseDetailPage(), releaseInclude, metadata, Props, ReleasesPage(), ResubmitReleaseButton(), StatusBadge() (+9 more)

### Community 37 - "release-builder.tsx"
Cohesion: 0.10
Nodes (18): ArtistOption, buildPayload(), ChipGroup(), COMMON_COUNTRIES, CONTENT_TYPE_OPTIONS, currentYear, EXPLICIT_FRIENDLY, formatDuration() (+10 more)

### Community 38 - "section-placeholder.tsx"
Cohesion: 0.19
Nodes (5): metadata, metadata, metadata, metadata, SectionPlaceholder()

### Community 39 - "getSessionUser"
Cohesion: 0.11
Nodes (23): GET(), ownedArtist(), Params, PATCH(), patchSchema, createSchema, GET(), POST() (+15 more)

### Community 41 - "dashboard/page.tsx"
Cohesion: 0.10
Nodes (27): AdminSubscriptionsPage(), ArtistsPage(), metadata, DashboardHomePage(), Empty(), Kpi(), metadata, NewReleasePage() (+19 more)

### Community 42 - "session.ts"
Cohesion: 0.10
Nodes (28): AdminSettingsPage(), metadata, POST(), schema, POST(), GET(), POST(), schema (+20 more)

### Community 43 - "useChartStable"
Cohesion: 0.31
Nodes (8): useChartStable(), computeSegmentBounds(), HighlightSegment(), HighlightSegmentProps, SeriesHighlightLayer(), SeriesHighlightLayerProps, HighlightSegmentResult, useHighlightSegment()

### Community 44 - "animation.ts"
Cohesion: 0.17
Nodes (8): clipRevealTransition(), DEFAULT_ANIMATION_DURATION_MS, DEFAULT_ANIMATION_EASING, DEFAULT_CHART_ENTER_TRANSITION, ChartRevealClip(), ChartRevealClipMode, ChartRevealClipProps, SpringOptions

### Community 45 - "requireAdminApi"
Cohesion: 0.16
Nodes (14): Params, POST(), GET(), Params, PATCH(), POST(), replySchema, statusSchema (+6 more)

### Community 46 - "start.sh"
Cohesion: 0.50
Nodes (3): HOSTNAME, PORT, start.sh script

### Community 47 - "config.ts"
Cohesion: 0.16
Nodes (16): AdminRoyaltiesPage(), metadata, AdminSystemPage(), metadata, getAdminHomeSnapshot(), HealthState, probePlatformHealth(), PIPELINE_STAGES (+8 more)

### Community 48 - "app/layout.tsx"
Cohesion: 0.40
Nodes (3): geistMono, metadata, outfit

### Community 49 - "sync-submit.ts"
Cohesion: 0.20
Nodes (20): createArtist(), createRelease(), createTrack(), createWriter(), listGenres(), listLabels(), uploadReleasePhoto(), validateRelease() (+12 more)

### Community 50 - "constants.ts"
Cohesion: 0.16
Nodes (13): Params, schema, trackSchema, ARTISTIC_ROLES, ArtworkAiUsage, COMMERCIAL_SAMPLES, COMPOSITION_TYPES, ContentType (+5 more)

### Community 51 - "dependencies"
Cohesion: 0.22
Nodes (9): @base-ui/react, dependencies, @base-ui/react, react-dom, shadcn, @visx/curve, react-dom, shadcn (+1 more)

### Community 52 - "quality-report.ts"
Cohesion: 0.27
Nodes (8): LabelGridApiError, getReleaseQualityReport(), refreshReleaseQualityReport(), deriveQcStatus(), QcIssue, QcReportSnapshot, requestQualityReportRefresh(), syncReleaseQualityReport()

### Community 54 - "requirePermission"
Cohesion: 0.24
Nodes (6): AdminAdminsPage(), metadata, AdminAnalyticsPage(), AddAdminForms(), RemoveAdminButton(), requirePermission()

### Community 55 - "admin/page.tsx"
Cohesion: 0.25
Nodes (8): AdminHomePage(), metadata, trackCountEstimate(), HealthDot(), ICONS, PlatformSummaryCards(), SummaryCard(), useCountUp()

### Community 59 - "permissions.ts"
Cohesion: 0.15
Nodes (14): AdminUsersPage(), AdminCommandSearch(), SearchHit, adminNav, AdminNavItem, AdminPermission, ALL, hasAnyPermission() (+6 more)

### Community 61 - "grid.tsx"
Cohesion: 0.42
Nodes (8): useYScale(), Grid(), GridProps, hideEdgeTicks(), resolveRowTickValues(), useGridShimmer(), isLoadingChromePhase(), isLoadingGridChromePhase()

### Community 66 - "admin/releases/page.tsx"
Cohesion: 0.19
Nodes (12): AdminReleasesPage(), metadata, Props, ADMIN_RELEASE_FILTERS, AdminReleaseFilter, adminReleaseWhere(), CHANGES, LG_REVIEW (+4 more)

### Community 67 - "documents/page.tsx"
Cohesion: 0.23
Nodes (8): AdminDocumentsPage(), metadata, Props, STATUSES, AdminTakedownsPage(), metadata, TakedownForm(), formatShortDate()

### Community 75 - "checkout/route.ts"
Cohesion: 0.29
Nodes (12): POST(), schema, POST(), mapStatus(), POST(), runtime, syncSubscription(), appUrl() (+4 more)

### Community 76 - "status.ts"
Cohesion: 0.10
Nodes (41): Params, POST(), schema, Params, POST(), schema, kindSchema, Params (+33 more)

### Community 77 - "store.ts"
Cohesion: 0.20
Nodes (10): PATCH(), ARTWORK_TYPES, AUDIO_TYPES, DOCUMENT_TYPES, extFor(), relativePathFromPublicUrl(), ROOT, saveAudio() (+2 more)

### Community 78 - "line-loading-timing.ts"
Cohesion: 0.22
Nodes (10): ChartLoadingLabel(), ChartLoadingLabelProps, LINE_LOADING_LOOP_PAUSE_MS, LINE_LOADING_PULSE_CYCLE_S, LINE_LOADING_PULSE_EASE, LOADING_LABEL_EXIT_S, LOADING_LABEL_EXIT_Y_PX, UseGridShimmerOptions (+2 more)

### Community 79 - "payloads.ts"
Cohesion: 0.17
Nodes (8): ReleaseArtistInput, releaseToWizardSnapshot(), TitleLoc, UI_COMPOSITION_TO_LG, UI_CONTENT_TYPE_TO_LG, UI_EXPLICIT_TO_LG, UI_SAMPLES_TO_LG, parseJsonObject()

### Community 80 - "ReleaseBuilder"
Cohesion: 0.29
Nodes (10): initialState(), ReleaseBuilder(), createDraft(), ensureDraftThenContinue(), saveAndExit(), saveDraft(), submitForReview(), validateStep() (+2 more)

### Community 81 - "loading-sweep.tsx"
Cohesion: 0.26
Nodes (10): BarLoadingSkeleton(), BarLoadingSkeletonProps, CurveFactory, generateEasedGradientStops(), getSkeletonHeights(), getSkeletonSigns(), hashFract(), LineLoadingSweep() (+2 more)

### Community 82 - "useChartHover"
Cohesion: 0.25
Nodes (8): useChartHover(), ChartLegendHoverContext, ChartLegendHoverContextValue, useChartLegendHover(), SeriesHoverDim(), SeriesHoverDimProps, SeriesMarkersActiveHighlight(), SeriesMarkersDimWrapper()

### Community 83 - "y-axis-scales.ts"
Cohesion: 0.13
Nodes (18): extractReferenceAreaConfigs(), getChildComponentName(), isReferenceAreaElement(), ReferenceAreaConfig, ReferenceAreaConfigProps, ReferenceAreaRegistrationContext, ReferenceAreaRegistrationContextValue, buildYScalesForLines() (+10 more)

### Community 92 - "use-animated-series-path.ts"
Cohesion: 0.35
Nodes (9): computeSeriesPathPoints(), CurveFactory, interpolateSeriesPathPoints(), seriesPathFromPoints(), SeriesPathPoint, seriesPathTransitionSignature(), CurveFactory, useAnimatedSeriesPath() (+1 more)

### Community 93 - "audit/page.tsx"
Cohesion: 0.47
Nodes (5): AdminAuditPage(), metadata, Props, listAuditLogs(), formatDistanceToNow()

### Community 94 - "MediaDropzone"
Cohesion: 0.67
Nodes (4): formatBytes(), MediaDropzone(), onDrop(), takeFiles()

## Knowledge Gaps
- **370 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+365 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `chart-tooltip.tsx`, `signup-flow.tsx`, `(marketing)/page.tsx`, `button.tsx`, `area-chart.tsx`, `admin/releases/[id]/page.tsx`, `header.tsx`, `buttonVariants`, `x-axis.tsx`, `dashboard/releases/[id]/page.tsx`, `release-builder.tsx`, `getSessionUser`, `dashboard/page.tsx`, `admin/page.tsx`, `permissions.ts`, `admin/releases/page.tsx`, `documents/page.tsx`, `line-loading-timing.ts`, `ReleaseBuilder`, `MediaDropzone`?**
  _High betweenness centrality (0.247) - this node is a cross-community bridge._
- **Why does `prisma` connect `db.ts` to `cn`, `status-sync.ts`, `button.tsx`, `admin/releases/[id]/page.tsx`, `submit/route.ts`, `buttonVariants`, `dashboard/releases/[id]/page.tsx`, `getSessionUser`, `dashboard/page.tsx`, `session.ts`, `requireAdminApi`, `config.ts`, `sync-submit.ts`, `constants.ts`, `quality-report.ts`, `requirePermission`, `admin/page.tsx`, `admin/releases/page.tsx`, `documents/page.tsx`, `checkout/route.ts`, `status.ts`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `useChartStable()` connect `useChartStable` to `area.tsx`, `chart-tooltip.tsx`, `chart-context.tsx`, `x-axis.tsx`, `series-markers.tsx`, `loading-sweep.tsx`, `line-loading-pulse.tsx`, `grid.tsx`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _370 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.09206349206349207 - nodes in this community are weakly interconnected._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11205073995771671 - nodes in this community are weakly interconnected._
- **Should `chart-tooltip.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08417508417508418 - nodes in this community are weakly interconnected._
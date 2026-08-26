# Graph Report - RDISTRO  (2026-08-27)

## Corpus Check
- 195 files · ~132,670 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1062 nodes · 2392 edges · 82 communities (54 shown, 28 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c8b949a2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- signup-flow.tsx
- series-markers.tsx
- db.ts
- chart-tooltip.tsx
- lucide-react
- loading-sweep.tsx
- devDependencies
- compilerOptions
- components.json
- x-axis.tsx
- time-series-chart-shell.tsx
- projection-utils.ts
- cn
- line-loading-pulse.tsx
- button.tsx
- projection-config.ts
- y-domain-utils.ts
- area-chart.tsx
- @number-flow/react
- (marketing)/page.tsx
- y-axis-ticks.ts
- Railway production
- AGENTS.md
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- chart-defs.ts
- labelgrid/index.ts
- utils.ts
- submit/route.ts
- admin/support/[id]/page.tsx
- useChartStable
- admin.ts
- buttonVariants
- area.tsx
- section-placeholder.tsx
- checkout/route.ts
- prisma
- zod
- getSessionUser
- grid.tsx
- animation.ts
- sync-submit.ts
- start.sh
- requireUser
- app/layout.tsx
- chart-context.tsx
- bcryptjs
- dependencies
- clsx
- d3-array
- d3-shape
- jose
- motion
- next
- @phosphor-icons/react
- @prisma/client
- react
- use-chart-interaction.ts
- stripe
- tailwind-merge
- tw-animate-css
- session.ts
- @visx/event
- @visx/gradient
- @visx/grid
- @visx/responsive
- @visx/scale
- @visx/shape
- client.ts
- useChartHover
- dashboard/releases/page.tsx
- ReleaseBuilder
- entitlements/index.ts
- store.ts
- reference-area-config.ts
- class-variance-authority

## God Nodes (most connected - your core abstractions)
1. `cn()` - 80 edges
2. `prisma` - 41 edges
3. `buttonVariants` - 37 edges
4. `getSessionUser()` - 30 edges
5. `TimeSeriesChartCore` - 29 edges
6. `requireAdmin()` - 24 edges
7. `requireAdminApi()` - 24 edges
8. `requireUser()` - 24 edges
9. `useChartStable()` - 23 edges
10. `Button()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `XAxis()` --calls--> `useChartStable()`  [EXTRACTED]
  src/components/charts/x-axis.tsx → src/components/charts/chart-context.tsx
- `XAxisLabel()` --calls--> `cn()`  [EXTRACTED]
  src/components/charts/x-axis.tsx → src/lib/utils.ts
- `StepNav()` --calls--> `cn()`  [EXTRACTED]
  src/components/dashboard/release-builder.tsx → src/lib/utils.ts
- `AdminAdminsPage()` --calls--> `requireAdmin()`  [EXTRACTED]
  src/app/(admin)/admin/admins/page.tsx → src/lib/auth/admin.ts
- `AdminArtistsPage()` --calls--> `requireAdmin()`  [EXTRACTED]
  src/app/(admin)/admin/artists/page.tsx → src/lib/auth/admin.ts

## Import Cycles
- None detected.

## Communities (82 total, 28 thin omitted)

### Community 0 - "signup-flow.tsx"
Cohesion: 0.15
Nodes (15): metadata, valueProps, planIcons, Screen, SignupFlow(), Step, stepLabels, digitsOnly() (+7 more)

### Community 1 - "series-markers.tsx"
Cohesion: 0.18
Nodes (14): defaultScatterColors, MarkerStyle, PointAt, SeriesMarkers(), SeriesMarkersActiveHighlightProps, SeriesMarkersDimWrapperProps, SeriesMarkersProps, getSeriesMarkerVisualExtent() (+6 more)

### Community 2 - "db.ts"
Cohesion: 0.20
Nodes (13): createSchema, GET(), POST(), schema, createSchema, GET(), ArtistsPage(), metadata (+5 more)

### Community 3 - "chart-tooltip.tsx"
Cohesion: 0.09
Nodes (42): ChartConfigContext, ChartConfigProviderProps, ChartConfigValue, DEFAULT_CHART_CONFIG, resolveTooltipBoxMotion(), SpringConfig, useChartConfig(), chartCssVars (+34 more)

### Community 5 - "loading-sweep.tsx"
Cohesion: 0.09
Nodes (28): ChartLoadingLabel(), ChartLoadingLabelProps, LINE_LOADING_LOOP_PAUSE_MS, LINE_LOADING_PULSE_CYCLE_S, LINE_LOADING_PULSE_EASE, LOADING_LABEL_EXIT_S, LOADING_LABEL_EXIT_Y_PX, BarLoadingSkeleton() (+20 more)

### Community 6 - "devDependencies"
Cohesion: 0.05
Nodes (36): babel-plugin-react-compiler, eslint, eslint-config-next, devDependencies, babel-plugin-react-compiler, eslint, eslint-config-next, tailwindcss (+28 more)

### Community 7 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 8 - "components.json"
Cohesion: 0.08
Nodes (23): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+15 more)

### Community 9 - "x-axis.tsx"
Cohesion: 0.15
Nodes (23): useChart(), allIndexLayouts(), appendProjectionTailTicks(), AxisTick, binomial(), buildDataAlignedTicks(), buildDomainTicks(), composePositiveSum() (+15 more)

### Community 10 - "time-series-chart-shell.tsx"
Cohesion: 0.12
Nodes (21): CHART_CLIP_PASSTHROUGH, CLIP_EXCLUDED_COMPONENT_NAMES, isChartClipPassthrough(), isClipExcludedComponent(), isPostOverlayComponent(), isUnderlayComponent(), resolveChartChildElement(), UNDERLAY_COMPONENT_NAMES (+13 more)

### Community 11 - "projection-utils.ts"
Cohesion: 0.20
Nodes (16): buildAutoFutureValues(), buildProjectionPath(), BuildProjectionPathOptions, buildTargetPath(), computeProjectionAnchorTangentSlope(), intervalFromAdjacentRows(), intervalFromSeriesSpan(), linearRegressionSlope() (+8 more)

### Community 12 - "cn"
Cohesion: 0.09
Nodes (26): metadata, AreaChart(), CardFlip(), CardFlipProps, ColorVariant, GradientButton(), GradientButtonProps, GradientColors (+18 more)

### Community 13 - "line-loading-pulse.tsx"
Cohesion: 0.26
Nodes (13): AreaProps, AreaGradientDefs(), AreaGradientDefsProps, FadeEdges, FadeGradientStop, fadeGradientStops(), FadeSides, resolveFadeSides() (+5 more)

### Community 14 - "button.tsx"
Cohesion: 0.16
Nodes (10): AdminUserEditForm(), CreateArtistForm(), ArtistFields, EditArtistForm(), ReleasesFilter(), SubmitReleaseButton(), UpgradeButtons(), Field() (+2 more)

### Community 15 - "projection-config.ts"
Cohesion: 0.27
Nodes (11): extractProjectionLineConfigs(), getChildComponentName(), isProjectionLineElement(), mergeProjectionXDomainMax(), mergeProjectionYDomain(), normalizeProjectionData(), ProjectionLineConfig, ProjectionLineConfigProps (+3 more)

### Community 16 - "y-domain-utils.ts"
Cohesion: 0.26
Nodes (14): ChartContextValue, ChartPhase, lerpDomain(), snapDomains(), tweenDomains(), useAnimatedYDomains(), UseAnimatedYDomainsOptions, computeYDomainsByAxis() (+6 more)

### Community 17 - "area-chart.tsx"
Cohesion: 0.12
Nodes (25): AreaChartProps, ChartInner(), ChartInnerProps, DEFAULT_MARGIN, extractAreaConfigs(), AreaChartLoading(), AreaChartLoadingProps, LineConfig (+17 more)

### Community 19 - "(marketing)/page.tsx"
Cohesion: 0.13
Nodes (18): metadata, FeaturesPage(), metadata, steps, faqs, metadata, ContactForm(), accents (+10 more)

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
Cohesion: 0.14
Nodes (25): labelgridFetch(), createRelease(), createTrack(), createWriter(), distributeRelease(), getArtist(), getMe(), getRelease() (+17 more)

### Community 31 - "utils.ts"
Cohesion: 0.13
Nodes (10): AdminShell(), DashboardShell(), SiteFooter(), isActive(), SiteHeader(), AnimatedBrandLogo(), AnimatedBrandLogoProps, adminNav (+2 more)

### Community 32 - "submit/route.ts"
Cohesion: 0.11
Nodes (27): ai, allocateCatalogNumber(), contributorSchema, intOrNull(), payloadSchema, POST(), yearOrNull(), ArtistOption (+19 more)

### Community 33 - "admin/support/[id]/page.tsx"
Cohesion: 0.18
Nodes (16): AdminSupportTicketPage(), Props, AdminSupportPage(), metadata, Props, Props, SupportTicketPage(), metadata (+8 more)

### Community 34 - "useChartStable"
Cohesion: 0.19
Nodes (12): useChartStable(), computeSegmentBounds(), HighlightSegment(), HighlightSegmentProps, LineLoadingSweep(), CurveFactory, PatternArea(), PatternAreaProps (+4 more)

### Community 35 - "admin.ts"
Cohesion: 0.06
Nodes (44): AdminAdminsPage(), metadata, AdminArtistsPage(), metadata, AdminLayout(), DELETE(), demoteSchema, Params (+36 more)

### Community 36 - "buttonVariants"
Cohesion: 0.10
Nodes (18): AdminHomePage(), metadata, AdminReleaseDetailPage(), Props, AdminReleasesPage(), FILTERS, metadata, Props (+10 more)

### Community 37 - "area.tsx"
Cohesion: 0.18
Nodes (14): Area(), CurveFactory, useAreaLoadingPulseState(), DashTailStroke(), DashTailStrokeProps, resolveLineLoadingPulseMode(), EMPTY_METRICS, PathStrokeMetrics (+6 more)

### Community 38 - "section-placeholder.tsx"
Cohesion: 0.19
Nodes (5): metadata, metadata, metadata, metadata, SectionPlaceholder()

### Community 39 - "checkout/route.ts"
Cohesion: 0.29
Nodes (12): POST(), schema, POST(), mapStatus(), POST(), runtime, syncSubscription(), appUrl() (+4 more)

### Community 42 - "getSessionUser"
Cohesion: 0.12
Nodes (20): GET(), ownedArtist(), Params, PATCH(), patchSchema, GET(), Params, PATCH() (+12 more)

### Community 43 - "grid.tsx"
Cohesion: 0.42
Nodes (8): useYScale(), Grid(), GridProps, hideEdgeTicks(), resolveRowTickValues(), useGridShimmer(), isLoadingChromePhase(), isLoadingGridChromePhase()

### Community 44 - "animation.ts"
Cohesion: 0.17
Nodes (8): clipRevealTransition(), DEFAULT_ANIMATION_DURATION_MS, DEFAULT_ANIMATION_EASING, DEFAULT_CHART_ENTER_TRANSITION, ChartRevealClip(), ChartRevealClipMode, ChartRevealClipProps, SpringOptions

### Community 45 - "sync-submit.ts"
Cohesion: 0.29
Nodes (13): createArtist(), uploadReleasePhoto(), ensureLabelGridArtist(), GenreRow, loadGenres(), requireGenreId(), resolveGenreId(), resolveLabelId() (+5 more)

### Community 46 - "start.sh"
Cohesion: 0.50
Nodes (3): HOSTNAME, PORT, start.sh script

### Community 47 - "requireUser"
Cohesion: 0.15
Nodes (19): AdminUserDetailPage(), Props, DashboardHomePage(), metadata, metadata, NewReleasePage(), Props, metadata (+11 more)

### Community 48 - "app/layout.tsx"
Cohesion: 0.40
Nodes (3): geistMono, metadata, outfit

### Community 49 - "chart-context.tsx"
Cohesion: 0.16
Nodes (13): ChartHoverContext, ChartHoverContextValue, ChartProvider(), ChartStableContext, ChartStableContextValue, ScaleBand, ScaleLinear, ScaleTime (+5 more)

### Community 51 - "dependencies"
Cohesion: 0.22
Nodes (9): @base-ui/react, dependencies, @base-ui/react, react-dom, shadcn, @visx/curve, react-dom, shadcn (+1 more)

### Community 61 - "use-chart-interaction.ts"
Cohesion: 0.15
Nodes (15): ScaleLinear, ScaleTime, useChartInteraction(), defaultDedupeKey(), ScheduledTooltipControls, useScheduledTooltip(), buildYScalesForLines(), buildYScalesFromDomains() (+7 more)

### Community 66 - "session.ts"
Cohesion: 0.18
Nodes (14): POST(), POST(), POST(), ADMIN_RESTORE_COOKIE, clearSessionCookie(), PublicUser, secretKey(), SESSION_COOKIE (+6 more)

### Community 74 - "client.ts"
Cohesion: 0.24
Nodes (9): LabelGridApiError, labelgridUpload(), RequestOptions, getLabelGridBaseUrl(), getLabelGridEnv(), getLabelGridToken(), isLabelGridLive(), LabelGridConfigError (+1 more)

### Community 75 - "useChartHover"
Cohesion: 0.25
Nodes (8): useChartHover(), ChartLegendHoverContext, ChartLegendHoverContextValue, useChartLegendHover(), SeriesHoverDim(), SeriesHoverDimProps, SeriesMarkersActiveHighlight(), SeriesMarkersDimWrapper()

### Community 76 - "dashboard/releases/page.tsx"
Cohesion: 0.18
Nodes (7): Props, Props, metadata, Props, labels, StatusBadge(), tones

### Community 77 - "ReleaseBuilder"
Cohesion: 0.29
Nodes (3): newContributor(), ReleaseBuilder(), ReleaseSubmitForm

### Community 78 - "entitlements/index.ts"
Cohesion: 0.47
Nodes (5): buildUsageSnapshot(), getArtistUsage(), getReleaseUsage(), UsageSnapshot, canCreateRelease()

### Community 79 - "store.ts"
Cohesion: 0.13
Nodes (19): Params, POST(), schema, contentTypeFor(), GET(), Params, formatLgError(), submitLabelGridDraftForReview() (+11 more)

### Community 80 - "reference-area-config.ts"
Cohesion: 0.29
Nodes (7): extractReferenceAreaConfigs(), getChildComponentName(), isReferenceAreaElement(), ReferenceAreaConfig, ReferenceAreaConfigProps, ReferenceAreaRegistrationContext, ReferenceAreaRegistrationContextValue

## Knowledge Gaps
- **299 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+294 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `submit/route.ts`, `admin/support/[id]/page.tsx`, `db.ts`, `chart-tooltip.tsx`, `buttonVariants`, `loading-sweep.tsx`, `signup-flow.tsx`, `x-axis.tsx`, `dashboard/releases/page.tsx`, `button.tsx`, `requireUser`, `area-chart.tsx`, `(marketing)/page.tsx`, `utils.ts`?**
  _High betweenness centrality (0.211) - this node is a cross-community bridge._
- **Why does `prisma` connect `db.ts` to `submit/route.ts`, `admin/support/[id]/page.tsx`, `session.ts`, `admin.ts`, `buttonVariants`, `checkout/route.ts`, `getSessionUser`, `dashboard/releases/page.tsx`, `sync-submit.ts`, `store.ts`, `requireUser`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Why does `requireAdmin()` connect `admin.ts` to `admin/support/[id]/page.tsx`, `buttonVariants`, `requireUser`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _299 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `chart-tooltip.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0859538784067086 - nodes in this community are weakly interconnected._
- **Should `loading-sweep.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09365079365079365 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._
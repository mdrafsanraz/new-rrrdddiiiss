# Graph Report - RDISTRO  (2026-08-27)

## Corpus Check
- 210 files · ~146,027 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1179 nodes · 2804 edges · 86 communities (58 shown, 28 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `56cb988f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- cn
- db.ts
- series-dash-tail-overlay.tsx
- chart-tooltip.tsx
- lucide-react
- loading-sweep.tsx
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
- use-animated-y-domains.ts
- area-chart.tsx
- @number-flow/react
- area.tsx
- y-axis-ticks.ts
- Railway production
- AGENTS.md
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- chart-defs.ts
- sync-submit.ts
- admin/shell.tsx
- submit/route.ts
- buttonVariants
- chart-context.tsx
- x-axis.tsx
- dashboard/releases/[id]/page.tsx
- release-builder.tsx
- section-placeholder.tsx
- getUserUsage
- prisma
- zod
- session.ts
- use-highlight-segment.ts
- animation.ts
- requireAdminApi
- start.sh
- dashboard/page.tsx
- app/layout.tsx
- getSessionUser
- @base-ui/react
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
- useChartStable
- stripe
- tailwind-merge
- tw-animate-css
- site.ts
- @visx/event
- @visx/gradient
- @visx/grid
- @visx/responsive
- @visx/scale
- @visx/shape
- class-variance-authority
- checkout/route.ts
- submit-for-review/route.ts
- store.ts
- utils.ts
- payloads.ts
- y-domain-utils.ts
- line-loading-timing.ts
- use-animated-series-path.ts
- reference-area-config.ts
- features/page.tsx
- area-chart-loading.tsx

## God Nodes (most connected - your core abstractions)
1. `cn()` - 88 edges
2. `prisma` - 50 edges
3. `getSessionUser()` - 42 edges
4. `buttonVariants` - 39 edges
5. `TimeSeriesChartCore` - 29 edges
6. `labelgridFetch()` - 27 edges
7. `requireAdminApi()` - 26 edges
8. `Button()` - 25 edges
9. `requireAdmin()` - 24 edges
10. `requireUser()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `AdminAdminsPage()` --calls--> `requireAdmin()`  [EXTRACTED]
  src/app/(admin)/admin/admins/page.tsx → src/lib/auth/admin.ts
- `Kpi()` --calls--> `cn()`  [EXTRACTED]
  src/app/(dashboard)/dashboard/page.tsx → src/lib/utils.ts
- `POST()` --calls--> `getSessionUser()`  [EXTRACTED]
  src/app/api/releases/route.ts → src/lib/auth/session.ts
- `XAxis()` --calls--> `useChartStable()`  [EXTRACTED]
  src/components/charts/x-axis.tsx → src/components/charts/chart-context.tsx
- `XAxisLabel()` --calls--> `cn()`  [EXTRACTED]
  src/components/charts/x-axis.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (86 total, 28 thin omitted)

### Community 0 - "cn"
Cohesion: 0.19
Nodes (18): Home(), steps, AreaChart(), AsciiCassette(), AsciiEqualizer(), AsciiLogo(), AsciiTerminal(), CASSETTE_ASCII (+10 more)

### Community 1 - "db.ts"
Cohesion: 0.09
Nodes (28): AdminArtistsPage(), metadata, AdminLayout(), AdminHomePage(), metadata, AdminReleaseDetailPage(), Props, AdminReleasesPage() (+20 more)

### Community 2 - "series-dash-tail-overlay.tsx"
Cohesion: 0.22
Nodes (9): DashTailStroke(), DashTailStrokeProps, EMPTY_METRICS, PathStrokeMetrics, resolveDashStartX(), resolveDashTailBounds(), SeriesDashTailOverlay, SeriesDashTailOverlayImpl() (+1 more)

### Community 3 - "chart-tooltip.tsx"
Cohesion: 0.08
Nodes (43): ChartConfigContext, ChartConfigProviderProps, ChartConfigValue, DEFAULT_CHART_CONFIG, resolveTooltipBoxMotion(), SpringConfig, useChartConfig(), chartCssVars (+35 more)

### Community 5 - "loading-sweep.tsx"
Cohesion: 0.26
Nodes (10): BarLoadingSkeleton(), BarLoadingSkeletonProps, CurveFactory, generateEasedGradientStops(), getSkeletonHeights(), getSkeletonSigns(), hashFract(), LineLoadingSweep() (+2 more)

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
Cohesion: 0.15
Nodes (21): Params, POST(), GET(), POST(), runtime, unwrapPayload(), verifySignature(), isLabelGridLive() (+13 more)

### Community 10 - "time-series-chart-shell.tsx"
Cohesion: 0.12
Nodes (21): CHART_CLIP_PASSTHROUGH, CLIP_EXCLUDED_COMPONENT_NAMES, isClipExcludedComponent(), isPostOverlayComponent(), isUnderlayComponent(), resolveChartChildElement(), UNDERLAY_COMPONENT_NAMES, decimateTimeSeries() (+13 more)

### Community 11 - "projection-utils.ts"
Cohesion: 0.20
Nodes (16): buildAutoFutureValues(), buildProjectionPath(), BuildProjectionPathOptions, buildTargetPath(), computeProjectionAnchorTangentSlope(), intervalFromAdjacentRows(), intervalFromSeriesSpan(), linearRegressionSlope() (+8 more)

### Community 12 - "pricing-cards.tsx"
Cohesion: 0.24
Nodes (6): metadata, faqs, metadata, planAccents, PricingCards(), Reveal()

### Community 13 - "series-markers.tsx"
Cohesion: 0.12
Nodes (21): defaultScatterColors, useChartHover(), ChartLegendHoverContext, ChartLegendHoverContextValue, useChartLegendHover(), SeriesHoverDim(), SeriesHoverDimProps, MarkerStyle (+13 more)

### Community 14 - "button.tsx"
Cohesion: 0.05
Nodes (39): AdminAdminsPage(), metadata, metadata, valueProps, AddAdminForms(), ImpersonationBanner(), ReleaseReviewActions(), RemoveAdminButton() (+31 more)

### Community 15 - "projection-config.ts"
Cohesion: 0.26
Nodes (12): isChartClipPassthrough(), extractProjectionLineConfigs(), getChildComponentName(), isProjectionLineElement(), mergeProjectionXDomainMax(), mergeProjectionYDomain(), normalizeProjectionData(), ProjectionLineConfig (+4 more)

### Community 16 - "use-animated-y-domains.ts"
Cohesion: 0.36
Nodes (10): lerpDomain(), snapDomains(), tweenDomains(), useAnimatedYDomains(), UseAnimatedYDomainsOptions, domainsEqual(), isYDomainTweenPhase(), resolveAnimatedYDestinationDomains() (+2 more)

### Community 17 - "area-chart.tsx"
Cohesion: 0.17
Nodes (20): AreaChartProps, ChartInner(), ChartInnerProps, DEFAULT_MARGIN, extractAreaConfigs(), ChartContextValue, LineConfig, Margin (+12 more)

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

### Community 29 - "sync-submit.ts"
Cohesion: 0.08
Nodes (50): LabelGridApiError, labelgridFetch(), labelgridUpload(), RequestOptions, getLabelGridBaseUrl(), getLabelGridEnv(), getLabelGridToken(), LabelGridConfigError (+42 more)

### Community 31 - "admin/shell.tsx"
Cohesion: 0.21
Nodes (5): DashboardShell(), AnimatedBrandLogo(), AnimatedBrandLogoProps, adminNav, dashboardNav

### Community 32 - "submit/route.ts"
Cohesion: 0.12
Nodes (29): allocateCatalogNumber(), POST(), schema, Params, schema, trackSchema, ai, allocateCatalogNumber() (+21 more)

### Community 33 - "buttonVariants"
Cohesion: 0.22
Nodes (14): AdminSupportTicketPage(), Props, AdminSupportPage(), metadata, Props, Props, SupportTicketPage(), metadata (+6 more)

### Community 34 - "chart-context.tsx"
Cohesion: 0.10
Nodes (21): ChartHoverContext, ChartHoverContextValue, ChartProvider(), ChartStableContext, ChartStableContextValue, ScaleBand, ScaleLinear, ScaleTime (+13 more)

### Community 35 - "x-axis.tsx"
Cohesion: 0.15
Nodes (22): allIndexLayouts(), appendProjectionTailTicks(), AxisTick, binomial(), buildDataAlignedTicks(), buildDomainTicks(), composePositiveSum(), dedupeIndicesByLabel() (+14 more)

### Community 36 - "dashboard/releases/[id]/page.tsx"
Cohesion: 0.12
Nodes (23): Params, POST(), schema, Params, POST(), schema, Props, ReleaseDetailPage() (+15 more)

### Community 37 - "release-builder.tsx"
Cohesion: 0.08
Nodes (34): ArtistOption, buildPayload(), ChipGroup(), COMMON_COUNTRIES, CONTENT_TYPE_OPTIONS, currentYear, EXPLICIT_FRIENDLY, formatBytes() (+26 more)

### Community 38 - "section-placeholder.tsx"
Cohesion: 0.19
Nodes (5): metadata, metadata, metadata, metadata, SectionPlaceholder()

### Community 39 - "getUserUsage"
Cohesion: 0.17
Nodes (15): createSchema, GET(), POST(), createSchema, GET(), POST(), buildUsageSnapshot(), getArtistUsage() (+7 more)

### Community 42 - "session.ts"
Cohesion: 0.12
Nodes (28): POST(), schema, POST(), POST(), schema, POST(), GET(), POST() (+20 more)

### Community 43 - "use-highlight-segment.ts"
Cohesion: 0.23
Nodes (9): computeSegmentBounds(), INACTIVE_SEGMENT, SegmentBounds, HighlightSegment(), HighlightSegmentProps, SeriesHighlightLayer(), SeriesHighlightLayerProps, HighlightSegmentResult (+1 more)

### Community 44 - "animation.ts"
Cohesion: 0.17
Nodes (8): clipRevealTransition(), DEFAULT_ANIMATION_DURATION_MS, DEFAULT_ANIMATION_EASING, DEFAULT_CHART_ENTER_TRANSITION, ChartRevealClip(), ChartRevealClipMode, ChartRevealClipProps, SpringOptions

### Community 45 - "requireAdminApi"
Cohesion: 0.12
Nodes (19): DELETE(), demoteSchema, Params, createSchema, GET(), POST(), promoteSchema, GET() (+11 more)

### Community 46 - "start.sh"
Cohesion: 0.50
Nodes (3): HOSTNAME, PORT, start.sh script

### Community 47 - "dashboard/page.tsx"
Cohesion: 0.13
Nodes (24): ArtistsPage(), metadata, DashboardHomePage(), Empty(), Kpi(), metadata, metadata, NewReleasePage() (+16 more)

### Community 48 - "app/layout.tsx"
Cohesion: 0.40
Nodes (3): geistMono, metadata, outfit

### Community 49 - "getSessionUser"
Cohesion: 0.17
Nodes (14): GET(), ownedArtist(), Params, PATCH(), patchSchema, GET(), GET(), Params (+6 more)

### Community 51 - "dependencies"
Cohesion: 0.22
Nodes (9): bcryptjs, dependencies, bcryptjs, react-dom, shadcn, @visx/curve, react-dom, shadcn (+1 more)

### Community 61 - "useChartStable"
Cohesion: 0.36
Nodes (10): useChartStable(), useYScale(), Grid(), GridProps, hideEdgeTicks(), resolveRowTickValues(), SeriesMarkers(), useGridShimmer() (+2 more)

### Community 66 - "site.ts"
Cohesion: 0.18
Nodes (9): metadata, ContactForm(), SiteFooter(), isActive(), SiteHeader(), StoreTicker(), navLinks, site (+1 more)

### Community 75 - "checkout/route.ts"
Cohesion: 0.29
Nodes (12): POST(), schema, POST(), mapStatus(), POST(), runtime, syncSubscription(), appUrl() (+4 more)

### Community 76 - "submit-for-review/route.ts"
Cohesion: 0.21
Nodes (19): kindSchema, Params, POST(), PATCH(), Params, POST(), Params, PATCH() (+11 more)

### Community 77 - "store.ts"
Cohesion: 0.19
Nodes (12): contentTypeFor(), GET(), Params, ARTWORK_TYPES, AUDIO_TYPES, DOCUMENT_TYPES, extFor(), loadStoredUpload() (+4 more)

### Community 78 - "utils.ts"
Cohesion: 0.13
Nodes (10): CardFlip(), CardFlipProps, ColorVariant, GradientButton(), GradientButtonProps, GradientColors, ShimmerText(), Text_01Props (+2 more)

### Community 79 - "payloads.ts"
Cohesion: 0.17
Nodes (8): ReleaseArtistInput, releaseToWizardSnapshot(), TitleLoc, UI_COMPOSITION_TO_LG, UI_CONTENT_TYPE_TO_LG, UI_EXPLICIT_TO_LG, UI_SAMPLES_TO_LG, parseJsonObject()

### Community 80 - "y-domain-utils.ts"
Cohesion: 0.24
Nodes (10): buildYScalesForLines(), buildYScalesFromDomains(), getPrimaryYScale(), groupLinesByYAxisId(), normalizeYAxisId(), YAxisOrientation, YScale, computeYDomainsByAxis() (+2 more)

### Community 81 - "line-loading-timing.ts"
Cohesion: 0.29
Nodes (8): ChartLoadingLabel(), ChartLoadingLabelProps, LINE_LOADING_LOOP_PAUSE_MS, LINE_LOADING_PULSE_CYCLE_S, LINE_LOADING_PULSE_EASE, LOADING_LABEL_EXIT_S, LOADING_LABEL_EXIT_Y_PX, UseGridShimmerOptions

### Community 82 - "use-animated-series-path.ts"
Cohesion: 0.35
Nodes (9): computeSeriesPathPoints(), CurveFactory, interpolateSeriesPathPoints(), seriesPathFromPoints(), SeriesPathPoint, seriesPathTransitionSignature(), CurveFactory, useAnimatedSeriesPath() (+1 more)

### Community 83 - "reference-area-config.ts"
Cohesion: 0.29
Nodes (7): extractReferenceAreaConfigs(), getChildComponentName(), isReferenceAreaElement(), ReferenceAreaConfig, ReferenceAreaConfigProps, ReferenceAreaRegistrationContext, ReferenceAreaRegistrationContextValue

### Community 84 - "features/page.tsx"
Cohesion: 0.29
Nodes (6): FeaturesPage(), metadata, accents, FeatureGrid(), FeatureArt(), features

### Community 85 - "area-chart-loading.tsx"
Cohesion: 0.36
Nodes (6): AreaChartLoading(), AreaChartLoadingProps, LoadingStyle, generateChartSkeletonData(), GenerateChartSkeletonDataOptions, generateChartSkeletonFromTarget()

## Knowledge Gaps
- **336 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+331 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `db.ts`, `buttonVariants`, `chart-tooltip.tsx`, `dashboard/releases/[id]/page.tsx`, `x-axis.tsx`, `release-builder.tsx`, `site.ts`, `pricing-cards.tsx`, `utils.ts`, `dashboard/page.tsx`, `button.tsx`, `area-chart.tsx`, `line-loading-timing.ts`, `features/page.tsx`, `admin/shell.tsx`?**
  _High betweenness centrality (0.231) - this node is a cross-community bridge._
- **Why does `prisma` connect `db.ts` to `submit/route.ts`, `buttonVariants`, `dashboard/releases/[id]/page.tsx`, `getUserUsage`, `status-sync.ts`, `session.ts`, `checkout/route.ts`, `submit-for-review/route.ts`, `requireAdminApi`, `button.tsx`, `dashboard/page.tsx`, `getSessionUser`, `sync-submit.ts`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `requireAdmin()` connect `db.ts` to `buttonVariants`, `session.ts`, `button.tsx`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _336 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09059233449477352 - nodes in this community are weakly interconnected._
- **Should `chart-tooltip.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08417508417508418 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._
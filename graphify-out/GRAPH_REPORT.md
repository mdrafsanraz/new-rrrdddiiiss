# Graph Report - RDISTRO  (2026-08-27)

## Corpus Check
- 197 files · ~133,523 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1069 nodes · 2413 edges · 80 communities (51 shown, 29 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c8b949a2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- signup-flow.tsx
- series-markers.tsx
- requireUser
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
- site.ts
- y-axis-ticks.ts
- Railway production
- AGENTS.md
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- chart-defs.ts
- sync-submit.ts
- header.tsx
- submit/route.ts
- dashboard/support/page.tsx
- use-highlight-segment.ts
- session.ts
- db.ts
- area.tsx
- section-placeholder.tsx
- pricing-cards.tsx
- prisma
- zod
- getSessionUser
- useChartStable
- animation.ts
- admin/support/[id]/page.tsx
- start.sh
- buttonVariants
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
- y-axis-scales.ts
- stripe
- tailwind-merge
- tw-animate-css
- utils.ts
- @visx/event
- @visx/gradient
- @visx/grid
- @visx/responsive
- @visx/scale
- @visx/shape
- area-chart-loading.tsx
- series-hover-dim.tsx
- dashboard/releases/page.tsx
- AddAdminForms
- @base-ui/react
- reference-area-config.ts

## God Nodes (most connected - your core abstractions)
1. `cn()` - 80 edges
2. `prisma` - 42 edges
3. `buttonVariants` - 37 edges
4. `getSessionUser()` - 32 edges
5. `TimeSeriesChartCore` - 29 edges
6. `Button()` - 24 edges
7. `requireAdmin()` - 24 edges
8. `requireAdminApi()` - 24 edges
9. `requireUser()` - 24 edges
10. `useChartStable()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `XAxis()` --calls--> `useChartStable()`  [EXTRACTED]
  src/components/charts/x-axis.tsx → src/components/charts/chart-context.tsx
- `XAxisLabel()` --calls--> `cn()`  [EXTRACTED]
  src/components/charts/x-axis.tsx → src/lib/utils.ts
- `StepNav()` --calls--> `cn()`  [EXTRACTED]
  src/components/dashboard/release-builder.tsx → src/lib/utils.ts
- `CardFlip()` --calls--> `cn()`  [EXTRACTED]
  src/components/kokonutui/card-flip.tsx → src/lib/utils.ts
- `GradientButton()` --calls--> `cn()`  [EXTRACTED]
  src/components/kokonutui/gradient-button.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (80 total, 29 thin omitted)

### Community 0 - "signup-flow.tsx"
Cohesion: 0.20
Nodes (13): planIcons, Screen, SignupFlow(), Step, stepLabels, digitsOnly(), formatCard(), formatExpiry() (+5 more)

### Community 1 - "series-markers.tsx"
Cohesion: 0.18
Nodes (14): defaultScatterColors, MarkerStyle, PointAt, SeriesMarkers(), SeriesMarkersActiveHighlightProps, SeriesMarkersDimWrapperProps, SeriesMarkersProps, getSeriesMarkerVisualExtent() (+6 more)

### Community 2 - "requireUser"
Cohesion: 0.16
Nodes (11): ArtistDetailPage(), Props, ArtistsPage(), metadata, ReleaseDetailPage(), metadata, SettingsPage(), CreateArtistForm() (+3 more)

### Community 3 - "chart-tooltip.tsx"
Cohesion: 0.08
Nodes (43): ChartConfigContext, ChartConfigProviderProps, ChartConfigValue, DEFAULT_CHART_CONFIG, resolveTooltipBoxMotion(), SpringConfig, useChartConfig(), chartCssVars (+35 more)

### Community 5 - "loading-sweep.tsx"
Cohesion: 0.10
Nodes (27): ChartLoadingLabel(), ChartLoadingLabelProps, LINE_LOADING_LOOP_PAUSE_MS, LINE_LOADING_PULSE_CYCLE_S, LINE_LOADING_PULSE_EASE, LOADING_LABEL_EXIT_S, LOADING_LABEL_EXIT_Y_PX, BarLoadingSkeleton() (+19 more)

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
Nodes (22): allIndexLayouts(), appendProjectionTailTicks(), AxisTick, binomial(), buildDataAlignedTicks(), buildDomainTicks(), composePositiveSum(), dedupeIndicesByLabel() (+14 more)

### Community 10 - "time-series-chart-shell.tsx"
Cohesion: 0.12
Nodes (20): CHART_CLIP_PASSTHROUGH, CLIP_EXCLUDED_COMPONENT_NAMES, isClipExcludedComponent(), isPostOverlayComponent(), isUnderlayComponent(), resolveChartChildElement(), UNDERLAY_COMPONENT_NAMES, decimateTimeSeries() (+12 more)

### Community 11 - "projection-utils.ts"
Cohesion: 0.20
Nodes (16): buildAutoFutureValues(), buildProjectionPath(), BuildProjectionPathOptions, buildTargetPath(), computeProjectionAnchorTangentSlope(), intervalFromAdjacentRows(), intervalFromSeriesSpan(), linearRegressionSlope() (+8 more)

### Community 12 - "cn"
Cohesion: 0.19
Nodes (18): Home(), steps, AsciiCassette(), AsciiEqualizer(), AsciiLogo(), AsciiTerminal(), CASSETTE_ASCII, RDISTRO_ASCII (+10 more)

### Community 13 - "line-loading-pulse.tsx"
Cohesion: 0.26
Nodes (13): AreaProps, AreaGradientDefs(), AreaGradientDefsProps, FadeEdges, FadeGradientStop, fadeGradientStops(), FadeSides, resolveFadeSides() (+5 more)

### Community 14 - "button.tsx"
Cohesion: 0.39
Nodes (3): Field(), FieldProps, Button()

### Community 15 - "projection-config.ts"
Cohesion: 0.26
Nodes (12): isChartClipPassthrough(), extractProjectionLineConfigs(), getChildComponentName(), isProjectionLineElement(), mergeProjectionXDomainMax(), mergeProjectionYDomain(), normalizeProjectionData(), ProjectionLineConfig (+4 more)

### Community 16 - "y-domain-utils.ts"
Cohesion: 0.23
Nodes (15): Y_DOMAIN_TWEEN_SKIP_THRESHOLD, lerpDomain(), snapDomains(), tweenDomains(), useAnimatedYDomains(), UseAnimatedYDomainsOptions, normalizeYAxisId(), computeYDomainsByAxis() (+7 more)

### Community 17 - "area-chart.tsx"
Cohesion: 0.15
Nodes (19): AreaChart(), AreaChartProps, ChartInner(), ChartInnerProps, DEFAULT_MARGIN, extractAreaConfigs(), ChartPhase, ChartStatus (+11 more)

### Community 19 - "site.ts"
Cohesion: 0.17
Nodes (10): metadata, FeaturesPage(), metadata, ContactForm(), accents, FeatureArt(), StoreTicker(), features (+2 more)

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
Nodes (53): Params, POST(), schema, LabelGridApiError, labelgridFetch(), labelgridUpload(), RequestOptions, getLabelGridBaseUrl() (+45 more)

### Community 31 - "header.tsx"
Cohesion: 0.13
Nodes (10): AdminShell(), DashboardShell(), SiteFooter(), isActive(), SiteHeader(), AnimatedBrandLogo(), AnimatedBrandLogoProps, adminNav (+2 more)

### Community 32 - "submit/route.ts"
Cohesion: 0.06
Nodes (47): Params, POST(), schema, contentTypeFor(), GET(), Params, ai, allocateCatalogNumber() (+39 more)

### Community 33 - "dashboard/support/page.tsx"
Cohesion: 0.22
Nodes (13): AdminSupportTicketPage(), AdminSupportPage(), metadata, Props, Props, SupportTicketPage(), metadata, SupportPage() (+5 more)

### Community 34 - "use-highlight-segment.ts"
Cohesion: 0.24
Nodes (9): useChartHover(), computeSegmentBounds(), HighlightSegment(), HighlightSegmentProps, SeriesHighlightLayer(), SeriesHighlightLayerProps, SeriesMarkersActiveHighlight(), HighlightSegmentResult (+1 more)

### Community 35 - "session.ts"
Cohesion: 0.06
Nodes (45): DELETE(), createSchema, GET(), POST(), promoteSchema, POST(), schema, POST() (+37 more)

### Community 36 - "db.ts"
Cohesion: 0.13
Nodes (18): AdminAdminsPage(), metadata, AdminArtistsPage(), metadata, AdminLayout(), AdminHomePage(), metadata, AdminReleasesPage() (+10 more)

### Community 37 - "area.tsx"
Cohesion: 0.18
Nodes (14): Area(), CurveFactory, useAreaLoadingPulseState(), DashTailStroke(), DashTailStrokeProps, resolveLineLoadingPulseMode(), EMPTY_METRICS, PathStrokeMetrics (+6 more)

### Community 38 - "section-placeholder.tsx"
Cohesion: 0.19
Nodes (5): metadata, metadata, metadata, metadata, SectionPlaceholder()

### Community 39 - "pricing-cards.tsx"
Cohesion: 0.16
Nodes (9): metadata, faqs, metadata, metadata, valueProps, LoginForm(), planAccents, PricingCards() (+1 more)

### Community 42 - "getSessionUser"
Cohesion: 0.05
Nodes (58): GET(), ownedArtist(), Params, PATCH(), patchSchema, createSchema, GET(), POST() (+50 more)

### Community 43 - "useChartStable"
Cohesion: 0.40
Nodes (9): useChartStable(), useYScale(), Grid(), GridProps, hideEdgeTicks(), resolveRowTickValues(), useGridShimmer(), isLoadingChromePhase() (+1 more)

### Community 44 - "animation.ts"
Cohesion: 0.17
Nodes (8): clipRevealTransition(), DEFAULT_ANIMATION_DURATION_MS, DEFAULT_ANIMATION_EASING, DEFAULT_CHART_ENTER_TRANSITION, ChartRevealClip(), ChartRevealClipMode, ChartRevealClipProps, SpringOptions

### Community 45 - "admin/support/[id]/page.tsx"
Cohesion: 0.15
Nodes (9): AdminReleaseDetailPage(), Props, Props, Props, LoginAsUserButton(), ReleaseReviewActions(), AdminSupportStatusForm(), AdminUserEditForm() (+1 more)

### Community 46 - "start.sh"
Cohesion: 0.50
Nodes (3): HOSTNAME, PORT, start.sh script

### Community 47 - "buttonVariants"
Cohesion: 0.23
Nodes (10): AdminUserDetailPage(), AdminUsersPage(), metadata, Props, DashboardHomePage(), Empty(), metadata, buttonVariants (+2 more)

### Community 48 - "app/layout.tsx"
Cohesion: 0.40
Nodes (3): geistMono, metadata, outfit

### Community 49 - "chart-context.tsx"
Cohesion: 0.11
Nodes (24): ChartContextValue, ChartHoverContext, ChartHoverContextValue, ChartProvider(), ChartStableContext, ChartStableContextValue, LineConfig, Margin (+16 more)

### Community 51 - "dependencies"
Cohesion: 0.22
Nodes (9): class-variance-authority, dependencies, class-variance-authority, react-dom, shadcn, @visx/curve, react-dom, shadcn (+1 more)

### Community 61 - "y-axis-scales.ts"
Cohesion: 0.28
Nodes (7): buildYScalesForLines(), buildYScalesFromDomains(), DEFAULT_Y_AXIS_ID, getPrimaryYScale(), groupLinesByYAxisId(), YAxisOrientation, YScale

### Community 66 - "utils.ts"
Cohesion: 0.13
Nodes (10): CardFlip(), CardFlipProps, ColorVariant, GradientButton(), GradientButtonProps, GradientColors, ShimmerText(), Text_01Props (+2 more)

### Community 74 - "area-chart-loading.tsx"
Cohesion: 0.36
Nodes (6): AreaChartLoading(), AreaChartLoadingProps, LoadingStyle, generateChartSkeletonData(), GenerateChartSkeletonDataOptions, generateChartSkeletonFromTarget()

### Community 75 - "series-hover-dim.tsx"
Cohesion: 0.28
Nodes (6): ChartLegendHoverContext, ChartLegendHoverContextValue, useChartLegendHover(), SeriesHoverDim(), SeriesHoverDimProps, SeriesMarkersDimWrapper()

### Community 76 - "dashboard/releases/page.tsx"
Cohesion: 0.14
Nodes (10): Props, metadata, Props, ReleasesPage(), ReleasesFilter(), ResubmitReleaseButton(), labels, StatusBadge() (+2 more)

### Community 80 - "reference-area-config.ts"
Cohesion: 0.29
Nodes (7): extractReferenceAreaConfigs(), getChildComponentName(), isReferenceAreaElement(), ReferenceAreaConfig, ReferenceAreaConfigProps, ReferenceAreaRegistrationContext, ReferenceAreaRegistrationContextValue

## Knowledge Gaps
- **300 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+295 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `submit/route.ts`, `dashboard/support/page.tsx`, `requireUser`, `chart-tooltip.tsx`, `db.ts`, `loading-sweep.tsx`, `utils.ts`, `pricing-cards.tsx`, `signup-flow.tsx`, `x-axis.tsx`, `getSessionUser`, `dashboard/releases/page.tsx`, `admin/support/[id]/page.tsx`, `button.tsx`, `buttonVariants`, `area-chart.tsx`, `site.ts`, `header.tsx`?**
  _High betweenness centrality (0.228) - this node is a cross-community bridge._
- **Why does `prisma` connect `db.ts` to `submit/route.ts`, `dashboard/support/page.tsx`, `requireUser`, `session.ts`, `getSessionUser`, `dashboard/releases/page.tsx`, `admin/support/[id]/page.tsx`, `buttonVariants`, `sync-submit.ts`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Why does `requireAdmin()` connect `db.ts` to `dashboard/support/page.tsx`, `session.ts`, `admin/support/[id]/page.tsx`, `buttonVariants`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _300 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `chart-tooltip.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08417508417508418 - nodes in this community are weakly interconnected._
- **Should `loading-sweep.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10160427807486631 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._
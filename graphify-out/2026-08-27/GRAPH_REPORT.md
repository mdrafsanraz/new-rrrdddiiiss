# Graph Report - RDISTRO  (2026-08-27)

## Corpus Check
- 178 files · ~125,983 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 975 nodes · 2152 edges · 79 communities (48 shown, 31 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `81da2d5a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- signup-flow.tsx
- series-markers.tsx
- animation.ts
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
- use-animated-y-domains.ts
- area-chart.tsx
- @number-flow/react
- features/page.tsx
- y-axis-ticks.ts
- Railway production
- AGENTS.md
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- chart-defs.ts
- sync-submit.ts
- site.ts
- requireAdminApi
- useChartHover
- useChartStable
- session.ts
- buttonVariants
- series-dash-tail-overlay.tsx
- section-placeholder.tsx
- checkout/route.ts
- prisma
- zod
- getSessionUser
- grid.tsx
- contact/page.tsx
- area.tsx
- start.sh
- dashboard/page.tsx
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
- reference-area-config.ts
- stripe
- tailwind-merge
- tw-animate-css
- y-domain-utils.ts
- @visx/event
- @visx/gradient
- @visx/grid
- @visx/responsive
- @visx/scale
- @visx/shape
- admin/shell.tsx
- artists/[id]/route.ts
- requireUser
- dashboard/shell.tsx
- @base-ui/react

## God Nodes (most connected - your core abstractions)
1. `cn()` - 70 edges
2. `buttonVariants` - 31 edges
3. `prisma` - 30 edges
4. `TimeSeriesChartCore` - 29 edges
5. `getSessionUser()` - 24 edges
6. `useChartStable()` - 23 edges
7. `labelgridFetch()` - 22 edges
8. `requireUser()` - 20 edges
9. `getUserUsage()` - 20 edges
10. `requireAdmin()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `PATCH()` --calls--> `getSessionUser()`  [EXTRACTED]
  src/app/api/artists/[id]/route.ts → src/lib/auth/session.ts
- `XAxisLabel()` --calls--> `cn()`  [EXTRACTED]
  src/components/charts/x-axis.tsx → src/lib/utils.ts
- `XAxis()` --calls--> `useChartStable()`  [EXTRACTED]
  src/components/charts/x-axis.tsx → src/components/charts/chart-context.tsx
- `AdminArtistsPage()` --calls--> `requireAdmin()`  [EXTRACTED]
  src/app/(admin)/admin/artists/page.tsx → src/lib/auth/admin.ts
- `AdminLayout()` --calls--> `requireAdmin()`  [EXTRACTED]
  src/app/(admin)/admin/layout.tsx → src/lib/auth/admin.ts

## Import Cycles
- None detected.

## Communities (79 total, 31 thin omitted)

### Community 0 - "signup-flow.tsx"
Cohesion: 0.14
Nodes (16): metadata, valueProps, planIcons, Screen, SignupFlow(), Step, stepLabels, digitsOnly() (+8 more)

### Community 1 - "series-markers.tsx"
Cohesion: 0.18
Nodes (13): defaultScatterColors, MarkerStyle, PointAt, SeriesMarkersActiveHighlightProps, SeriesMarkersDimWrapperProps, SeriesMarkersProps, getSeriesMarkerVisualExtent(), MarkerCirclesProps (+5 more)

### Community 2 - "animation.ts"
Cohesion: 0.17
Nodes (8): clipRevealTransition(), DEFAULT_ANIMATION_DURATION_MS, DEFAULT_ANIMATION_EASING, DEFAULT_CHART_ENTER_TRANSITION, ChartRevealClip(), ChartRevealClipMode, ChartRevealClipProps, SpringOptions

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
Cohesion: 0.11
Nodes (24): CHART_CLIP_PASSTHROUGH, CLIP_EXCLUDED_COMPONENT_NAMES, isClipExcludedComponent(), isPostOverlayComponent(), isUnderlayComponent(), resolveChartChildElement(), UNDERLAY_COMPONENT_NAMES, isChartInteractionPhase() (+16 more)

### Community 11 - "projection-utils.ts"
Cohesion: 0.19
Nodes (17): buildAutoFutureValues(), buildProjectionPath(), BuildProjectionPathOptions, buildTargetPath(), computeProjectionAnchorTangentSlope(), intervalFromAdjacentRows(), intervalFromSeriesSpan(), linearRegressionSlope() (+9 more)

### Community 12 - "cn"
Cohesion: 0.10
Nodes (28): Home(), steps, AreaChart(), CardFlip(), CardFlipProps, ColorVariant, GradientButton(), GradientButtonProps (+20 more)

### Community 13 - "line-loading-pulse.tsx"
Cohesion: 0.31
Nodes (11): AreaGradientDefs(), AreaGradientDefsProps, FadeEdges, FadeGradientStop, fadeGradientStops(), FadeSides, resolveFadeSides(), viewportFadeGradientAttrs() (+3 more)

### Community 14 - "button.tsx"
Cohesion: 0.11
Nodes (14): metadata, ImpersonationBanner(), ReleaseReviewActions(), AdminUserEditForm(), CreateArtistForm(), ArtistFields, EditArtistForm(), ReleasesFilter() (+6 more)

### Community 15 - "projection-config.ts"
Cohesion: 0.31
Nodes (10): isChartClipPassthrough(), extractProjectionLineConfigs(), getChildComponentName(), isProjectionLineElement(), mergeProjectionYDomain(), normalizeProjectionData(), ProjectionLineConfig, ProjectionLineConfigProps (+2 more)

### Community 16 - "use-animated-y-domains.ts"
Cohesion: 0.36
Nodes (10): lerpDomain(), snapDomains(), tweenDomains(), useAnimatedYDomains(), UseAnimatedYDomainsOptions, domainsEqual(), isYDomainTweenPhase(), resolveAnimatedYDestinationDomains() (+2 more)

### Community 17 - "area-chart.tsx"
Cohesion: 0.19
Nodes (19): AreaChartProps, ChartInner(), ChartInnerProps, DEFAULT_MARGIN, extractAreaConfigs(), ChartContextValue, LineConfig, Margin (+11 more)

### Community 19 - "features/page.tsx"
Cohesion: 0.18
Nodes (11): FeaturesPage(), metadata, faqs, metadata, accents, FeatureGrid(), FeatureArt(), planAccents (+3 more)

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
Cohesion: 0.05
Nodes (69): contentTypeFor(), GET(), Params, fieldsSchema, POST(), ArtistOption, ReleaseSubmitForm(), LabelGridApiError (+61 more)

### Community 31 - "site.ts"
Cohesion: 0.18
Nodes (9): SiteFooter(), isActive(), SiteHeader(), AnimatedBrandLogo(), AnimatedBrandLogoProps, StoreTicker(), navLinks, site (+1 more)

### Community 32 - "requireAdminApi"
Cohesion: 0.19
Nodes (11): Params, POST(), schema, Params, POST(), schema, GET(), Params (+3 more)

### Community 33 - "useChartHover"
Cohesion: 0.25
Nodes (8): useChartHover(), ChartLegendHoverContext, ChartLegendHoverContextValue, useChartLegendHover(), SeriesHoverDim(), SeriesHoverDimProps, SeriesMarkersActiveHighlight(), SeriesMarkersDimWrapper()

### Community 34 - "useChartStable"
Cohesion: 0.31
Nodes (8): useChartStable(), computeSegmentBounds(), HighlightSegment(), HighlightSegmentProps, SeriesHighlightLayer(), SeriesHighlightLayerProps, HighlightSegmentResult, useHighlightSegment()

### Community 35 - "session.ts"
Cohesion: 0.11
Nodes (27): POST(), schema, POST(), POST(), schema, POST(), GET(), POST() (+19 more)

### Community 36 - "buttonVariants"
Cohesion: 0.13
Nodes (24): AdminArtistsPage(), metadata, AdminLayout(), AdminHomePage(), metadata, AdminReleaseDetailPage(), Props, AdminReleasesPage() (+16 more)

### Community 37 - "series-dash-tail-overlay.tsx"
Cohesion: 0.22
Nodes (9): DashTailStroke(), DashTailStrokeProps, EMPTY_METRICS, PathStrokeMetrics, resolveDashStartX(), resolveDashTailBounds(), SeriesDashTailOverlay, SeriesDashTailOverlayImpl() (+1 more)

### Community 38 - "section-placeholder.tsx"
Cohesion: 0.15
Nodes (6): metadata, metadata, metadata, metadata, metadata, SectionPlaceholder()

### Community 39 - "checkout/route.ts"
Cohesion: 0.29
Nodes (12): POST(), schema, POST(), mapStatus(), POST(), runtime, syncSubscription(), appUrl() (+4 more)

### Community 42 - "getSessionUser"
Cohesion: 0.15
Nodes (20): createSchema, GET(), POST(), GET(), Params, PATCH(), patchSchema, POST() (+12 more)

### Community 43 - "grid.tsx"
Cohesion: 0.23
Nodes (12): AreaChartLoading(), AreaChartLoadingProps, LoadingStyle, generateChartSkeletonData(), GenerateChartSkeletonDataOptions, Grid(), GridProps, hideEdgeTicks() (+4 more)

### Community 45 - "area.tsx"
Cohesion: 0.33
Nodes (9): Area(), AreaProps, CurveFactory, useAreaLoadingPulseState(), useYScale(), LineLoadingPulseMode, resolveLineLoadingPulseMode(), usePathStrokeMetrics() (+1 more)

### Community 46 - "start.sh"
Cohesion: 0.50
Nodes (3): HOSTNAME, PORT, start.sh script

### Community 47 - "dashboard/page.tsx"
Cohesion: 0.16
Nodes (15): DashboardHomePage(), metadata, metadata, SubscriptionPage(), UsageMeter(), buildUsageSnapshot(), getArtistUsage(), getReleaseUsage() (+7 more)

### Community 48 - "app/layout.tsx"
Cohesion: 0.40
Nodes (3): geistMono, metadata, outfit

### Community 49 - "chart-context.tsx"
Cohesion: 0.10
Nodes (22): ChartHoverContext, ChartHoverContextValue, ChartProvider(), ChartStableContext, ChartStableContextValue, ScaleBand, ScaleLinear, ScaleTime (+14 more)

### Community 51 - "dependencies"
Cohesion: 0.22
Nodes (9): class-variance-authority, dependencies, class-variance-authority, react-dom, shadcn, @visx/curve, react-dom, shadcn (+1 more)

### Community 61 - "reference-area-config.ts"
Cohesion: 0.29
Nodes (7): extractReferenceAreaConfigs(), getChildComponentName(), isReferenceAreaElement(), ReferenceAreaConfig, ReferenceAreaConfigProps, ReferenceAreaRegistrationContext, ReferenceAreaRegistrationContextValue

### Community 66 - "y-domain-utils.ts"
Cohesion: 0.22
Nodes (11): Y_DOMAIN_TWEEN_SKIP_THRESHOLD, buildYScalesForLines(), buildYScalesFromDomains(), DEFAULT_Y_AXIS_ID, groupLinesByYAxisId(), normalizeYAxisId(), YAxisOrientation, YScale (+3 more)

### Community 75 - "artists/[id]/route.ts"
Cohesion: 0.40
Nodes (5): GET(), ownedArtist(), Params, PATCH(), patchSchema

### Community 76 - "requireUser"
Cohesion: 0.14
Nodes (13): ArtistDetailPage(), Props, Props, ReleaseDetailPage(), metadata, Props, ReleasesPage(), metadata (+5 more)

## Knowledge Gaps
- **279 isolated node(s):** `metadata`, `metadata`, `Props`, `metadata`, `Props` (+274 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `signup-flow.tsx`, `chart-tooltip.tsx`, `buttonVariants`, `loading-sweep.tsx`, `x-axis.tsx`, `admin/shell.tsx`, `requireUser`, `dashboard/shell.tsx`, `button.tsx`, `dashboard/page.tsx`, `area-chart.tsx`, `features/page.tsx`, `site.ts`?**
  _High betweenness centrality (0.205) - this node is a cross-community bridge._
- **Why does `prisma` connect `buttonVariants` to `requireAdminApi`, `session.ts`, `checkout/route.ts`, `getSessionUser`, `artists/[id]/route.ts`, `requireUser`, `dashboard/page.tsx`, `sync-submit.ts`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `useChartStable()` connect `useChartStable` to `series-markers.tsx`, `chart-tooltip.tsx`, `loading-sweep.tsx`, `x-axis.tsx`, `grid.tsx`, `line-loading-pulse.tsx`, `area.tsx`, `chart-context.tsx`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `metadata`, `metadata`, `Props` to the rest of the system?**
  _279 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `signup-flow.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `chart-tooltip.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08417508417508418 - nodes in this community are weakly interconnected._
- **Should `loading-sweep.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10160427807486631 - nodes in this community are weakly interconnected._
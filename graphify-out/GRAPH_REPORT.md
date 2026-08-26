# Graph Report - RDISTRO  (2026-08-26)

## Corpus Check
- 153 files · ~116,903 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 844 nodes · 1772 edges · 74 communities (46 shown, 28 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- signup-flow.tsx
- series-markers.tsx
- chart-context.tsx
- chart-tooltip.tsx
- dependencies
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
- y-axis-scales.ts
- y-domain-utils.ts
- area-chart.tsx
- area-chart-loading.tsx
- reference-area-config.ts
- y-axis-ticks.ts
- README.md
- AGENTS.md
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- chart-defs.ts
- labelgrid/index.ts
- utils.ts
- site.ts
- dashboard/page.tsx
- releases/page.tsx
- session.ts
- buttonVariants
- area.tsx
- section-placeholder.tsx
- checkout/route.ts
- animation.ts
- projection-config.ts
- getSessionUser
- series-dash-tail-overlay.tsx
- useChartHover
- entitlements/index.ts
- use-highlight-segment.ts
- new/page.tsx
- app/layout.tsx
- @base-ui/react
- bcryptjs
- class-variance-authority
- clsx
- d3-array
- d3-shape
- jose
- motion
- next
- @phosphor-icons/react
- @prisma/client
- react
- react-dom
- shadcn
- stripe
- tailwind-merge
- tw-animate-css
- @visx/curve
- @visx/event
- @visx/gradient
- @visx/grid
- @visx/responsive
- @visx/scale
- @visx/shape

## God Nodes (most connected - your core abstractions)
1. `cn()` - 60 edges
2. `TimeSeriesChartCore` - 29 edges
3. `useChartStable()` - 23 edges
4. `getSessionUser()` - 22 edges
5. `buttonVariants` - 21 edges
6. `requireUser()` - 20 edges
7. `getUserUsage()` - 18 edges
8. `prisma` - 17 edges
9. `labelgridFetch()` - 16 edges
10. `compilerOptions` - 16 edges

## Surprising Connections (you probably didn't know these)
- `NewReleasePage()` --calls--> `requireUser()`  [EXTRACTED]
  src/app/(dashboard)/dashboard/releases/new/page.tsx → src/lib/auth/session.ts
- `POST()` --calls--> `getSessionUser()`  [EXTRACTED]
  src/app/api/releases/route.ts → src/lib/auth/session.ts
- `XAxis()` --calls--> `useChartStable()`  [EXTRACTED]
  src/components/charts/x-axis.tsx → src/components/charts/chart-context.tsx
- `SeriesMarkersActiveHighlight()` --calls--> `useChartHover()`  [EXTRACTED]
  src/components/charts/series-markers.tsx → src/components/charts/chart-context.tsx
- `XAxisLabel()` --calls--> `cn()`  [EXTRACTED]
  src/components/charts/x-axis.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (74 total, 28 thin omitted)

### Community 0 - "signup-flow.tsx"
Cohesion: 0.15
Nodes (15): metadata, valueProps, planIcons, Screen, SignupFlow(), Step, stepLabels, digitsOnly() (+7 more)

### Community 1 - "series-markers.tsx"
Cohesion: 0.18
Nodes (13): MarkerStyle, PointAt, SeriesMarkersActiveHighlight(), SeriesMarkersActiveHighlightProps, SeriesMarkersDimWrapperProps, SeriesMarkersProps, getSeriesMarkerVisualExtent(), MarkerCirclesProps (+5 more)

### Community 2 - "chart-context.tsx"
Cohesion: 0.12
Nodes (20): ChartHoverContext, ChartHoverContextValue, ChartProvider(), ChartStableContext, ChartStableContextValue, defaultScatterColors, LineConfig, ScaleBand (+12 more)

### Community 3 - "chart-tooltip.tsx"
Cohesion: 0.08
Nodes (43): ChartConfigContext, ChartConfigProviderProps, ChartConfigValue, DEFAULT_CHART_CONFIG, resolveTooltipBoxMotion(), SpringConfig, useChartConfig(), chartCssVars (+35 more)

### Community 4 - "dependencies"
Cohesion: 0.29
Nodes (7): lucide-react, @number-flow/react, dependencies, lucide-react, @number-flow/react, zod, zod

### Community 5 - "loading-sweep.tsx"
Cohesion: 0.10
Nodes (27): ChartLoadingLabelProps, LINE_LOADING_LOOP_PAUSE_MS, LINE_LOADING_PULSE_CYCLE_S, LINE_LOADING_PULSE_EASE, LOADING_LABEL_EXIT_S, LOADING_LABEL_EXIT_Y_PX, BarLoadingSkeleton(), BarLoadingSkeletonProps (+19 more)

### Community 6 - "devDependencies"
Cohesion: 0.05
Nodes (36): babel-plugin-react-compiler, eslint, eslint-config-next, devDependencies, babel-plugin-react-compiler, eslint, eslint-config-next, prisma (+28 more)

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
Nodes (22): CHART_CLIP_PASSTHROUGH, CLIP_EXCLUDED_COMPONENT_NAMES, isClipExcludedComponent(), isPostOverlayComponent(), isUnderlayComponent(), resolveChartChildElement(), UNDERLAY_COMPONENT_NAMES, isChartInteractionPhase() (+14 more)

### Community 11 - "projection-utils.ts"
Cohesion: 0.20
Nodes (16): buildAutoFutureValues(), buildProjectionPath(), BuildProjectionPathOptions, buildTargetPath(), computeProjectionAnchorTangentSlope(), intervalFromAdjacentRows(), intervalFromSeriesSpan(), linearRegressionSlope() (+8 more)

### Community 12 - "cn"
Cohesion: 0.14
Nodes (22): Home(), steps, CardFlip(), CardFlipProps, ShimmerText(), Text_01Props, AsciiCassette(), AsciiEqualizer() (+14 more)

### Community 13 - "line-loading-pulse.tsx"
Cohesion: 0.31
Nodes (11): AreaGradientDefs(), AreaGradientDefsProps, FadeEdges, FadeGradientStop, fadeGradientStops(), FadeSides, resolveFadeSides(), viewportFadeGradientAttrs() (+3 more)

### Community 14 - "button.tsx"
Cohesion: 0.24
Nodes (8): ArtistFields, ColorVariant, GradientButton(), GradientButtonProps, GradientColors, Field(), FieldProps, Button()

### Community 15 - "y-axis-scales.ts"
Cohesion: 0.28
Nodes (7): buildYScalesForLines(), buildYScalesFromDomains(), DEFAULT_Y_AXIS_ID, getPrimaryYScale(), groupLinesByYAxisId(), YAxisOrientation, YScale

### Community 16 - "y-domain-utils.ts"
Cohesion: 0.17
Nodes (20): Y_DOMAIN_TWEEN_SKIP_THRESHOLD, Grid(), GridProps, hideEdgeTicks(), resolveRowTickValues(), lerpDomain(), snapDomains(), tweenDomains() (+12 more)

### Community 17 - "area-chart.tsx"
Cohesion: 0.15
Nodes (21): AreaChart(), AreaChartProps, ChartInner(), ChartInnerProps, DEFAULT_MARGIN, extractAreaConfigs(), ChartContextValue, Margin (+13 more)

### Community 18 - "area-chart-loading.tsx"
Cohesion: 0.38
Nodes (5): AreaChartLoading(), AreaChartLoadingProps, generateChartSkeletonData(), GenerateChartSkeletonDataOptions, generateChartSkeletonFromTarget()

### Community 19 - "reference-area-config.ts"
Cohesion: 0.29
Nodes (7): extractReferenceAreaConfigs(), getChildComponentName(), isReferenceAreaElement(), ReferenceAreaConfig, ReferenceAreaConfigProps, ReferenceAreaRegistrationContext, ReferenceAreaRegistrationContextValue

### Community 20 - "y-axis-ticks.ts"
Cohesion: 0.40
Nodes (3): Y_AXIS_DEFAULT_TICK_COUNT, Y_AXIS_MAX_TICK_COUNT, Y_AXIS_MIN_TICK_COUNT

### Community 21 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 28 - "chart-defs.ts"
Cohesion: 0.46
Nodes (7): collectChartDefsChildren(), getChartChildComponentName(), isChartDefsComponent(), isGradientDefComponent(), isPatternDefComponent(), partitionChartDefNodes(), VISX_PATTERN_COMPONENT_NAMES

### Community 29 - "labelgrid/index.ts"
Cohesion: 0.11
Nodes (26): LabelGridApiError, labelgridFetch(), RequestOptions, getLabelGridBaseUrl(), getLabelGridEnv(), getLabelGridToken(), isLabelGridLive(), LabelGridConfigError (+18 more)

### Community 31 - "utils.ts"
Cohesion: 0.19
Nodes (7): SiteFooter(), isActive(), SiteHeader(), AnimatedBrandLogo(), AnimatedBrandLogoProps, dashboardNav, navLinks

### Community 32 - "site.ts"
Cohesion: 0.11
Nodes (18): metadata, FeaturesPage(), metadata, metadata, faqs, metadata, ContactForm(), accents (+10 more)

### Community 33 - "dashboard/page.tsx"
Cohesion: 0.18
Nodes (14): DashboardLayout(), DashboardHomePage(), metadata, metadata, SettingsPage(), metadata, SubscriptionPage(), UpgradeButtons() (+6 more)

### Community 34 - "releases/page.tsx"
Cohesion: 0.16
Nodes (17): createSchema, GET(), POST(), createSchema, GET(), POST(), ArtistsPage(), metadata (+9 more)

### Community 35 - "session.ts"
Cohesion: 0.16
Nodes (15): POST(), schema, POST(), GET(), POST(), schema, clearSessionCookie(), PublicUser (+7 more)

### Community 36 - "buttonVariants"
Cohesion: 0.13
Nodes (12): ArtistDetailPage(), Props, Empty(), Props, ReleaseDetailPage(), EditArtistForm(), DashboardShell(), labels (+4 more)

### Community 37 - "area.tsx"
Cohesion: 0.19
Nodes (17): Area(), AreaProps, CurveFactory, useAreaLoadingPulseState(), useChartStable(), useYScale(), LoadingStyle, HighlightSegment() (+9 more)

### Community 38 - "section-placeholder.tsx"
Cohesion: 0.15
Nodes (6): metadata, metadata, metadata, metadata, metadata, SectionPlaceholder()

### Community 39 - "checkout/route.ts"
Cohesion: 0.29
Nodes (12): POST(), schema, POST(), mapStatus(), POST(), runtime, syncSubscription(), appUrl() (+4 more)

### Community 40 - "animation.ts"
Cohesion: 0.17
Nodes (8): clipRevealTransition(), DEFAULT_ANIMATION_DURATION_MS, DEFAULT_ANIMATION_EASING, DEFAULT_CHART_ENTER_TRANSITION, ChartRevealClip(), ChartRevealClipMode, ChartRevealClipProps, SpringOptions

### Community 41 - "projection-config.ts"
Cohesion: 0.22
Nodes (14): isChartClipPassthrough(), extractProjectionLineConfigs(), getChildComponentName(), isProjectionLineElement(), mergeProjectionXDomainMax(), mergeProjectionYDomain(), normalizeProjectionData(), ProjectionLineConfig (+6 more)

### Community 42 - "getSessionUser"
Cohesion: 0.22
Nodes (12): GET(), ownedArtist(), Params, PATCH(), patchSchema, GET(), Params, PATCH() (+4 more)

### Community 43 - "series-dash-tail-overlay.tsx"
Cohesion: 0.22
Nodes (9): DashTailStroke(), DashTailStrokeProps, EMPTY_METRICS, PathStrokeMetrics, resolveDashStartX(), resolveDashTailBounds(), SeriesDashTailOverlay, SeriesDashTailOverlayImpl() (+1 more)

### Community 44 - "useChartHover"
Cohesion: 0.29
Nodes (7): useChartHover(), ChartLegendHoverContext, ChartLegendHoverContextValue, useChartLegendHover(), SeriesHoverDim(), SeriesHoverDimProps, SeriesMarkersDimWrapper()

### Community 45 - "entitlements/index.ts"
Cohesion: 0.32
Nodes (7): buildUsageSnapshot(), getArtistUsage(), getReleaseUsage(), UsageSnapshot, canCreateArtist(), canCreateRelease(), PlanLimits

### Community 46 - "use-highlight-segment.ts"
Cohesion: 0.47
Nodes (4): computeSegmentBounds(), INACTIVE_SEGMENT, SegmentBounds, HighlightSegmentResult

### Community 47 - "new/page.tsx"
Cohesion: 0.40
Nodes (4): metadata, NewReleasePage(), Props, NewReleaseForm()

### Community 48 - "app/layout.tsx"
Cohesion: 0.40
Nodes (3): geistMono, metadata, outfit

## Knowledge Gaps
- **242 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+237 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `site.ts`, `dashboard/page.tsx`, `releases/page.tsx`, `chart-tooltip.tsx`, `buttonVariants`, `loading-sweep.tsx`, `signup-flow.tsx`, `x-axis.tsx`, `button.tsx`, `area-chart.tsx`, `utils.ts`?**
  _High betweenness centrality (0.167) - this node is a cross-community bridge._
- **Why does `prisma` connect `releases/page.tsx` to `dashboard/page.tsx`, `session.ts`, `buttonVariants`, `checkout/route.ts`, `getSessionUser`, `new/page.tsx`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `useChartStable()` connect `area.tsx` to `series-markers.tsx`, `chart-context.tsx`, `chart-tooltip.tsx`, `loading-sweep.tsx`, `x-axis.tsx`, `line-loading-pulse.tsx`, `use-highlight-segment.ts`, `y-domain-utils.ts`, `area-chart.tsx`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _242 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `chart-context.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1225296442687747 - nodes in this community are weakly interconnected._
- **Should `chart-tooltip.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08417508417508418 - nodes in this community are weakly interconnected._
- **Should `loading-sweep.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09747899159663866 - nodes in this community are weakly interconnected._
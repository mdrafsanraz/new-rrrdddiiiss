# Graph Report - RDISTRO  (2026-08-26)

## Corpus Check
- 152 files · ~116,948 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 852 nodes · 1780 edges · 68 communities (40 shown, 28 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `29467421`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- signup-flow.tsx
- series-markers.tsx
- chart-context.tsx
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
- (marketing)/page.tsx
- button.tsx
- y-axis-scales.ts
- y-domain-utils.ts
- area-chart.tsx
- @number-flow/react
- normalizeYAxisId
- y-axis-ticks.ts
- Railway production
- AGENTS.md
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- chart-defs.ts
- labelgrid/index.ts
- buttonVariants
- features/page.tsx
- dashboard/page.tsx
- getUserUsage
- session.ts
- releases/page.tsx
- area.tsx
- section-placeholder.tsx
- checkout/route.ts
- prisma
- zod
- getSessionUser
- plans.ts
- requireUser
- app/layout.tsx
- @base-ui/react
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
- stripe
- tailwind-merge
- tw-animate-css
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
- `XAxisLabel()` --calls--> `cn()`  [EXTRACTED]
  src/components/charts/x-axis.tsx → src/lib/utils.ts
- `XAxis()` --calls--> `useChartStable()`  [EXTRACTED]
  src/components/charts/x-axis.tsx → src/components/charts/chart-context.tsx
- `SeriesMarkersProps` --inherits--> `SeriesPointMarkerStyle`  [EXTRACTED]
  src/components/charts/series-markers.tsx → src/components/charts/series-point-marker.tsx
- `AreaProps` --references--> `SeriesPointMarkerStyle`  [EXTRACTED]
  src/components/charts/area.tsx → src/components/charts/series-point-marker.tsx
- `UseAnimatedYDomainsOptions` --references--> `ChartPhase`  [EXTRACTED]
  src/components/charts/use-animated-y-domains.ts → src/components/charts/chart-phase.ts

## Import Cycles
- None detected.

## Communities (68 total, 28 thin omitted)

### Community 0 - "signup-flow.tsx"
Cohesion: 0.20
Nodes (13): planIcons, Screen, SignupFlow(), Step, stepLabels, digitsOnly(), formatCard(), formatExpiry() (+5 more)

### Community 1 - "series-markers.tsx"
Cohesion: 0.07
Nodes (29): clipRevealTransition(), DEFAULT_ANIMATION_DURATION_MS, DEFAULT_ANIMATION_EASING, DEFAULT_CHART_ENTER_TRANSITION, defaultScatterColors, useChartHover(), ChartLegendHoverContext, ChartLegendHoverContextValue (+21 more)

### Community 2 - "chart-context.tsx"
Cohesion: 0.13
Nodes (18): ChartContextValue, ChartHoverContext, ChartHoverContextValue, ChartProvider(), ChartStableContext, ChartStableContextValue, ScaleBand, ScaleLinear (+10 more)

### Community 3 - "chart-tooltip.tsx"
Cohesion: 0.08
Nodes (43): ChartConfigContext, ChartConfigProviderProps, ChartConfigValue, DEFAULT_CHART_CONFIG, resolveTooltipBoxMotion(), SpringConfig, useChartConfig(), chartCssVars (+35 more)

### Community 5 - "loading-sweep.tsx"
Cohesion: 0.09
Nodes (29): ChartLoadingLabel(), ChartLoadingLabelProps, LINE_LOADING_LOOP_PAUSE_MS, LINE_LOADING_PULSE_CYCLE_S, LINE_LOADING_PULSE_EASE, LOADING_LABEL_EXIT_S, LOADING_LABEL_EXIT_Y_PX, BarLoadingSkeleton() (+21 more)

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
Cohesion: 0.10
Nodes (24): AreaChartLoading(), CHART_CLIP_PASSTHROUGH, CLIP_EXCLUDED_COMPONENT_NAMES, isClipExcludedComponent(), isPostOverlayComponent(), isUnderlayComponent(), resolveChartChildElement(), UNDERLAY_COMPONENT_NAMES (+16 more)

### Community 11 - "projection-utils.ts"
Cohesion: 0.12
Nodes (28): isChartClipPassthrough(), extractProjectionLineConfigs(), getChildComponentName(), isProjectionLineElement(), mergeProjectionXDomainMax(), mergeProjectionYDomain(), normalizeProjectionData(), ProjectionLineConfig (+20 more)

### Community 12 - "cn"
Cohesion: 0.12
Nodes (23): CardFlip(), CardFlipProps, ColorVariant, GradientButton(), GradientButtonProps, GradientColors, ShimmerText(), Text_01Props (+15 more)

### Community 13 - "(marketing)/page.tsx"
Cohesion: 0.25
Nodes (7): metadata, steps, ContactForm(), StoreTicker(), navLinks, site, stores

### Community 14 - "button.tsx"
Cohesion: 0.22
Nodes (8): metadata, CreateArtistForm(), ArtistFields, EditArtistForm(), Field(), FieldProps, LoginForm(), Button()

### Community 15 - "y-axis-scales.ts"
Cohesion: 0.28
Nodes (7): buildYScalesForLines(), buildYScalesFromDomains(), DEFAULT_Y_AXIS_ID, getPrimaryYScale(), groupLinesByYAxisId(), YAxisOrientation, YScale

### Community 16 - "y-domain-utils.ts"
Cohesion: 0.29
Nodes (12): lerpDomain(), snapDomains(), tweenDomains(), useAnimatedYDomains(), UseAnimatedYDomainsOptions, computeYDomainsByAxis(), domainsEqual(), isYDomainTweenPhase() (+4 more)

### Community 17 - "area-chart.tsx"
Cohesion: 0.15
Nodes (23): AreaChart(), AreaChartProps, ChartInner(), ChartInnerProps, DEFAULT_MARGIN, extractAreaConfigs(), AreaChartLoadingProps, LineConfig (+15 more)

### Community 19 - "normalizeYAxisId"
Cohesion: 0.24
Nodes (9): extractReferenceAreaConfigs(), getChildComponentName(), isReferenceAreaElement(), ReferenceAreaConfig, ReferenceAreaConfigProps, ReferenceAreaRegistrationContext, ReferenceAreaRegistrationContextValue, normalizeYAxisId() (+1 more)

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
Cohesion: 0.11
Nodes (26): LabelGridApiError, labelgridFetch(), RequestOptions, getLabelGridBaseUrl(), getLabelGridEnv(), getLabelGridToken(), isLabelGridLive(), LabelGridConfigError (+18 more)

### Community 31 - "buttonVariants"
Cohesion: 0.11
Nodes (14): ArtistDetailPage(), Empty(), Props, ReleaseDetailPage(), Home(), DashboardShell(), SubmitReleaseButton(), SiteFooter() (+6 more)

### Community 32 - "features/page.tsx"
Cohesion: 0.13
Nodes (14): FeaturesPage(), metadata, faqs, metadata, metadata, valueProps, accents, FeatureGrid() (+6 more)

### Community 33 - "dashboard/page.tsx"
Cohesion: 0.21
Nodes (9): DashboardHomePage(), metadata, metadata, SubscriptionPage(), UpgradeButtons(), UsageMeter(), formatLimit(), usagePercent() (+1 more)

### Community 34 - "getUserUsage"
Cohesion: 0.28
Nodes (9): createSchema, GET(), POST(), GET(), ArtistsPage(), metadata, toPublicUser(), assertCanCreateArtist() (+1 more)

### Community 35 - "session.ts"
Cohesion: 0.17
Nodes (15): POST(), schema, POST(), POST(), schema, clearSessionCookie(), PublicUser, secretKey() (+7 more)

### Community 36 - "releases/page.tsx"
Cohesion: 0.16
Nodes (8): Props, metadata, Props, ReleasesPage(), ReleasesFilter(), labels, StatusBadge(), tones

### Community 37 - "area.tsx"
Cohesion: 0.07
Nodes (49): Area(), AreaProps, CurveFactory, AreaGradientDefs(), AreaGradientDefsProps, useAreaLoadingPulseState(), useChartStable(), useYScale() (+41 more)

### Community 38 - "section-placeholder.tsx"
Cohesion: 0.15
Nodes (6): metadata, metadata, metadata, metadata, metadata, SectionPlaceholder()

### Community 39 - "checkout/route.ts"
Cohesion: 0.29
Nodes (12): POST(), schema, POST(), mapStatus(), POST(), runtime, syncSubscription(), appUrl() (+4 more)

### Community 42 - "getSessionUser"
Cohesion: 0.17
Nodes (15): GET(), ownedArtist(), Params, PATCH(), patchSchema, GET(), Params, PATCH() (+7 more)

### Community 45 - "plans.ts"
Cohesion: 0.31
Nodes (7): buildUsageSnapshot(), getArtistUsage(), getReleaseUsage(), UsageSnapshot, canCreateArtist(), canCreateRelease(), PlanLimits

### Community 47 - "requireUser"
Cohesion: 0.26
Nodes (9): DashboardLayout(), metadata, NewReleasePage(), Props, metadata, SettingsPage(), NewReleaseForm(), requireUser() (+1 more)

### Community 48 - "app/layout.tsx"
Cohesion: 0.40
Nodes (3): geistMono, metadata, outfit

### Community 51 - "dependencies"
Cohesion: 0.22
Nodes (9): class-variance-authority, dependencies, class-variance-authority, react-dom, shadcn, @visx/curve, react-dom, shadcn (+1 more)

## Knowledge Gaps
- **248 isolated node(s):** `Local development`, `1. Services`, `2. Variables (web service — this is the step that usually fails)`, `3. Deploy settings`, `4. Stripe webhook (when ready)` (+243 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `features/page.tsx`, `dashboard/page.tsx`, `signup-flow.tsx`, `chart-tooltip.tsx`, `releases/page.tsx`, `loading-sweep.tsx`, `x-axis.tsx`, `(marketing)/page.tsx`, `button.tsx`, `area-chart.tsx`, `buttonVariants`?**
  _High betweenness centrality (0.164) - this node is a cross-community bridge._
- **Why does `prisma` connect `session.ts` to `dashboard/page.tsx`, `getUserUsage`, `releases/page.tsx`, `checkout/route.ts`, `getSessionUser`, `requireUser`, `buttonVariants`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `useChartStable()` connect `area.tsx` to `series-markers.tsx`, `chart-context.tsx`, `chart-tooltip.tsx`, `loading-sweep.tsx`, `x-axis.tsx`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `Local development`, `1. Services`, `2. Variables (web service — this is the step that usually fails)` to the rest of the system?**
  _248 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `series-markers.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07317073170731707 - nodes in this community are weakly interconnected._
- **Should `chart-context.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Should `chart-tooltip.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08417508417508418 - nodes in this community are weakly interconnected._
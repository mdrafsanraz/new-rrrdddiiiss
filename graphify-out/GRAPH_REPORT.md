# Graph Report - RDISTRO  (2026-08-27)

## Corpus Check
- 178 files · ~128,654 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 997 nodes · 2200 edges · 78 communities (49 shown, 29 thin omitted)
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
- (marketing)/page.tsx
- line-loading-pulse.tsx
- button.tsx
- projection-config.ts
- y-domain-utils.ts
- area-chart.tsx
- @number-flow/react
- pricing-cards.tsx
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
- useChartHover
- useChartStable
- db.ts
- users/page.tsx
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
- normalizeYAxisId
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
- gradient-button.tsx
- UpgradeButtons
- cn
- class-variance-authority

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
10. `syncSubmittedReleaseToLabelGrid()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `AdminArtistsPage()` --calls--> `requireAdmin()`  [EXTRACTED]
  src/app/(admin)/admin/artists/page.tsx → src/lib/auth/admin.ts
- `AdminLayout()` --calls--> `requireAdmin()`  [EXTRACTED]
  src/app/(admin)/admin/layout.tsx → src/lib/auth/admin.ts
- `XAxisLabel()` --calls--> `cn()`  [EXTRACTED]
  src/components/charts/x-axis.tsx → src/lib/utils.ts
- `GradientButton()` --calls--> `cn()`  [EXTRACTED]
  src/components/kokonutui/gradient-button.tsx → src/lib/utils.ts
- `AsciiLogo()` --calls--> `cn()`  [EXTRACTED]
  src/components/site/ascii-art.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (78 total, 29 thin omitted)

### Community 0 - "signup-flow.tsx"
Cohesion: 0.20
Nodes (13): planIcons, Screen, SignupFlow(), Step, stepLabels, digitsOnly(), formatCard(), formatExpiry() (+5 more)

### Community 1 - "series-markers.tsx"
Cohesion: 0.18
Nodes (13): defaultScatterColors, MarkerStyle, PointAt, SeriesMarkersActiveHighlightProps, SeriesMarkersDimWrapperProps, SeriesMarkersProps, getSeriesMarkerVisualExtent(), MarkerCirclesProps (+5 more)

### Community 2 - "animation.ts"
Cohesion: 0.17
Nodes (8): clipRevealTransition(), DEFAULT_ANIMATION_DURATION_MS, DEFAULT_ANIMATION_EASING, DEFAULT_CHART_ENTER_TRANSITION, ChartRevealClip(), ChartRevealClipMode, ChartRevealClipProps, SpringOptions

### Community 3 - "chart-tooltip.tsx"
Cohesion: 0.08
Nodes (42): ChartConfigContext, ChartConfigProviderProps, ChartConfigValue, DEFAULT_CHART_CONFIG, resolveTooltipBoxMotion(), SpringConfig, useChartConfig(), useChart() (+34 more)

### Community 5 - "loading-sweep.tsx"
Cohesion: 0.07
Nodes (32): AdminLayout(), AdminShell(), ChartLoadingLabel(), ChartLoadingLabelProps, LINE_LOADING_LOOP_PAUSE_MS, LINE_LOADING_PULSE_CYCLE_S, LINE_LOADING_PULSE_EASE, LOADING_LABEL_EXIT_S (+24 more)

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
Cohesion: 0.16
Nodes (21): allIndexLayouts(), appendProjectionTailTicks(), AxisTick, binomial(), buildDataAlignedTicks(), buildDomainTicks(), composePositiveSum(), dedupeIndicesByLabel() (+13 more)

### Community 10 - "time-series-chart-shell.tsx"
Cohesion: 0.12
Nodes (22): decimateTimeSeries(), maxRenderPointsForWidth(), filterDataByXDomain(), resolveBrushTrackXExtent(), resolveDataXExtent(), computeSeriesBarRevealClipPadding(), computeSeriesBarWidth(), StaticChartPreviewContext (+14 more)

### Community 11 - "projection-utils.ts"
Cohesion: 0.20
Nodes (16): buildAutoFutureValues(), buildProjectionPath(), BuildProjectionPathOptions, buildTargetPath(), computeProjectionAnchorTangentSlope(), intervalFromAdjacentRows(), intervalFromSeriesSpan(), linearRegressionSlope() (+8 more)

### Community 12 - "(marketing)/page.tsx"
Cohesion: 0.12
Nodes (21): metadata, steps, AsciiCassette(), AsciiEqualizer(), AsciiLogo(), AsciiTerminal(), CASSETTE_ASCII, RDISTRO_ASCII (+13 more)

### Community 13 - "line-loading-pulse.tsx"
Cohesion: 0.31
Nodes (11): AreaGradientDefs(), AreaGradientDefsProps, FadeEdges, FadeGradientStop, fadeGradientStops(), FadeSides, resolveFadeSides(), viewportFadeGradientAttrs() (+3 more)

### Community 14 - "button.tsx"
Cohesion: 0.16
Nodes (11): ImpersonationBanner(), ReleaseReviewActions(), AdminUserEditForm(), CreateArtistForm(), ArtistFields, EditArtistForm(), ReleasesFilter(), SubmitReleaseButton() (+3 more)

### Community 15 - "projection-config.ts"
Cohesion: 0.13
Nodes (19): CHART_CLIP_PASSTHROUGH, CLIP_EXCLUDED_COMPONENT_NAMES, isChartClipPassthrough(), isClipExcludedComponent(), isPostOverlayComponent(), isUnderlayComponent(), resolveChartChildElement(), UNDERLAY_COMPONENT_NAMES (+11 more)

### Community 16 - "y-domain-utils.ts"
Cohesion: 0.30
Nodes (12): ChartContextValue, ChartPhase, lerpDomain(), snapDomains(), tweenDomains(), useAnimatedYDomains(), UseAnimatedYDomainsOptions, domainsEqual() (+4 more)

### Community 17 - "area-chart.tsx"
Cohesion: 0.14
Nodes (19): AreaChart(), AreaChartProps, ChartInner(), ChartInnerProps, DEFAULT_MARGIN, extractAreaConfigs(), ChartStatus, DEFAULT_CHART_LIFECYCLE (+11 more)

### Community 19 - "pricing-cards.tsx"
Cohesion: 0.14
Nodes (11): metadata, faqs, metadata, metadata, valueProps, AnalyticsIllustration(), LoginForm(), planAccents (+3 more)

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
Nodes (50): LabelGridApiError, labelgridFetch(), labelgridUpload(), RequestOptions, getLabelGridBaseUrl(), getLabelGridEnv(), getLabelGridToken(), isLabelGridLive() (+42 more)

### Community 31 - "header.tsx"
Cohesion: 0.24
Nodes (6): SiteFooter(), isActive(), SiteHeader(), AnimatedBrandLogo(), AnimatedBrandLogoProps, navLinks

### Community 32 - "submit/route.ts"
Cohesion: 0.07
Nodes (38): contentTypeFor(), GET(), Params, ai, buildReleaseDateIso(), genreOpt, intOrNull(), payloadSchema (+30 more)

### Community 33 - "useChartHover"
Cohesion: 0.25
Nodes (8): useChartHover(), ChartLegendHoverContext, ChartLegendHoverContextValue, useChartLegendHover(), SeriesHoverDim(), SeriesHoverDimProps, SeriesMarkersActiveHighlight(), SeriesMarkersDimWrapper()

### Community 34 - "useChartStable"
Cohesion: 0.22
Nodes (11): useChartStable(), computeSegmentBounds(), INACTIVE_SEGMENT, SegmentBounds, HighlightSegment(), HighlightSegmentProps, SeriesHighlightLayer(), SeriesHighlightLayerProps (+3 more)

### Community 35 - "db.ts"
Cohesion: 0.12
Nodes (29): POST(), schema, Params, POST(), schema, Params, POST(), schema (+21 more)

### Community 36 - "users/page.tsx"
Cohesion: 0.23
Nodes (9): AdminArtistsPage(), metadata, AdminUserDetailPage(), Props, AdminUsersPage(), metadata, Props, LoginAsUserButton() (+1 more)

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
Cohesion: 0.14
Nodes (21): GET(), ownedArtist(), Params, PATCH(), patchSchema, createSchema, GET(), POST() (+13 more)

### Community 43 - "grid.tsx"
Cohesion: 0.21
Nodes (13): AreaChartLoading(), AreaChartLoadingProps, LoadingStyle, generateChartSkeletonData(), GenerateChartSkeletonDataOptions, generateChartSkeletonFromTarget(), Grid(), GridProps (+5 more)

### Community 44 - "contact/page.tsx"
Cohesion: 0.40
Nodes (3): metadata, ContactForm(), site

### Community 45 - "area.tsx"
Cohesion: 0.29
Nodes (10): Area(), AreaProps, CurveFactory, useAreaLoadingPulseState(), chartCssVars, useYScale(), LineLoadingPulseMode, resolveLineLoadingPulseMode() (+2 more)

### Community 46 - "start.sh"
Cohesion: 0.50
Nodes (3): HOSTNAME, PORT, start.sh script

### Community 47 - "dashboard/page.tsx"
Cohesion: 0.11
Nodes (24): ArtistsPage(), metadata, DashboardHomePage(), Empty(), metadata, metadata, NewReleasePage(), Props (+16 more)

### Community 48 - "app/layout.tsx"
Cohesion: 0.40
Nodes (3): geistMono, metadata, outfit

### Community 49 - "chart-context.tsx"
Cohesion: 0.13
Nodes (21): ChartHoverContext, ChartHoverContextValue, ChartProvider(), ChartStableContext, ChartStableContextValue, LineConfig, Margin, ScaleBand (+13 more)

### Community 51 - "dependencies"
Cohesion: 0.22
Nodes (9): @base-ui/react, dependencies, @base-ui/react, react-dom, shadcn, @visx/curve, react-dom, shadcn (+1 more)

### Community 61 - "normalizeYAxisId"
Cohesion: 0.24
Nodes (9): extractReferenceAreaConfigs(), getChildComponentName(), isReferenceAreaElement(), ReferenceAreaConfig, ReferenceAreaConfigProps, ReferenceAreaRegistrationContext, ReferenceAreaRegistrationContextValue, normalizeYAxisId() (+1 more)

### Community 66 - "session.ts"
Cohesion: 0.20
Nodes (12): POST(), POST(), ADMIN_RESTORE_COOKIE, clearSessionCookie(), PublicUser, secretKey(), SESSION_COOKIE, SessionContext (+4 more)

### Community 74 - "gradient-button.tsx"
Cohesion: 0.40
Nodes (4): ColorVariant, GradientButton(), GradientButtonProps, GradientColors

### Community 76 - "cn"
Cohesion: 0.09
Nodes (28): AdminHomePage(), metadata, AdminReleaseDetailPage(), Props, AdminReleasesPage(), FILTERS, metadata, Props (+20 more)

## Knowledge Gaps
- **283 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+278 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `signup-flow.tsx`, `chart-tooltip.tsx`, `users/page.tsx`, `loading-sweep.tsx`, `x-axis.tsx`, `gradient-button.tsx`, `(marketing)/page.tsx`, `button.tsx`, `dashboard/page.tsx`, `area-chart.tsx`, `pricing-cards.tsx`, `header.tsx`?**
  _High betweenness centrality (0.207) - this node is a cross-community bridge._
- **Why does `prisma` connect `db.ts` to `submit/route.ts`, `session.ts`, `users/page.tsx`, `checkout/route.ts`, `getSessionUser`, `cn`, `dashboard/page.tsx`, `sync-submit.ts`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `useChartStable()` connect `useChartStable` to `series-markers.tsx`, `chart-tooltip.tsx`, `loading-sweep.tsx`, `x-axis.tsx`, `grid.tsx`, `line-loading-pulse.tsx`, `area.tsx`, `chart-context.tsx`, `area-chart.tsx`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _283 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `chart-tooltip.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08455625436757512 - nodes in this community are weakly interconnected._
- **Should `loading-sweep.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07293868921775898 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._
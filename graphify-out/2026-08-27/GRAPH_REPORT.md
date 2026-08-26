# Graph Report - RDISTRO  (2026-08-27)

## Corpus Check
- 178 files · ~125,522 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 972 nodes · 2137 edges · 78 communities (50 shown, 28 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8d905297`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- site.ts
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
- area.tsx
- button.tsx
- y-axis-scales.ts
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
- header.tsx
- store.ts
- session.ts
- use-highlight-segment.ts
- db.ts
- buttonVariants
- series-dash-tail-overlay.tsx
- section-placeholder.tsx
- checkout/route.ts
- prisma
- zod
- getSessionUser
- useChartStable
- animation.ts
- plans.ts
- start.sh
- dashboard/page.tsx
- app/layout.tsx
- use-chart-interaction.ts
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
- new/page.tsx
- stripe
- tailwind-merge
- tw-animate-css
- normalizeYAxisId
- @visx/event
- @visx/gradient
- @visx/grid
- @visx/responsive
- @visx/scale
- @visx/shape
- useChartHover
- artists/[id]/route.ts
- dashboard/releases/[id]/page.tsx
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
10. `Button()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `PATCH()` --calls--> `getSessionUser()`  [EXTRACTED]
  src/app/api/artists/[id]/route.ts → src/lib/auth/session.ts
- `XAxis()` --calls--> `useChartStable()`  [EXTRACTED]
  src/components/charts/x-axis.tsx → src/components/charts/chart-context.tsx
- `XAxisLabel()` --calls--> `cn()`  [EXTRACTED]
  src/components/charts/x-axis.tsx → src/lib/utils.ts
- `AdminArtistsPage()` --calls--> `requireAdmin()`  [EXTRACTED]
  src/app/(admin)/admin/artists/page.tsx → src/lib/auth/admin.ts
- `AdminLayout()` --calls--> `requireAdmin()`  [EXTRACTED]
  src/app/(admin)/admin/layout.tsx → src/lib/auth/admin.ts

## Import Cycles
- None detected.

## Communities (78 total, 28 thin omitted)

### Community 0 - "site.ts"
Cohesion: 0.13
Nodes (18): metadata, valueProps, planIcons, Screen, SignupFlow(), Step, stepLabels, StoreTicker() (+10 more)

### Community 1 - "series-markers.tsx"
Cohesion: 0.18
Nodes (13): defaultScatterColors, MarkerStyle, PointAt, SeriesMarkersActiveHighlightProps, SeriesMarkersDimWrapperProps, SeriesMarkersProps, getSeriesMarkerVisualExtent(), MarkerCirclesProps (+5 more)

### Community 2 - "chart-context.tsx"
Cohesion: 0.20
Nodes (13): ChartContextValue, ChartHoverContext, ChartHoverContextValue, ChartProvider(), ChartStableContext, ChartStableContextValue, ScaleBand, ScaleLinear (+5 more)

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
Cohesion: 0.10
Nodes (25): AreaChartLoading(), CHART_CLIP_PASSTHROUGH, CLIP_EXCLUDED_COMPONENT_NAMES, isChartClipPassthrough(), isClipExcludedComponent(), isPostOverlayComponent(), isUnderlayComponent(), resolveChartChildElement() (+17 more)

### Community 11 - "projection-utils.ts"
Cohesion: 0.12
Nodes (27): extractProjectionLineConfigs(), getChildComponentName(), isProjectionLineElement(), mergeProjectionXDomainMax(), mergeProjectionYDomain(), normalizeProjectionData(), ProjectionLineConfig, ProjectionLineConfigProps (+19 more)

### Community 12 - "cn"
Cohesion: 0.11
Nodes (25): CardFlip(), CardFlipProps, ColorVariant, GradientButton(), GradientButtonProps, GradientColors, ShimmerText(), Text_01Props (+17 more)

### Community 13 - "area.tsx"
Cohesion: 0.22
Nodes (18): Area(), AreaProps, CurveFactory, AreaGradientDefs(), AreaGradientDefsProps, useAreaLoadingPulseState(), FadeEdges, FadeGradientStop (+10 more)

### Community 14 - "button.tsx"
Cohesion: 0.20
Nodes (8): ArtistDetailPage(), Props, ReleaseReviewActions(), ArtistFields, EditArtistForm(), Field(), FieldProps, Button()

### Community 15 - "y-axis-scales.ts"
Cohesion: 0.28
Nodes (7): buildYScalesForLines(), buildYScalesFromDomains(), DEFAULT_Y_AXIS_ID, getPrimaryYScale(), groupLinesByYAxisId(), YAxisOrientation, YScale

### Community 16 - "y-domain-utils.ts"
Cohesion: 0.33
Nodes (10): lerpDomain(), snapDomains(), tweenDomains(), useAnimatedYDomains(), computeYDomainsByAxis(), domainsEqual(), isYDomainTweenPhase(), niceYDomain() (+2 more)

### Community 17 - "area-chart.tsx"
Cohesion: 0.17
Nodes (19): AreaChart(), AreaChartProps, ChartInner(), ChartInnerProps, DEFAULT_MARGIN, extractAreaConfigs(), AreaChartLoadingProps, Margin (+11 more)

### Community 19 - "(marketing)/page.tsx"
Cohesion: 0.12
Nodes (16): metadata, metadata, metadata, steps, faqs, metadata, ContactForm(), accents (+8 more)

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
Cohesion: 0.09
Nodes (43): LabelGridApiError, labelgridFetch(), labelgridUpload(), RequestOptions, getLabelGridBaseUrl(), getLabelGridEnv(), getLabelGridToken(), isLabelGridLive() (+35 more)

### Community 31 - "header.tsx"
Cohesion: 0.13
Nodes (10): AdminShell(), DashboardShell(), SiteFooter(), isActive(), SiteHeader(), AnimatedBrandLogo(), AnimatedBrandLogoProps, adminNav (+2 more)

### Community 32 - "store.ts"
Cohesion: 0.15
Nodes (16): Params, POST(), schema, contentTypeFor(), GET(), Params, ARTWORK_TYPES, AUDIO_TYPES (+8 more)

### Community 33 - "session.ts"
Cohesion: 0.20
Nodes (12): POST(), POST(), ADMIN_RESTORE_COOKIE, clearSessionCookie(), PublicUser, secretKey(), SESSION_COOKIE, SessionContext (+4 more)

### Community 34 - "use-highlight-segment.ts"
Cohesion: 0.23
Nodes (9): computeSegmentBounds(), INACTIVE_SEGMENT, SegmentBounds, HighlightSegment(), HighlightSegmentProps, SeriesHighlightLayer(), SeriesHighlightLayerProps, HighlightSegmentResult (+1 more)

### Community 35 - "db.ts"
Cohesion: 0.13
Nodes (26): POST(), schema, Params, POST(), schema, GET(), Params, PATCH() (+18 more)

### Community 36 - "buttonVariants"
Cohesion: 0.09
Nodes (26): AdminArtistsPage(), metadata, AdminLayout(), AdminHomePage(), metadata, AdminReleaseDetailPage(), Props, AdminReleasesPage() (+18 more)

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
Cohesion: 0.18
Nodes (18): createSchema, GET(), POST(), GET(), Params, PATCH(), patchSchema, POST() (+10 more)

### Community 43 - "useChartStable"
Cohesion: 0.24
Nodes (13): useChartStable(), useYScale(), Grid(), GridProps, hideEdgeTicks(), resolveRowTickValues(), CurveFactory, PatternArea() (+5 more)

### Community 44 - "animation.ts"
Cohesion: 0.17
Nodes (8): clipRevealTransition(), DEFAULT_ANIMATION_DURATION_MS, DEFAULT_ANIMATION_EASING, DEFAULT_CHART_ENTER_TRANSITION, ChartRevealClip(), ChartRevealClipMode, ChartRevealClipProps, SpringOptions

### Community 45 - "plans.ts"
Cohesion: 0.31
Nodes (7): buildUsageSnapshot(), getArtistUsage(), getReleaseUsage(), UsageSnapshot, canCreateArtist(), canCreateRelease(), PlanLimits

### Community 46 - "start.sh"
Cohesion: 0.50
Nodes (3): HOSTNAME, PORT, start.sh script

### Community 47 - "dashboard/page.tsx"
Cohesion: 0.12
Nodes (20): ArtistsPage(), metadata, DashboardHomePage(), metadata, metadata, Props, ReleasesPage(), metadata (+12 more)

### Community 48 - "app/layout.tsx"
Cohesion: 0.40
Nodes (3): geistMono, metadata, outfit

### Community 49 - "use-chart-interaction.ts"
Cohesion: 0.22
Nodes (11): LineConfig, TooltipData, TimeSeriesChartInnerProps, ChartInteractionResult, ScaleLinear, ScaleTime, useChartInteraction(), UseChartInteractionParams (+3 more)

### Community 51 - "dependencies"
Cohesion: 0.22
Nodes (9): @base-ui/react, dependencies, @base-ui/react, react-dom, shadcn, @visx/curve, react-dom, shadcn (+1 more)

### Community 61 - "new/page.tsx"
Cohesion: 0.20
Nodes (11): metadata, NewReleasePage(), Props, ArtistOption, ReleaseSubmitForm(), ARTWORK_AI_USAGE, ArtworkAiUsage, CONTENT_TYPES (+3 more)

### Community 66 - "normalizeYAxisId"
Cohesion: 0.24
Nodes (9): extractReferenceAreaConfigs(), getChildComponentName(), isReferenceAreaElement(), ReferenceAreaConfig, ReferenceAreaConfigProps, ReferenceAreaRegistrationContext, ReferenceAreaRegistrationContextValue, normalizeYAxisId() (+1 more)

### Community 74 - "useChartHover"
Cohesion: 0.25
Nodes (8): useChartHover(), ChartLegendHoverContext, ChartLegendHoverContextValue, useChartLegendHover(), SeriesHoverDim(), SeriesHoverDimProps, SeriesMarkersActiveHighlight(), SeriesMarkersDimWrapper()

### Community 75 - "artists/[id]/route.ts"
Cohesion: 0.40
Nodes (5): GET(), ownedArtist(), Params, PATCH(), patchSchema

### Community 76 - "dashboard/releases/[id]/page.tsx"
Cohesion: 0.40
Nodes (3): Props, ReleaseDetailPage(), SubmitReleaseButton()

## Knowledge Gaps
- **278 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+273 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `site.ts`, `chart-tooltip.tsx`, `buttonVariants`, `loading-sweep.tsx`, `x-axis.tsx`, `dashboard/releases/[id]/page.tsx`, `button.tsx`, `dashboard/page.tsx`, `area-chart.tsx`, `(marketing)/page.tsx`, `header.tsx`?**
  _High betweenness centrality (0.205) - this node is a cross-community bridge._
- **Why does `prisma` connect `db.ts` to `store.ts`, `session.ts`, `buttonVariants`, `checkout/route.ts`, `getSessionUser`, `artists/[id]/route.ts`, `dashboard/releases/[id]/page.tsx`, `button.tsx`, `dashboard/page.tsx`, `labelgrid/index.ts`, `new/page.tsx`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `useChartStable()` connect `useChartStable` to `series-markers.tsx`, `chart-context.tsx`, `chart-tooltip.tsx`, `use-highlight-segment.ts`, `loading-sweep.tsx`, `x-axis.tsx`, `area.tsx`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _278 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `site.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Should `chart-tooltip.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08417508417508418 - nodes in this community are weakly interconnected._
- **Should `loading-sweep.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10160427807486631 - nodes in this community are weakly interconnected._
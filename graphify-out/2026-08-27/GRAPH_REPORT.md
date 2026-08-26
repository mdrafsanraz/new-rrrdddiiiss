# Graph Report - RDISTRO  (2026-08-27)

## Corpus Check
- 197 files · ~133,523 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1068 nodes · 2412 edges · 89 communities (61 shown, 28 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e41a5e04`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- stripe-checkout.tsx
- series-markers.tsx
- getUserUsage
- chart-tooltip.tsx
- lucide-react
- loading-sweep.tsx
- devDependencies
- compilerOptions
- components.json
- x-axis.tsx
- time-series-chart-shell.tsx
- projection-utils.ts
- illustrations.tsx
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
- cn
- submit/route.ts
- utils.ts
- use-highlight-segment.ts
- session.ts
- db.ts
- series-dash-tail-overlay.tsx
- section-placeholder.tsx
- pricing-cards.tsx
- prisma
- zod
- getSessionUser
- area.tsx
- animation.ts
- requireAdminApi
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
- y-axis-scales.ts
- stripe
- tailwind-merge
- tw-animate-css
- reject/route.ts
- @visx/event
- @visx/gradient
- @visx/grid
- @visx/responsive
- @visx/scale
- @visx/shape
- store.ts
- useChartHover
- dashboard/releases/page.tsx
- checkout/route.ts
- @base-ui/react
- sync-submit.ts
- reference-area-config.ts
- ascii-art.tsx
- isAdminUser
- use-chart-interaction.ts
- site.ts
- entitlements/index.ts
- signup/page.tsx
- [...path]/route.ts
- feature-grid.tsx

## God Nodes (most connected - your core abstractions)
1. `cn()` - 80 edges
2. `prisma` - 42 edges
3. `buttonVariants` - 37 edges
4. `getSessionUser()` - 32 edges
5. `TimeSeriesChartCore` - 29 edges
6. `Button()` - 24 edges
7. `requireUser()` - 24 edges
8. `requireAdminApi()` - 24 edges
9. `requireAdmin()` - 24 edges
10. `labelgridFetch()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `StepNav()` --calls--> `cn()`  [EXTRACTED]
  src/components/dashboard/release-builder.tsx → src/lib/utils.ts
- `AsciiLogo()` --calls--> `cn()`  [EXTRACTED]
  src/components/site/ascii-art.tsx → src/lib/utils.ts
- `ReleaseCover()` --calls--> `cn()`  [EXTRACTED]
  src/components/site/illustrations.tsx → src/lib/utils.ts
- `ReleaseQueueIllustration()` --calls--> `cn()`  [EXTRACTED]
  src/components/site/illustrations.tsx → src/lib/utils.ts
- `RoyaltySplitIllustration()` --calls--> `cn()`  [EXTRACTED]
  src/components/site/illustrations.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (89 total, 28 thin omitted)

### Community 0 - "stripe-checkout.tsx"
Cohesion: 0.50
Nodes (7): digitsOnly(), formatCard(), formatExpiry(), StripeCheckout(), StripeCheckoutProps, validExpiry(), getPlan()

### Community 1 - "series-markers.tsx"
Cohesion: 0.20
Nodes (12): MarkerStyle, PointAt, SeriesMarkersActiveHighlightProps, SeriesMarkersDimWrapperProps, SeriesMarkersProps, getSeriesMarkerVisualExtent(), MarkerCirclesProps, SeriesPointMarker() (+4 more)

### Community 2 - "getUserUsage"
Cohesion: 0.21
Nodes (12): createSchema, GET(), POST(), createSchema, GET(), POST(), ArtistsPage(), metadata (+4 more)

### Community 3 - "chart-tooltip.tsx"
Cohesion: 0.08
Nodes (43): ChartConfigContext, ChartConfigProviderProps, ChartConfigValue, DEFAULT_CHART_CONFIG, resolveTooltipBoxMotion(), SpringConfig, useChartConfig(), chartCssVars (+35 more)

### Community 5 - "loading-sweep.tsx"
Cohesion: 0.08
Nodes (35): ChartLoadingLabel(), ChartLoadingLabelProps, Grid(), GridProps, hideEdgeTicks(), resolveRowTickValues(), LINE_LOADING_LOOP_PAUSE_MS, LINE_LOADING_PULSE_CYCLE_S (+27 more)

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
Cohesion: 0.20
Nodes (16): buildAutoFutureValues(), buildProjectionPath(), BuildProjectionPathOptions, buildTargetPath(), computeProjectionAnchorTangentSlope(), intervalFromAdjacentRows(), intervalFromSeriesSpan(), linearRegressionSlope() (+8 more)

### Community 12 - "illustrations.tsx"
Cohesion: 0.17
Nodes (10): metadata, AnalyticsIllustration(), HeroIllustration(), ReleaseCover(), releaseCovers, ReleaseQueueIllustration(), RoyaltySplitIllustration(), StoreGridIllustration() (+2 more)

### Community 13 - "line-loading-pulse.tsx"
Cohesion: 0.26
Nodes (13): AreaProps, AreaGradientDefs(), AreaGradientDefsProps, FadeEdges, FadeGradientStop, fadeGradientStops(), FadeSides, resolveFadeSides() (+5 more)

### Community 14 - "button.tsx"
Cohesion: 0.15
Nodes (9): AddAdminForms(), ReleaseReviewActions(), AdminSupportStatusForm(), ArtistFields, UpgradeButtons(), Field(), FieldProps, Button() (+1 more)

### Community 15 - "projection-config.ts"
Cohesion: 0.26
Nodes (12): isChartClipPassthrough(), extractProjectionLineConfigs(), getChildComponentName(), isProjectionLineElement(), mergeProjectionXDomainMax(), mergeProjectionYDomain(), normalizeProjectionData(), ProjectionLineConfig (+4 more)

### Community 16 - "y-domain-utils.ts"
Cohesion: 0.25
Nodes (14): lerpDomain(), snapDomains(), tweenDomains(), useAnimatedYDomains(), UseAnimatedYDomainsOptions, normalizeYAxisId(), computeYDomainsByAxis(), domainsEqual() (+6 more)

### Community 17 - "area-chart.tsx"
Cohesion: 0.15
Nodes (23): AreaChart(), AreaChartProps, ChartInner(), ChartInnerProps, DEFAULT_MARGIN, extractAreaConfigs(), AreaChartLoadingProps, LineConfig (+15 more)

### Community 19 - "(marketing)/page.tsx"
Cohesion: 0.24
Nodes (6): metadata, steps, ContactForm(), StoreTicker(), site, stores

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
Nodes (25): labelgridFetch(), createArtist(), createRelease(), createTrack(), createWriter(), distributeRelease(), getArtist(), getMe() (+17 more)

### Community 31 - "cn"
Cohesion: 0.08
Nodes (25): ArtistDetailPage(), Props, Empty(), FeaturesPage(), metadata, Home(), AdminShell(), EditArtistForm() (+17 more)

### Community 32 - "submit/route.ts"
Cohesion: 0.09
Nodes (30): ai, allocateCatalogNumber(), contributorSchema, intOrNull(), payloadSchema, POST(), yearOrNull(), ArtistOption (+22 more)

### Community 33 - "utils.ts"
Cohesion: 0.20
Nodes (14): AdminSupportTicketPage(), Props, AdminSupportPage(), metadata, Props, Props, SupportTicketPage(), metadata (+6 more)

### Community 34 - "use-highlight-segment.ts"
Cohesion: 0.24
Nodes (8): computeSegmentBounds(), INACTIVE_SEGMENT, SegmentBounds, HighlightSegment(), HighlightSegmentProps, SeriesHighlightLayerProps, HighlightSegmentResult, useHighlightSegment()

### Community 35 - "session.ts"
Cohesion: 0.14
Nodes (18): POST(), schema, POST(), POST(), POST(), schema, ADMIN_RESTORE_COOKIE, clearSessionCookie() (+10 more)

### Community 36 - "db.ts"
Cohesion: 0.10
Nodes (25): AdminAdminsPage(), metadata, AdminArtistsPage(), metadata, AdminLayout(), AdminHomePage(), metadata, AdminReleaseDetailPage() (+17 more)

### Community 37 - "series-dash-tail-overlay.tsx"
Cohesion: 0.22
Nodes (9): DashTailStroke(), DashTailStrokeProps, EMPTY_METRICS, PathStrokeMetrics, resolveDashStartX(), resolveDashTailBounds(), SeriesDashTailOverlay, SeriesDashTailOverlayImpl() (+1 more)

### Community 38 - "section-placeholder.tsx"
Cohesion: 0.19
Nodes (5): metadata, metadata, metadata, metadata, SectionPlaceholder()

### Community 39 - "pricing-cards.tsx"
Cohesion: 0.33
Nodes (5): faqs, metadata, planAccents, PricingCards(), Reveal()

### Community 42 - "getSessionUser"
Cohesion: 0.12
Nodes (20): GET(), ownedArtist(), Params, PATCH(), patchSchema, Params, POST(), GET() (+12 more)

### Community 43 - "area.tsx"
Cohesion: 0.36
Nodes (10): Area(), CurveFactory, useAreaLoadingPulseState(), useChartStable(), useYScale(), resolveLineLoadingPulseMode(), LineLoadingSweep(), usePathStrokeMetrics() (+2 more)

### Community 44 - "animation.ts"
Cohesion: 0.17
Nodes (8): clipRevealTransition(), DEFAULT_ANIMATION_DURATION_MS, DEFAULT_ANIMATION_EASING, DEFAULT_CHART_ENTER_TRANSITION, ChartRevealClip(), ChartRevealClipMode, ChartRevealClipProps, SpringOptions

### Community 45 - "requireAdminApi"
Cohesion: 0.12
Nodes (19): DELETE(), demoteSchema, Params, createSchema, GET(), POST(), promoteSchema, GET() (+11 more)

### Community 46 - "start.sh"
Cohesion: 0.50
Nodes (3): HOSTNAME, PORT, start.sh script

### Community 47 - "requireUser"
Cohesion: 0.15
Nodes (18): DashboardLayout(), DashboardHomePage(), metadata, ReleaseDetailPage(), metadata, NewReleasePage(), Props, metadata (+10 more)

### Community 48 - "app/layout.tsx"
Cohesion: 0.40
Nodes (3): geistMono, metadata, outfit

### Community 49 - "chart-context.tsx"
Cohesion: 0.14
Nodes (14): ChartContextValue, ChartHoverContext, ChartHoverContextValue, ChartProvider(), ChartStableContext, ChartStableContextValue, defaultScatterColors, ScaleBand (+6 more)

### Community 51 - "dependencies"
Cohesion: 0.22
Nodes (9): class-variance-authority, dependencies, class-variance-authority, react-dom, shadcn, @visx/curve, react-dom, shadcn (+1 more)

### Community 61 - "y-axis-scales.ts"
Cohesion: 0.28
Nodes (7): buildYScalesForLines(), buildYScalesFromDomains(), DEFAULT_Y_AXIS_ID, getPrimaryYScale(), groupLinesByYAxisId(), YAxisOrientation, YScale

### Community 66 - "reject/route.ts"
Cohesion: 0.16
Nodes (14): Params, POST(), schema, LabelGridApiError, labelgridUpload(), RequestOptions, getLabelGridBaseUrl(), getLabelGridEnv() (+6 more)

### Community 74 - "store.ts"
Cohesion: 0.17
Nodes (15): Params, POST(), schema, formatLgError(), submitLabelGridDraftForReview(), ARTWORK_TYPES, AUDIO_TYPES, extFor() (+7 more)

### Community 75 - "useChartHover"
Cohesion: 0.25
Nodes (8): useChartHover(), ChartLegendHoverContext, ChartLegendHoverContextValue, useChartLegendHover(), SeriesHoverDim(), SeriesHoverDimProps, SeriesMarkersActiveHighlight(), SeriesMarkersDimWrapper()

### Community 76 - "dashboard/releases/page.tsx"
Cohesion: 0.14
Nodes (10): Props, metadata, Props, ReleasesPage(), ReleasesFilter(), ResubmitReleaseButton(), labels, StatusBadge() (+2 more)

### Community 77 - "checkout/route.ts"
Cohesion: 0.29
Nodes (12): POST(), schema, POST(), mapStatus(), POST(), runtime, syncSubscription(), appUrl() (+4 more)

### Community 79 - "sync-submit.ts"
Cohesion: 0.31
Nodes (12): listGenres(), ensureLabelGridArtist(), GenreRow, loadGenres(), requireGenreId(), resolveGenreId(), resolveLabelId(), splitName() (+4 more)

### Community 80 - "reference-area-config.ts"
Cohesion: 0.29
Nodes (7): extractReferenceAreaConfigs(), getChildComponentName(), isReferenceAreaElement(), ReferenceAreaConfig, ReferenceAreaConfigProps, ReferenceAreaRegistrationContext, ReferenceAreaRegistrationContextValue

### Community 81 - "ascii-art.tsx"
Cohesion: 0.20
Nodes (8): AsciiCassette(), AsciiEqualizer(), AsciiLogo(), AsciiTerminal(), CASSETTE_ASCII, RDISTRO_ASCII, SiteFooter(), navLinks

### Community 82 - "isAdminUser"
Cohesion: 0.38
Nodes (8): POST(), schema, GET(), adminEmailsFromEnv(), ensureAdminRole(), isAdminUser(), getSessionContext(), toPublicUser()

### Community 83 - "use-chart-interaction.ts"
Cohesion: 0.29
Nodes (8): TooltipData, ChartInteractionResult, ScaleLinear, ScaleTime, useChartInteraction(), defaultDedupeKey(), ScheduledTooltipControls, useScheduledTooltip()

### Community 84 - "site.ts"
Cohesion: 0.32
Nodes (6): planIcons, Screen, Step, stepLabels, PlanId, plans

### Community 85 - "entitlements/index.ts"
Cohesion: 0.32
Nodes (7): buildUsageSnapshot(), getArtistUsage(), getReleaseUsage(), UsageSnapshot, canCreateArtist(), canCreateRelease(), PlanLimits

### Community 86 - "signup/page.tsx"
Cohesion: 0.33
Nodes (3): metadata, valueProps, SignupFlow()

### Community 87 - "[...path]/route.ts"
Cohesion: 0.60
Nodes (4): contentTypeFor(), GET(), Params, resolveUploadPath()

### Community 88 - "feature-grid.tsx"
Cohesion: 0.40
Nodes (4): accents, FeatureGrid(), FeatureArt(), features

## Knowledge Gaps
- **300 isolated node(s):** `metadata`, `metadata`, `Props`, `metadata`, `Props` (+295 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `submit/route.ts`, `utils.ts`, `chart-tooltip.tsx`, `db.ts`, `loading-sweep.tsx`, `pricing-cards.tsx`, `x-axis.tsx`, `dashboard/releases/page.tsx`, `illustrations.tsx`, `button.tsx`, `requireUser`, `area-chart.tsx`, `ascii-art.tsx`, `(marketing)/page.tsx`, `site.ts`, `signup/page.tsx`, `feature-grid.tsx`?**
  _High betweenness centrality (0.224) - this node is a cross-community bridge._
- **Why does `prisma` connect `db.ts` to `submit/route.ts`, `utils.ts`, `reject/route.ts`, `session.ts`, `getUserUsage`, `store.ts`, `getSessionUser`, `dashboard/releases/page.tsx`, `requireAdminApi`, `checkout/route.ts`, `requireUser`, `sync-submit.ts`, `isAdminUser`, `cn`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Why does `getUserUsage()` connect `getUserUsage` to `isAdminUser`, `dashboard/releases/page.tsx`, `entitlements/index.ts`, `requireUser`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `metadata`, `metadata`, `Props` to the rest of the system?**
  _300 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `chart-tooltip.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08417508417508418 - nodes in this community are weakly interconnected._
- **Should `loading-sweep.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07822410147991543 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._
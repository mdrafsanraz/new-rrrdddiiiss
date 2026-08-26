# Graph Report - RDISTRO  (2026-08-27)

## Corpus Check
- 197 files · ~134,712 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1074 nodes · 2429 edges · 73 communities (45 shown, 28 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e41a5e04`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- artists/[id]/page.tsx
- admin/releases/[id]/page.tsx
- utils.ts
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
- area.tsx
- button.tsx
- projection-config.ts
- y-domain-utils.ts
- area-chart.tsx
- @number-flow/react
- artists/[id]/route.ts
- y-axis-ticks.ts
- Railway production
- AGENTS.md
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- chart-defs.ts
- sync-submit.ts
- buttonVariants
- release-builder.tsx
- cn
- class-variance-authority
- session.ts
- requireAdmin
- section-placeholder.tsx
- prisma
- zod
- getSessionUser
- animation.ts
- db.ts
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
- stripe
- tailwind-merge
- tw-animate-css
- @visx/event
- @visx/gradient
- @visx/grid
- @visx/responsive
- @visx/scale
- @visx/shape
- dashboard/releases/[id]/page.tsx
- checkout/route.ts
- y-axis-scales.ts
- admin.ts

## God Nodes (most connected - your core abstractions)
1. `cn()` - 85 edges
2. `prisma` - 42 edges
3. `buttonVariants` - 39 edges
4. `getSessionUser()` - 32 edges
5. `TimeSeriesChartCore` - 29 edges
6. `Button()` - 24 edges
7. `requireAdmin()` - 24 edges
8. `requireAdminApi()` - 24 edges
9. `requireUser()` - 24 edges
10. `useChartStable()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `AdminArtistsPage()` --calls--> `requireAdmin()`  [EXTRACTED]
  src/app/(admin)/admin/artists/page.tsx → src/lib/auth/admin.ts
- `PATCH()` --calls--> `getSessionUser()`  [EXTRACTED]
  src/app/api/artists/[id]/route.ts → src/lib/auth/session.ts
- `XAxis()` --calls--> `useChartStable()`  [EXTRACTED]
  src/components/charts/x-axis.tsx → src/components/charts/chart-context.tsx
- `XAxisLabel()` --calls--> `cn()`  [EXTRACTED]
  src/components/charts/x-axis.tsx → src/lib/utils.ts
- `StepRail()` --calls--> `cn()`  [EXTRACTED]
  src/components/dashboard/release-builder.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (73 total, 28 thin omitted)

### Community 0 - "artists/[id]/page.tsx"
Cohesion: 0.13
Nodes (11): AdminHomePage(), metadata, AdminUserDetailPage(), Props, ArtistDetailPage(), Props, AdminUserEditForm(), EditArtistForm() (+3 more)

### Community 1 - "admin/releases/[id]/page.tsx"
Cohesion: 0.18
Nodes (7): AdminReleaseDetailPage(), Props, AdminUsersPage(), metadata, Props, LoginAsUserButton(), ReleaseReviewActions()

### Community 2 - "utils.ts"
Cohesion: 0.17
Nodes (8): CardFlip(), CardFlipProps, ColorVariant, GradientButton(), GradientButtonProps, GradientColors, ShimmerText(), Text_01Props

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
Cohesion: 0.12
Nodes (21): CHART_CLIP_PASSTHROUGH, CLIP_EXCLUDED_COMPONENT_NAMES, isChartClipPassthrough(), isClipExcludedComponent(), isPostOverlayComponent(), isUnderlayComponent(), resolveChartChildElement(), UNDERLAY_COMPONENT_NAMES (+13 more)

### Community 11 - "projection-utils.ts"
Cohesion: 0.20
Nodes (16): buildAutoFutureValues(), buildProjectionPath(), BuildProjectionPathOptions, buildTargetPath(), computeProjectionAnchorTangentSlope(), intervalFromAdjacentRows(), intervalFromSeriesSpan(), linearRegressionSlope() (+8 more)

### Community 12 - "(marketing)/page.tsx"
Cohesion: 0.05
Nodes (49): metadata, metadata, metadata, steps, faqs, metadata, metadata, valueProps (+41 more)

### Community 13 - "area.tsx"
Cohesion: 0.05
Nodes (63): Area(), AreaProps, CurveFactory, AreaGradientDefs(), AreaGradientDefsProps, useAreaLoadingPulseState(), defaultScatterColors, useChartHover() (+55 more)

### Community 14 - "button.tsx"
Cohesion: 0.26
Nodes (6): ImpersonationBanner(), CreateArtistForm(), ArtistFields, Field(), FieldProps, Button()

### Community 15 - "projection-config.ts"
Cohesion: 0.27
Nodes (11): extractProjectionLineConfigs(), getChildComponentName(), isProjectionLineElement(), mergeProjectionXDomainMax(), mergeProjectionYDomain(), normalizeProjectionData(), ProjectionLineConfig, ProjectionLineConfigProps (+3 more)

### Community 16 - "y-domain-utils.ts"
Cohesion: 0.30
Nodes (12): ChartContextValue, ChartPhase, lerpDomain(), snapDomains(), tweenDomains(), useAnimatedYDomains(), UseAnimatedYDomainsOptions, domainsEqual() (+4 more)

### Community 17 - "area-chart.tsx"
Cohesion: 0.11
Nodes (25): AreaChart(), AreaChartProps, ChartInner(), ChartInnerProps, DEFAULT_MARGIN, extractAreaConfigs(), AreaChartLoading(), AreaChartLoadingProps (+17 more)

### Community 19 - "artists/[id]/route.ts"
Cohesion: 0.40
Nodes (5): GET(), ownedArtist(), Params, PATCH(), patchSchema

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
Nodes (51): POST(), LabelGridApiError, labelgridFetch(), labelgridUpload(), RequestOptions, getLabelGridBaseUrl(), getLabelGridEnv(), getLabelGridToken() (+43 more)

### Community 31 - "buttonVariants"
Cohesion: 0.14
Nodes (12): Empty(), FeaturesPage(), Home(), AdminShell(), DashboardShell(), isActive(), SiteHeader(), AnimatedBrandLogo() (+4 more)

### Community 32 - "release-builder.tsx"
Cohesion: 0.06
Nodes (49): contentTypeFor(), GET(), Params, ai, allocateCatalogNumber(), contributorSchema, intOrNull(), payloadSchema (+41 more)

### Community 33 - "cn"
Cohesion: 0.19
Nodes (17): AdminSupportTicketPage(), Props, AdminSupportPage(), metadata, Props, Props, SupportTicketPage(), metadata (+9 more)

### Community 35 - "session.ts"
Cohesion: 0.16
Nodes (15): POST(), POST(), POST(), schema, ADMIN_RESTORE_COOKIE, clearSessionCookie(), PublicUser, secretKey() (+7 more)

### Community 36 - "requireAdmin"
Cohesion: 0.16
Nodes (10): AdminAdminsPage(), metadata, AdminLayout(), AdminReleasesPage(), FILTERS, metadata, Props, AddAdminForms() (+2 more)

### Community 38 - "section-placeholder.tsx"
Cohesion: 0.19
Nodes (5): metadata, metadata, metadata, metadata, SectionPlaceholder()

### Community 42 - "getSessionUser"
Cohesion: 0.12
Nodes (19): Params, POST(), GET(), Params, PATCH(), patchSchema, POST(), createSchema (+11 more)

### Community 44 - "animation.ts"
Cohesion: 0.17
Nodes (8): clipRevealTransition(), DEFAULT_ANIMATION_DURATION_MS, DEFAULT_ANIMATION_EASING, DEFAULT_CHART_ENTER_TRANSITION, ChartRevealClip(), ChartRevealClipMode, ChartRevealClipProps, SpringOptions

### Community 45 - "db.ts"
Cohesion: 0.09
Nodes (28): AdminArtistsPage(), metadata, DELETE(), demoteSchema, Params, createSchema, GET(), POST() (+20 more)

### Community 46 - "start.sh"
Cohesion: 0.50
Nodes (3): HOSTNAME, PORT, start.sh script

### Community 47 - "requireUser"
Cohesion: 0.08
Nodes (36): createSchema, GET(), POST(), ArtistsPage(), metadata, DashboardLayout(), DashboardHomePage(), metadata (+28 more)

### Community 48 - "app/layout.tsx"
Cohesion: 0.40
Nodes (3): geistMono, metadata, outfit

### Community 49 - "chart-context.tsx"
Cohesion: 0.11
Nodes (25): ChartHoverContext, ChartHoverContextValue, ChartProvider(), ChartStableContext, ChartStableContextValue, LineConfig, Margin, ScaleBand (+17 more)

### Community 51 - "dependencies"
Cohesion: 0.22
Nodes (9): @base-ui/react, dependencies, @base-ui/react, react-dom, shadcn, @visx/curve, react-dom, shadcn (+1 more)

### Community 76 - "dashboard/releases/[id]/page.tsx"
Cohesion: 0.32
Nodes (4): Props, ReleaseDetailPage(), ResubmitReleaseButton(), SubmitReleaseButton()

### Community 77 - "checkout/route.ts"
Cohesion: 0.29
Nodes (12): POST(), schema, POST(), mapStatus(), POST(), runtime, syncSubscription(), appUrl() (+4 more)

### Community 80 - "y-axis-scales.ts"
Cohesion: 0.13
Nodes (18): extractReferenceAreaConfigs(), getChildComponentName(), isReferenceAreaElement(), ReferenceAreaConfig, ReferenceAreaConfigProps, ReferenceAreaRegistrationContext, ReferenceAreaRegistrationContextValue, buildYScalesForLines() (+10 more)

### Community 82 - "admin.ts"
Cohesion: 0.26
Nodes (12): POST(), schema, POST(), schema, GET(), adminEmailsFromEnv(), DEFAULT_ADMIN_EMAILS, ensureAdminRole() (+4 more)

## Knowledge Gaps
- **300 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+295 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `artists/[id]/page.tsx`, `admin/releases/[id]/page.tsx`, `release-builder.tsx`, `chart-tooltip.tsx`, `requireAdmin`, `loading-sweep.tsx`, `utils.ts`, `x-axis.tsx`, `dashboard/releases/[id]/page.tsx`, `(marketing)/page.tsx`, `button.tsx`, `requireUser`, `area-chart.tsx`, `buttonVariants`?**
  _High betweenness centrality (0.229) - this node is a cross-community bridge._
- **Why does `prisma` connect `db.ts` to `artists/[id]/page.tsx`, `admin/releases/[id]/page.tsx`, `cn`, `session.ts`, `requireAdmin`, `release-builder.tsx`, `getSessionUser`, `dashboard/releases/[id]/page.tsx`, `checkout/route.ts`, `requireUser`, `admin.ts`, `artists/[id]/route.ts`, `sync-submit.ts`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Why does `requireAdmin()` connect `requireAdmin` to `artists/[id]/page.tsx`, `admin/releases/[id]/page.tsx`, `cn`, `db.ts`, `admin.ts`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _300 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `artists/[id]/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13071895424836602 - nodes in this community are weakly interconnected._
- **Should `chart-tooltip.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08417508417508418 - nodes in this community are weakly interconnected._
- **Should `loading-sweep.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0915915915915916 - nodes in this community are weakly interconnected._
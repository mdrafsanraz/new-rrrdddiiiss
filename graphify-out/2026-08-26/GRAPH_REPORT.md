# Graph Report - RDISTRO  (2026-08-26)

## Corpus Check
- 102 files · ~104,654 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 634 nodes · 1291 edges · 33 communities (29 shown, 4 thin omitted)
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
- area.tsx
- button.tsx
- y-domain-utils.ts
- use-animated-y-domains.ts
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
- features/page.tsx
- header.tsx
- pricing-cards.tsx

## God Nodes (most connected - your core abstractions)
1. `cn()` - 45 edges
2. `TimeSeriesChartCore` - 29 edges
3. `useChartStable()` - 23 edges
4. `compilerOptions` - 16 edges
5. `ChartPhase` - 14 edges
6. `useChartConfig()` - 13 edges
7. `normalizeYAxisId()` - 11 edges
8. `Area()` - 10 edges
9. `SpringConfig` - 10 edges
10. `Margin` - 10 edges

## Surprising Connections (you probably didn't know these)
- `XAxisLabel()` --calls--> `cn()`  [EXTRACTED]
  src/components/charts/x-axis.tsx → src/lib/utils.ts
- `GradientButton()` --calls--> `cn()`  [EXTRACTED]
  src/components/kokonutui/gradient-button.tsx → src/lib/utils.ts
- `FeaturesPage()` --calls--> `buttonVariants`  [EXTRACTED]
  src/app/features/page.tsx → src/components/ui/button.tsx
- `FeaturesPage()` --calls--> `cn()`  [EXTRACTED]
  src/app/features/page.tsx → src/lib/utils.ts
- `Home()` --calls--> `cn()`  [EXTRACTED]
  src/app/page.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (33 total, 4 thin omitted)

### Community 0 - "signup-flow.tsx"
Cohesion: 0.18
Nodes (16): planIcons, Screen, SignupFlow(), Step, stepLabels, StoreTicker(), digitsOnly(), formatCard() (+8 more)

### Community 1 - "series-markers.tsx"
Cohesion: 0.07
Nodes (30): clipRevealTransition(), DEFAULT_ANIMATION_DURATION_MS, DEFAULT_ANIMATION_EASING, DEFAULT_CHART_ENTER_TRANSITION, defaultScatterColors, useChartHover(), ChartLegendHoverContext, ChartLegendHoverContextValue (+22 more)

### Community 2 - "chart-context.tsx"
Cohesion: 0.07
Nodes (39): ChartHoverContext, ChartHoverContextValue, ChartProvider(), ChartStableContext, ChartStableContextValue, ScaleBand, ScaleLinear, ScaleTime (+31 more)

### Community 3 - "chart-tooltip.tsx"
Cohesion: 0.08
Nodes (42): ChartConfigContext, ChartConfigProviderProps, ChartConfigValue, DEFAULT_CHART_CONFIG, resolveTooltipBoxMotion(), SpringConfig, useChartConfig(), useChart() (+34 more)

### Community 4 - "dependencies"
Cohesion: 0.04
Nodes (45): @base-ui/react, class-variance-authority, clsx, d3-array, d3-shape, lucide-react, motion, next (+37 more)

### Community 5 - "loading-sweep.tsx"
Cohesion: 0.10
Nodes (27): ChartLoadingLabel(), ChartLoadingLabelProps, LINE_LOADING_LOOP_PAUSE_MS, LINE_LOADING_PULSE_CYCLE_S, LINE_LOADING_PULSE_EASE, LOADING_LABEL_EXIT_S, LOADING_LABEL_EXIT_Y_PX, BarLoadingSkeleton() (+19 more)

### Community 6 - "devDependencies"
Cohesion: 0.07
Nodes (29): babel-plugin-react-compiler, eslint, eslint-config-next, devDependencies, babel-plugin-react-compiler, eslint, eslint-config-next, tailwindcss (+21 more)

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
Nodes (20): CHART_CLIP_PASSTHROUGH, CLIP_EXCLUDED_COMPONENT_NAMES, isClipExcludedComponent(), isPostOverlayComponent(), isUnderlayComponent(), resolveChartChildElement(), UNDERLAY_COMPONENT_NAMES, decimateTimeSeries() (+12 more)

### Community 11 - "projection-utils.ts"
Cohesion: 0.12
Nodes (28): isChartClipPassthrough(), extractProjectionLineConfigs(), getChildComponentName(), isProjectionLineElement(), mergeProjectionXDomainMax(), mergeProjectionYDomain(), normalizeProjectionData(), ProjectionLineConfig (+20 more)

### Community 12 - "cn"
Cohesion: 0.12
Nodes (25): steps, CardFlip(), CardFlipProps, ShimmerText(), Text_01Props, ShimmeringText(), ShimmeringTextProps, AsciiCassette() (+17 more)

### Community 13 - "area.tsx"
Cohesion: 0.12
Nodes (28): Area(), AreaProps, CurveFactory, AreaGradientDefs(), AreaGradientDefsProps, useAreaLoadingPulseState(), chartCssVars, DashTailStroke() (+20 more)

### Community 14 - "button.tsx"
Cohesion: 0.16
Nodes (11): metadata, ColorVariant, GradientButton(), GradientButtonProps, GradientColors, ContactForm(), Field(), FieldProps (+3 more)

### Community 15 - "y-domain-utils.ts"
Cohesion: 0.22
Nodes (11): buildYScalesForLines(), buildYScalesFromDomains(), DEFAULT_Y_AXIS_ID, getPrimaryYScale(), groupLinesByYAxisId(), normalizeYAxisId(), YAxisOrientation, YScale (+3 more)

### Community 16 - "use-animated-y-domains.ts"
Cohesion: 0.47
Nodes (8): lerpDomain(), snapDomains(), tweenDomains(), useAnimatedYDomains(), domainsEqual(), isYDomainTweenPhase(), resolveAnimatedYDestinationDomains(), shouldTweenYDomain()

### Community 17 - "area-chart.tsx"
Cohesion: 0.14
Nodes (24): AreaChart(), AreaChartProps, ChartInner(), ChartInnerProps, DEFAULT_MARGIN, extractAreaConfigs(), ChartContextValue, LineConfig (+16 more)

### Community 18 - "area-chart-loading.tsx"
Cohesion: 0.36
Nodes (6): AreaChartLoading(), AreaChartLoadingProps, LoadingStyle, generateChartSkeletonData(), GenerateChartSkeletonDataOptions, generateChartSkeletonFromTarget()

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

### Community 29 - "features/page.tsx"
Cohesion: 0.50
Nodes (3): FeaturesPage(), metadata, features

### Community 31 - "header.tsx"
Cohesion: 0.17
Nodes (10): geistMono, metadata, outfit, Home(), SiteFooter(), isActive(), SiteHeader(), AnimatedBrandLogo() (+2 more)

### Community 32 - "pricing-cards.tsx"
Cohesion: 0.16
Nodes (9): metadata, faqs, metadata, metadata, valueProps, planAccents, PricingCards(), Reveal() (+1 more)

## Knowledge Gaps
- **196 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+191 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `pricing-cards.tsx`, `signup-flow.tsx`, `chart-tooltip.tsx`, `loading-sweep.tsx`, `x-axis.tsx`, `button.tsx`, `area-chart.tsx`, `features/page.tsx`, `header.tsx`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Why does `useChartStable()` connect `chart-context.tsx` to `series-markers.tsx`, `chart-tooltip.tsx`, `loading-sweep.tsx`, `x-axis.tsx`, `area.tsx`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `LINE_LOADING_PULSE_EASE` connect `loading-sweep.tsx` to `use-animated-y-domains.ts`, `x-axis.tsx`, `area.tsx`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _196 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `series-markers.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07308970099667775 - nodes in this community are weakly interconnected._
- **Should `chart-context.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0726950354609929 - nodes in this community are weakly interconnected._
- **Should `chart-tooltip.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08455625436757512 - nodes in this community are weakly interconnected._
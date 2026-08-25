---
name: designing-iot-interfaces
description: >-
  Use this skill when designing, implementing, or reviewing the frontend UI/UX
  for Smart CodeFlurry. Activates for tasks involving device dashboards,
  automation builder interfaces, water-management UI, analytics views,
  notification design, responsive layouts, loading and error states, or the
  Smart CodeFlurry design language (warm-neutral glassmorphism). Use when the
  user asks to build, refine, or evaluate any screen or component of the
  Smart CodeFlurry frontend application.
---

# Designing IoT Interfaces

This skill governs the frontend design and implementation of Smart CodeFlurry.
The interface must feel like a premium consumer IoT product — not a generic
dashboard template. The established design language is MANDATORY.

---

## Critical Design Declaration

REJECT generic AI-generated dashboard aesthetics:
- No generic purple AI themes
- No blue SaaS color schemes
- No violet gradients
- No neon cyan accents
- No excessive glow effects
- No random gradients
- No generic dashboard card layouts copied from templates
- No excessive glass effects that reduce readability

Smart CodeFlurry must feel premium, warm, and purposeful.

---

## Quick-Reference Checklist

Before designing or implementing any screen:

- [ ] Does the design use the warm-neutral glassmorphism palette (Section 3)?
- [ ] Are loading, error, and offline states designed for every screen?
- [ ] Is the device UI driven by capabilities (not hardcoded per device type)?
- [ ] Are micro-interactions defined for all interactive elements?
- [ ] Has the responsive layout been considered (mobile-first)?
- [ ] Have accessibility requirements been included (contrast, touch targets)?
- [ ] Has the typography system been applied (not browser defaults)?
- [ ] Have empty states been designed (no devices, no automations, etc.)?

---

## 1. Workflow — Plan ? Validate ? Execute

### Phase 1 — Plan

1. Identify the screen or component to be designed.
2. Define the data it displays and the actions it enables.
3. Draft the layout using the grid and spacing system (Section 4).
4. Identify all states: loading, error, empty, offline, normal.

### Phase 2 — Validate

1. Check palette compliance against Section 3 (Design Tokens).
2. Verify that device UI components are capability-driven, not device-type-hardcoded.
3. Verify that micro-interactions are specified for interactive elements.
4. Verify accessibility: minimum 4.5:1 contrast ratio for text.

### Phase 3 — Execute

1. Implement using the component library built on the design system.
2. Test on mobile viewport first, then tablet and desktop.
3. Test all states: loading, error, offline, empty.

---

## 2. Design Language — Warm-Neutral Glassmorphism

Smart CodeFlurry uses a premium warm-neutral dark theme with translucent
glass surfaces, soft shadows, and restrained warm-orange accents.

The aesthetic goal: premium consumer IoT product, not a SaaS dashboard.

Key visual characteristics:
- Dark charcoal backgrounds with subtle warm undertones
- Translucent glass cards with frosted blur
- Soft, warm borders (not bright white outlines)
- Restrained warm-orange or amber accent color (not neon)
- Layered depth through shadows and blur levels
- Large but controlled corner radii (not pill shapes everywhere)
- Premium sans-serif typography
- Smooth, purposeful micro-interactions

---

## 3. Design Tokens

```
Colors:
  background-base:    hsl(220, 10%, 8%)     /* deep charcoal */
  background-surface: hsl(220, 10%, 12%)    /* card surface */
  background-glass:   hsla(220, 10%, 16%, 0.6) /* glass layer */
  border-subtle:      hsla(30, 15%, 60%, 0.15) /* warm subtle border */
  accent-primary:     hsl(28, 85%, 55%)     /* warm orange */
  accent-secondary:   hsl(38, 70%, 60%)     /* amber */
  text-primary:       hsl(30, 15%, 90%)     /* warm off-white */
  text-secondary:     hsl(30, 10%, 60%)     /* warm gray */
  text-muted:         hsl(30, 8%, 40%)      /* muted label */
  success:            hsl(145, 55%, 45%)    /* green */
  warning:            hsl(38, 90%, 50%)     /* amber */
  danger:             hsl(0, 75%, 55%)      /* red */
  info:               hsl(210, 70%, 60%)    /* blue */

  /* Status colors for device states */
  status-online:      hsl(145, 55%, 45%)
  status-offline:     hsl(0, 10%, 40%)
  status-unknown:     hsl(38, 50%, 50%)

Glass Effect:
  backdrop-filter: blur(12px) saturate(1.2)
  background: hsla(220, 10%, 16%, 0.55)
  border: 1px solid hsla(30, 15%, 60%, 0.12)

Shadows:
  shadow-sm:  0 1px 3px hsla(0, 0%, 0%, 0.3)
  shadow-md:  0 4px 12px hsla(0, 0%, 0%, 0.4)
  shadow-lg:  0 8px 32px hsla(0, 0%, 0%, 0.5)

Radius:
  radius-sm:  6px
  radius-md:  12px
  radius-lg:  20px
  radius-xl:  28px

Typography:
  font-family: 'Outfit', 'Inter', system-ui, sans-serif
  scale: 11px / 13px / 15px / 17px / 22px / 28px / 36px / 48px

Spacing:
  base unit: 4px
  xs: 4px | sm: 8px | md: 16px | lg: 24px | xl: 32px | 2xl: 48px | 3xl: 64px

Animation:
  duration-fast:   120ms
  duration-normal: 220ms
  duration-slow:   380ms
  easing:          cubic-bezier(0.16, 1, 0.3, 1)
```

---

## 4. Application Screens

### 4.1 Home Screen

Purpose: Overview of home status, recently active devices, water system summary,
and active automations.

Required sections:
- Home header (home name, time, overall status)
- Water system mini-dashboard (sump level, tank level, pump state)
- Quick-access device tiles (most-used devices)
- Recent automation activity
- Active alerts

### 4.2 Devices Screen

Purpose: List of all devices grouped by room.

Components:
- Room filter tabs
- Device card grid (capability-driven, see Section 5)
- Search/filter controls
- Add device shortcut
- Offline device indicator

### 4.3 Device Detail Screen

Purpose: Full device control and status.

Components:
- Device header (name, status, location, connectivity)
- Primary capability control (the main control for this device)
- All capabilities listed with their current values
- Telemetry/history chart
- Device settings link
- Last updated timestamp

### 4.4 Automation Builder

Purpose: Create and edit automation rules.

UX flow:
1. Select trigger type
2. Configure trigger value and device
3. Add conditions (AND/OR logic selector)
4. Add actions (with ordering)
5. Set schedule (optional)
6. Review and save

Conflict warnings must be shown inline during rule construction.

### 4.5 Water Management Screen

Purpose: Dedicated water system dashboard.

Sections:
- System diagram (visual flow: borewell ? sump ? tank ? home)
- Level gauges for each water tank (animated fill)
- Pump status tiles with runtime counter
- Soil moisture readings
- Quick pump controls (with safety check confirmation)
- Alert history
- Irrigation schedule summary

### 4.6 Notifications

Purpose: Alert history and notification preferences.

Components:
- Grouped notification list (today, yesterday, older)
- Severity badges (info, warning, critical)
- Mark as read / dismiss
- Notification preference settings

### 4.7 Analytics

Purpose: Device usage history and sensor trend charts.

Components:
- Date range selector
- Sensor value time-series charts
- Pump runtime bar chart
- Automation execution history
- Water usage summary

---

## 5. Capability-Driven Device UI

Device cards and detail screens must render based on capabilities, not device
type. Build a component for each capability type:

| Capability Type | UI Component |
|---|---|
| boolean (power) | Toggle switch with state label |
| percentage (level) | Circular gauge or fill bar |
| percentage (moisture) | Arc gauge with zone colors |
| integer (brightness) | Slider |
| enum (mode) | Segmented selector |
| temperature | Numeric display with unit |

Map each device's capabilities to the correct component. Do NOT hardcode pump
UI, light UI, or sensor UI as separate screen types.

---

## 6. States — Every Screen Must Define

Every screen must handle all of these states explicitly:

| State | Design Requirement |
|---|---|
| Loading | Skeleton loaders (not spinners for full pages) |
| Error | Inline error with retry action |
| Offline | Banner indicating app is offline, stale data indicator |
| Empty | Illustrated empty state with call to action |
| Partial | Show available data, gray out unavailable sections |

---

## 7. Micro-Interactions

| Interaction | Required Animation |
|---|---|
| Toggle device | Spring scale on press, color transition on state change |
| Device card tap | Subtle scale (0.97) + shadow lift |
| Level gauge | Animated fill on data load and update |
| Pump running | Subtle pulse ring on pump tile |
| Alert arrival | Slide in from top with haptic feedback |
| Tab switch | Crossfade or shared-element transition |
| Button press | Scale down 0.96, release with bounce |

---

## 8. Accessibility

- Minimum contrast ratio: 4.5:1 for body text, 3:1 for large text.
- Minimum touch target: 44x44 pt.
- All interactive elements must have accessible labels.
- Color must never be the only indicator of state (use icons + labels).
- Support system font size scaling.

---

## 9. References

- designing-iot-architecture/SKILL.md (canonical device model, capabilities)
- managing-water-automation/SKILL.md (water dashboard requirements)
- engineering-automation-rules/SKILL.md (automation builder requirements)
- testing-iot-systems/SKILL.md (UI testing requirements)


---

## Token Efficiency

- Use the skill ONLY when its trigger actually applies.
- Do NOT load, execute, or reference the skill unnecessarily.
- Use the minimum instructions/resources required for the current task.
- Do NOT repeat information already available in the current context.
- Do NOT reread files that have already been inspected unless they changed.
- Prefer targeted file searches/reads over scanning entire directories.
- Avoid unnecessary tool calls.
- Avoid repeating the same validation or command unless the previous attempt failed or the state changed.
- Do not generate lengthy explanations when a short actionable response is sufficient.
- Do not perform unrelated cleanup, refactoring, optimization, or analysis.
- Stop using the skill once its required task is complete.
- When a task requires only a small change, make only the smallest necessary change.
- Prefer existing project utilities, components, services, and patterns instead of rediscovering or recreating them.

### Progressive execution

Follow:

TRIGGER
? MINIMAL CONTEXT
? MINIMAL ACTION
? VALIDATE
? STOP

Before using additional resources, ask:

"Is this actually required to complete the current task?"

If NO:
Do not load or use it.

### Context discipline

Keep only information relevant to the current task in active reasoning.

Do not repeatedly summarize the entire project.

Do not repeatedly inspect the same files.

Do not load large resources when a targeted section is sufficient.

### Tool discipline

Use tools only when they materially help complete the task.

Prefer:
- One targeted search over multiple broad searches.
- One relevant file read over reading an entire directory.
- One validation pass over repeated checks.
- Existing information over retrieving the same information again.

### Output discipline

Responses should be concise and directly actionable.

Do not explain every internal step.

Do not provide unnecessary implementation details unless they are needed by the user.

### Important

TOKEN EFFICIENCY MUST NEVER REDUCE CORRECTNESS.

If additional context, file inspection, validation, or tool usage is genuinely required, use it.

The goal is NOT to avoid necessary work.

The goal is to avoid unnecessary work, repeated context, redundant tool calls, and over-analysis.

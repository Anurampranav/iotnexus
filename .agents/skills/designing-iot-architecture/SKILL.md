---
name: designing-iot-architecture
description: >-
  Use this skill when designing or reviewing the system architecture for Smart
  CodeFlurry or any IoT platform. Activates for tasks involving service
  boundaries, device abstraction layers, integration architecture, cloud vs.
  local decisions, scalability planning, reliability design, or offline/fail-safe
  behavior. Use when the user asks to plan, extend, or validate the overall
  system structure of a connected-device platform.
---

# Designing IoT Architecture

This skill governs architecture planning for Smart CodeFlurry — a universal IoT
control and automation platform. Follow the Plan ? Validate ? Execute workflow
for every architectural decision.

---

## Quick-Reference Checklist

Before proposing any architecture:

- [ ] Have service boundaries been defined clearly?
- [ ] Is the device abstraction layer protocol-agnostic?
- [ ] Is each integration isolated behind an adapter boundary?
- [ ] Have cloud-dependent vs. locally-executable responsibilities been separated?
- [ ] Have offline and fail-safe behaviors been designed for each layer?
- [ ] Have scalability and reliability requirements been stated explicitly?
- [ ] Have no Tuya, MQTT, or protocol assumptions leaked into core services?

---

## 1. Workflow — Plan ? Validate ? Execute

### Phase 1 — Plan

1. Clarify the scope: What layer or component is being designed?
2. Identify external dependencies (cloud APIs, protocols, hardware).
3. Draft the service boundary diagram (see Section 3).
4. State all assumptions explicitly. Flag any assumption that cannot be verified
   without external research.

### Phase 2 — Validate

1. Challenge every assumption against Section 4 (Architecture Principles).
2. Verify that no integration-specific details (Tuya, MQTT, BLE) have leaked into
   the core domain layer.
3. Confirm that offline behavior is accounted for at each layer.
4. Check for circular dependencies between services.

### Phase 3 — Execute

1. Document the architecture in a structured ADR (Architectural Decision Record).
2. Reference the canonical device model (Section 5).
3. Reference the integration adapter pattern (Section 6).

---

## 2. Smart CodeFlurry — System Overview

`
Mobile / Web App
      |
      v
API Gateway / Backend
      |
  .---+-------------------------------------.
  v                                         v
Device Manager                      Automation Engine
  |                                         |
  v                                         v
Integration Layer                 Rule Executor / Scheduler
  |
  +-- Tuya Adapter
  +-- MQTT Adapter (ESP32 / Custom)
  +-- Matter Adapter
  +-- Zigbee Adapter
  +-- BLE Adapter
  -- [Future Adapters]
`

The core domain (Device Manager, Automation Engine) must never import from
integration adapters directly. Communication flows through defined interfaces.

---

## 3. Service Boundaries

| Layer | Responsibility | May NOT depend on |
|---|---|---|
| Mobile/Web | UI, user interaction | Integration internals |
| API Gateway | Auth, routing, rate limiting | Device protocols |
| Device Manager | Device state, commands | Protocol details |
| Automation Engine | Rule evaluation, scheduling | Device protocols |
| Integration Layer | Protocol adapters | Core domain (import only interfaces) |
| Hardware/Cloud | Physical devices, cloud APIs | Application logic |

---

## 4. Architecture Principles

### 4.1 Device Abstraction

Every device, regardless of protocol or manufacturer, is represented using the
Canonical Device Model (see Section 5). No module outside the integration adapter
layer may reference Tuya, MQTT, Zigbee, or BLE types directly.

### 4.2 Capability-Driven Design

The UI and automation engine operate on capabilities, not device types.
A pump is a device with a power capability. A light with brightness is a
different configuration of the same abstraction.

### 4.3 Cloud / Local Boundary

Classify every responsibility explicitly:

| Responsibility | Device | Local Gateway | Backend | Cloud | Mobile |
|---|---|---|---|---|---|
| Safety-critical cutoff | YES | YES | MAYBE | NO | NO |
| Command execution | YES | YES | YES | MAYBE | NO |
| Automation rules | MAYBE | YES | YES | MAYBE | NO |
| Notifications | NO | MAYBE | YES | YES | YES |
| History / Analytics | NO | NO | YES | YES | NO |

WARNING: Safety-critical actions (e.g., pump shutoff at low tank level) must
NEVER rely solely on cloud connectivity. Always evaluate local or device-level
execution for safety logic.

### 4.4 Offline / Fail-Safe Behavior

For every component, explicitly define behavior under:
- Internet failure
- Cloud API failure (Tuya Cloud, etc.)
- MQTT broker failure
- Backend failure
- Mobile app offline
- Device Wi-Fi failure
- Sensor failure / stale telemetry

Document the degraded-mode behavior, not just the happy path.

### 4.5 Scalability Principles

- Prefer event-driven communication between services.
- Device state changes propagate via events, not polling (where protocol allows).
- Design for horizontal scaling of the API and automation engine layers.
- Use idempotent command patterns.

---

## 5. Canonical Device Model

`
Device
+-- id              (UUID)
+-- name            (string)
+-- type            (enum: pump | light | sensor | switch | ...)
+-- manufacturer    (string)
+-- protocol        (enum: tuya | mqtt | matter | zigbee | ble | custom)
+-- integration     (string: integration adapter identifier)
+-- capabilities    (map: capability_name -> CapabilityDefinition)
+-- state           (map: capability_name -> current_value)
+-- telemetry       (time-series sensor readings)
+-- connectionStatus (enum: online | offline | unknown)
+-- location        (home_id, room_id)
-- metadata        (key-value, integration-specific, opaque to core)
`

CapabilityDefinition examples:

`
power:
  type: boolean
  writable: true
  label: "Power"

level:
  type: percentage   # 0-100
  writable: false
  label: "Water Level"

moisture:
  type: percentage
  writable: false
  label: "Soil Moisture"

brightness:
  type: integer      # 0-1000
  writable: true
  label: "Brightness"
`

---

## 6. Integration Adapter Pattern

Each integration must implement the following interface. Never call
integration-specific SDKs from outside the adapter module.

`
IntegrationAdapter
+-- connect()
+-- disconnect()
+-- discoverDevices() -> Device[]
+-- getDeviceState(deviceId) -> State
+-- sendCommand(deviceId, capability, value)
+-- subscribeToStateChanges(deviceId, callback)
-- getCapabilities(deviceId) -> CapabilityDefinition[]
`

Integration-specific credentials, SDK calls, and error codes must be
fully contained within the adapter module.

---

## 7. Error Handling

- Define error classes at each boundary: integration errors, domain errors,
  transport errors.
- Do not propagate integration-specific error types into the core domain.
- Log integration errors with enough context for debugging without exposing
  credentials or secrets.
- Design retry policies per integration (cloud APIs often have rate limits).

---

## 8. References

For detailed sub-topics, read these related skills:
- integrating-iot-devices/SKILL.md
- engineering-automation-rules/SKILL.md
- securing-iot-systems/SKILL.md
- managing-water-automation/SKILL.md


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

---
name: testing-iot-systems
description: >-
  Use this skill when designing, implementing, or reviewing tests for Smart
  CodeFlurry. Activates for tasks involving unit testing, integration testing,
  automation rule testing, device simulation, MQTT testing, offline behavior
  testing, failure scenario testing, safety validation testing, API testing,
  UI testing, or regression testing. Use when the user asks to write tests,
  plan a test strategy, or validate that a feature works correctly — especially
  when physical devices or safety-critical behavior is involved.
---

# Testing IoT Systems

This skill governs the test strategy for Smart CodeFlurry. IoT systems require
testing beyond traditional software: device simulation, protocol mocking,
failure injection, and safety validation are all first-class requirements.

---

## Critical Testing Declaration

Physical devices must NEVER be assumed to have executed successfully merely
because a command was dispatched. Tests must verify device state change
confirmation, not just command delivery.

---

## Quick-Reference Checklist

Before writing tests for any feature:

- [ ] Are unit tests written for all business logic (conditions, rules, state)?
- [ ] Are integration tests written for each API endpoint?
- [ ] Are device simulations used instead of real hardware in automated tests?
- [ ] Are failure scenarios explicitly tested (offline, stale data, timeout)?
- [ ] Are safety rules tested with adversarial inputs (low level, sensor offline)?
- [ ] Are automation loops and conflicts tested?
- [ ] Is the UI tested for all states (loading, error, offline, empty)?
- [ ] Is a regression test run required before any change to safety-related code?

---

## 1. Workflow — Plan ? Validate ? Execute

### Phase 1 — Plan

1. Identify the feature or component to test.
2. Enumerate all inputs, outputs, and side effects.
3. Identify all failure modes to test explicitly.
4. Choose the test level: unit, integration, E2E, or manual.

### Phase 2 — Validate

1. Review test cases for coverage of all happy paths.
2. Review test cases for coverage of all known failure modes.
3. Verify that mocks accurately represent real integration behavior.
4. Verify that safety rule tests are included for any pump or actuator feature.

### Phase 3 — Execute

1. Run the full test suite. Confirm all tests pass.
2. Check coverage report. Identify and address gaps.
3. Run failure injection tests manually if automated injection is not available.

---

## 2. Test Levels

### 2.1 Unit Tests

Scope: Individual functions, classes, modules.
Coverage targets:
- All condition evaluators (equals, greater-than, etc.)
- All trigger handlers
- All automation rule validators
- Device capability state machines
- Safety rule functions
- Capability normalization / mapping functions

Mock: All external dependencies (integrations, database, network).

### 2.2 Integration Tests

Scope: Component interactions — API endpoints, database, integration adapters.
Coverage targets:
- Every REST API endpoint (success + error cases)
- Database read/write operations for devices and automations
- Integration adapter behavior with mocked SDK/protocol responses
- MQTT message processing pipeline

Mock: External cloud APIs (Tuya Cloud, push services). Use a local MQTT
broker (e.g., Mosquitto) for MQTT integration tests.

### 2.3 End-to-End Tests (E2E)

Scope: Full user flows from UI to backend to simulated device.
Coverage targets:
- Device control flow: UI ? API ? Adapter ? Device (simulated) ? State update
- Automation trigger flow: trigger event ? conditions ? actions ? notification
- Water dashboard: level update ? alert ? notification
- Pump control: user action ? safety check ? command ? confirmation

### 2.4 Manual / Exploratory Tests

- Use for hardware integration validation when a real device is available.
- Document manual test scripts for each physical device type.
- Always test on real hardware before deploying to production.

---

## 3. Device Simulation

For automated tests, replace real devices with device simulators:

```
DeviceSimulator
+-- setCapabilityValue(capability, value)   <- simulate sensor readings
+-- receiveCommand(capability, value)        <- capture issued commands
+-- confirmCommand(capability, value)        <- simulate device executing command
+-- goOffline()                             <- simulate disconnection
+-- reportStaleData(minutes)                <- simulate sensor staleness
`-- emitTelemetry(data)                     <- simulate data stream
```

Simulators must model:
- Normal operation
- Offline state
- Command acknowledgment delay
- Command failure
- Stale/invalid telemetry

---

## 4. MQTT Testing

For MQTT-based integrations:

1. Use a local Mosquitto broker for integration tests.
2. Write test utilities that publish device state messages and capture commands.
3. Test the full payload flow:
   - Backend publishes command to device topic
   - Device simulator receives and parses command
   - Device simulator publishes state confirmation
   - Backend processes state confirmation

Test cases required:
- Valid command payload: device state updates correctly.
- Malformed command payload: rejected, error logged.
- Command with no device response: timeout handling.
- Device reconnects after offline: state resync.

---

## 5. Failure Scenario Tests

These scenarios must have automated test coverage:

| Failure Scenario | Expected Behavior to Test |
|---|---|
| Device offline during command | Command fails gracefully, error returned |
| Sensor data older than threshold | Treated as unknown/unsafe state |
| Cloud API unavailable | Integration returns error, no crash |
| MQTT broker connection lost | Reconnection attempted, state preserved |
| Automation rule loop | Loop detected, chain aborted, alert generated |
| Invalid sensor reading | Condition evaluates as false/unsafe |
| Safety cutoff triggers | Pump stops, notification sent, history logged |
| Rate limit exceeded | 429 returned, command not executed |

---

## 6. Safety Testing

Safety rules are the most critical tests in the system.

For each safety rule, write tests for:
- Normal case: safety rule not triggered (system operates normally)
- Boundary case: level exactly at threshold value
- Critical case: level below threshold (rule must trigger)
- Sensor offline: rule must apply fail-safe behavior
- Stale data: rule must not act on old readings

### Water Safety Test Cases

- Tank at 11%: irrigation runs (above critical).
- Tank at 10%: irrigation stops immediately (critical cutoff = Rule S-1).
- Tank at 9%: irrigation stopped, critical notification sent.
- Pump running for max_runtime_minutes: pump stops (Rule S-2).
- Soil sensor offline during irrigation: irrigation stops (Rule S-3).
- Tank sensor offline when user attempts manual pump start: command blocked.

---

## 7. Offline / Connectivity Tests

Test the application behavior under each connectivity failure:

| Connectivity State | What to Test |
|---|---|
| Mobile app offline | Stale data shown with indicator, no command errors |
| Backend offline | Device state not updated, user notified |
| MQTT broker offline | Devices appear offline, reconnection attempted |
| Cloud API offline | Integration returns cached state or error |
| Internet failure | Degraded mode behavior as designed in architecture |

---

## 8. API Testing

For every API endpoint, write tests for:
- Success case with valid input
- Invalid input (missing fields, wrong types, out-of-range values)
- Unauthenticated request (expect 401)
- Unauthorized request (wrong role/ownership, expect 403)
- Rate-limited request (expect 429)
- Server error simulation (expect 500 with generic message)

---

## 9. UI Testing

For every screen, test all states:
- Loading state: skeleton loaders visible, no real data shown
- Normal state: correct data displayed, all actions work
- Error state: error message shown with retry action
- Empty state: illustrated empty state with call to action
- Offline state: stale data indicator visible, commands disabled or warned

Micro-interactions to verify:
- Toggle animations execute without jank
- Level gauges animate on update
- Notifications slide in correctly
- Offline banner appears when connectivity is lost

---

## 10. Automation Testing

For the automation engine, write tests for:
- Each trigger type fires correctly on the appropriate event
- AND condition group evaluates correctly (all must be true)
- OR condition group evaluates correctly (any can be true)
- Nested condition groups evaluate correctly
- Action execution in order
- Action failure does not crash the engine
- Execution history record is created after every evaluation
- Conflict detection: two rules with opposing actions on same device
- Loop detection: Rule A triggers Rule B triggers Rule A

---

## 11. Regression Testing

Any change to the following areas requires a full regression test run:
- Safety rules (water, pump, sensors)
- Automation condition evaluator
- Device command pipeline
- Authentication and authorization
- Integration adapters (capability mapping changes)

---

## 12. References

- designing-iot-architecture/SKILL.md (service boundaries, device model)
- engineering-automation-rules/SKILL.md (automation engine behavior)
- managing-water-automation/SKILL.md (safety rules and expected behaviors)
- securing-iot-systems/SKILL.md (security test requirements)
- integrating-iot-devices/SKILL.md (device state verification)


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

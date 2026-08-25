---
name: integrating-iot-devices
description: >-
  Use this skill when designing, implementing, or debugging an integration
  adapter for any IoT ecosystem in Smart CodeFlurry. Activates for tasks
  involving Tuya, MQTT, Matter, Zigbee, BLE, ESP32, or any other protocol or
  manufacturer API. Use when the user needs to add a new device integration,
  verify API compatibility, normalize device capabilities, or isolate
  protocol-specific details behind an adapter boundary.
---

# Integrating IoT Devices

This skill governs the design and implementation of integration adapters for
Smart CodeFlurry. Every integration must be isolated, verified, and
capability-normalized before connecting to the core domain.

---

## Quick-Reference Checklist

Before writing any integration code:

- [ ] Has the official SDK/API been identified and version-verified?
- [ ] Has the authentication method been confirmed with official documentation?
- [ ] Are pricing and rate limits understood (especially for cloud APIs)?
- [ ] Is the integration isolated behind an IntegrationAdapter interface?
- [ ] Are all credentials stored securely (never in source code or frontend)?
- [ ] Has the capability normalization mapping been defined?
- [ ] Has device state verification been included (not just command-sent)?
- [ ] Has offline/disconnection behavior been defined for this adapter?

---

## 1. Workflow — Plan ? Validate ? Execute

### Phase 1 — Plan

1. Identify the target protocol or ecosystem (Tuya, MQTT, Matter, Zigbee, etc.).
2. Locate and read the **current official documentation**. Do NOT rely on
   outdated tutorials or assumed API shapes.
3. Confirm:
   - SDK name and version
   - Authentication method (OAuth, API key, certificate, etc.)
   - Rate limits and quotas
   - Device capability model (what the protocol exposes vs. what Smart
     CodeFlurry needs)
4. Draft the capability mapping table (protocol capability ? canonical capability).

### Phase 2 — Validate

1. Verify API shapes against live documentation before writing code.
2. Confirm that no integration-specific types are exposed outside the adapter.
3. Confirm that credentials are handled only within the adapter module.
4. Confirm that command execution includes state verification, not just
   fire-and-forget.

### Phase 3 — Execute

1. Implement the adapter implementing the IntegrationAdapter interface.
2. Write unit tests using mocked protocol responses.
3. Write integration tests against a sandbox or test device where available.
4. Document any known limitations, quirks, or unsupported capabilities.

---

## 2. Adapter Architecture

Every integration lives in an isolated adapter module:

```
integrations/
+-- tuya/
|   +-- tuya-adapter.ts
|   +-- tuya-auth.ts
|   +-- tuya-capability-map.ts
|   `-- tuya-types.ts          (internal only, never exported to core)
+-- mqtt/
|   +-- mqtt-adapter.ts
|   +-- mqtt-topics.ts
|   `-- mqtt-types.ts
+-- matter/
+-- zigbee/
+-- ble/
`-- index.ts                   (exports only IntegrationAdapter instances)
```

The core domain (Device Manager, Automation Engine) imports ONLY through
`integrations/index.ts` and the IntegrationAdapter interface.

---

## 3. Integration-Specific Notes

### 3.1 Tuya

WARNING: Never invent Tuya APIs. Always verify:
- Official Tuya IoT Platform documentation
- Current SDK version (e.g., tuya-connector-js, Tuya IoT Core SDK)
- OAuth 2.0 token management lifecycle
- Region-based API endpoints (us, eu, cn, in)
- Device UID vs. Device ID distinction
- Data point (DP) codes per device category
- Cloud API pricing tier and call limits

Tuya is ONE integration, not the entire Smart CodeFlurry architecture.
Tuya internals (DP codes, token refresh, webhook signatures) must never
appear in core domain code.

### 3.2 MQTT / ESP32

Design MQTT topic structure before implementation:

```
smartcodeflurry/{home_id}/{device_id}/command    <- App -> Device
smartcodeflurry/{home_id}/{device_id}/state      <- Device -> App
smartcodeflurry/{home_id}/{device_id}/telemetry  <- Device -> App (sensor data)
smartcodeflurry/{home_id}/{device_id}/event      <- Device -> App (alerts)
```

Always:
- Use TLS for MQTT connections (port 8883)
- Authenticate devices with unique certificates or credentials
- Handle Last Will and Testament (LWT) for offline detection
- Validate incoming MQTT payloads before processing
- Reject stale telemetry (check timestamp before acting)

### 3.3 Matter / Zigbee / BLE

These protocols require local hub/gateway support. Define:
- Whether a local gateway is required
- How the gateway communicates with the backend
- Pairing/commissioning workflows
- Local vs. cloud command routing

---

## 4. Capability Normalization

When connecting a physical device, map its native capabilities to the
Canonical Device Model (see designing-iot-architecture/SKILL.md, Section 5).

Example — Tuya Water Sensor to Canonical Model:

| Tuya DP Code | Tuya Name | Canonical Capability | Canonical Type |
|---|---|---|---|
| 101 | water_level | level | percentage |
| 102 | battery_level | battery | percentage |
| 103 | fault_alarm | fault | boolean |

Document ALL capability mappings in a `*-capability-map` file per adapter.

---

## 5. Device State Verification

Sending a command does NOT guarantee execution. Always:

1. Send the command.
2. Wait for state confirmation (subscribe to state topic / poll state endpoint).
3. Timeout if confirmation is not received within a defined window.
4. Report failure to the application layer if confirmation fails.
5. Do NOT assume the device is in the desired state without confirmation.

This is especially critical for safety-sensitive devices (pumps, valves).

---

## 6. Error Handling

- Catch and translate integration-specific exceptions into domain errors.
- Never expose SDK error codes to the core domain.
- Log: adapter name, device ID, operation, error code, timestamp.
- Implement exponential backoff for retryable errors.
- Implement circuit breaker patterns for persistently failing integrations.

---

## 7. Security Requirements

- All credentials must be stored in environment variables or a secrets manager.
- Never log credentials, tokens, or device keys.
- Never include credentials in source code or configuration files.
- See securing-iot-systems/SKILL.md for full security requirements.

---

## 8. References

- designing-iot-architecture/SKILL.md (adapter interface, canonical device model)
- securing-iot-systems/SKILL.md (credentials, TLS, API security)
- testing-iot-systems/SKILL.md (mocking integrations, device simulation)


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

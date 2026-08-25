---
name: managing-water-automation
description: >-
  Use this skill when designing, implementing, or reviewing any water-management
  or irrigation feature in Smart CodeFlurry. Activates for tasks involving
  borewell, sump, overhead tank, pump control, water-level sensors, soil
  moisture, low-water alerts, irrigation automation, pump safety, runtime
  limits, fail-safe behavior, sensor failure handling, or manual override logic.
  Pump control must always be treated as safety-sensitive. Use when physical
  water infrastructure or pump commands are involved.
---

# Managing Water Automation

This skill governs water-management and irrigation systems in Smart CodeFlurry.
Pump control is SAFETY-SENSITIVE. Every decision involving physical actuators
must pass through safety validation before execution.

---

## Critical Safety Declaration

PUMP CONTROL IS SAFETY-CRITICAL.
- Never issue a pump ON command without verifying water availability.
- Never run a pump without a runtime limit.
- Always stop the pump immediately if tank level falls below the critical threshold.
- Never depend on cloud connectivity alone for safety-critical pump cutoffs.

---

## Quick-Reference Checklist

Before implementing any water automation:

- [ ] Has the physical water flow been documented (Borewell ? Sump ? Tank ? Home)?
- [ ] Is pump control treated as safety-sensitive (not just a toggle)?
- [ ] Are water level thresholds defined for low, critical, and safe states?
- [ ] Is sensor staleness detection implemented before evaluating levels?
- [ ] Is the maximum pump runtime limit enforced?
- [ ] Is automatic pump cutoff defined for critical tank level?
- [ ] Has manual override behavior been designed?
- [ ] Has offline/sensor-failure behavior been defined (fail-safe)?
- [ ] Have notifications been defined for low water, critical water, and pump events?

---

## 1. Physical Water Flow

```
BOREWELL
   |
   v
BOREWELL PUMP
   |
   v
SUMP (underground storage)
   |
   v
SUMP -> OVERHEAD TANK PUMP
   |
   v
OVERHEAD TANK
   |
   v
HOME SUPPLY / IRRIGATION DRIP LINES
```

Each pump must be modeled as a separate device with independent state,
runtime tracking, and safety rules.

---

## 2. Workflow — Plan ? Validate ? Execute

### Phase 1 — Plan

1. Document the physical water system: tanks, pumps, sensors, flow paths.
2. Define alert thresholds for each water level sensor:
   - Critical: level < 10% (immediate action required)
   - Low: level < 20% (user notification)
   - Safe: level >= 25%
3. Define pump safety constraints:
   - Maximum runtime before forced shutoff
   - Minimum rest period between pump cycles
   - Required water level to permit pump start
4. Define irrigation conditions.

### Phase 2 — Validate

1. Verify sensor data timestamps before using level readings.
2. Verify all safety thresholds are applied before permitting any pump command.
3. Verify that the fail-safe behavior is explicitly defined for every failure mode.
4. Verify that manual override does not bypass safety cutoffs.

### Phase 3 — Execute

1. Implement pump command handlers with safety checks built in.
2. Implement runtime tracking and automatic cutoff.
3. Implement level-based critical cutoff.
4. Write tests for all failure scenarios.

---

## 3. Water Level States

| State | Level | Action Required |
|---|---|---|
| Safe | >= 25% | No action |
| Low | < 20% | Send low-water notification to user |
| Critical | < 10% | Stop irrigation pump + send critical alert |
| Unknown | sensor offline or stale | Treat as unsafe, log, notify |

LOW WATER does NOT automatically start the pump. The user must manually
decide to start the pump after receiving the notification. Automation must
NEVER automatically start the main water supply pump on low-water alone.

---

## 4. Manual Pump Control Rules

Manual pump control is the primary interaction model for water supply:

1. User receives low-water notification.
2. User opens Smart CodeFlurry.
3. User taps "Turn On Pump".
4. System performs safety checks BEFORE sending command:
   - Is the pump online?
   - Is the source water available (sump level is not empty)?
   - Is the pump not already running?
5. If checks pass: send pump ON command, confirm state, start runtime timer.
6. If checks fail: show specific failure reason, do NOT send command.

---

## 5. Irrigation Automation

Irrigation CAN run automatically. Required conditions:

```
IF:
  soil_moisture < 30%
  AND tank_level > 25%
  AND soil_sensor.connectionStatus == online
  AND tank_sensor.connectionStatus == online
  AND irrigation_pump.connectionStatus == online
  AND soil_sensor.data_timestamp is within last 5 minutes

THEN:
  irrigation_pump.power = ON

STOP IRRIGATION WHEN:
  soil_moisture >= 60%
  OR tank_level < 10%      <- SAFETY CRITICAL
  OR sensor offline
  OR runtime > max_runtime_minutes
```

---

## 6. Safety Rules

These rules are absolute and may not be disabled by user automation:

### Rule S-1: Critical Tank Cutoff

IF tank_level < 10%
THEN:
  - irrigation_pump.power = OFF (immediate)
  - Send CRITICAL notification: "Water level critically low. Pump stopped."
  - Log safety event with timestamp and level reading

### Rule S-2: Pump Runtime Limit

IF pump has been running continuously for > max_runtime_minutes (configurable,
default: 60 minutes)
THEN:
  - pump.power = OFF
  - Send notification: "Pump auto-stopped: runtime limit reached."
  - Log safety event

### Rule S-3: Sensor Failure Fail-Safe

IF any sensor required for pump decision is:
  - Offline
  - Not reporting for > staleness_threshold (default: 10 minutes)
THEN:
  - Treat as UNSAFE state
  - Do NOT start any automated pump action
  - If pump is running: optional configurable stop or alert
  - Send notification: "Sensor offline. Manual verification required."

### Rule S-4: Cloud Failure Fail-Safe

IF cloud connectivity is lost:
  - Existing pump states remain unchanged (no forced stop due to cloud loss)
  - No NEW automated pump starts are initiated from cloud-dependent rules
  - Local/device-level cutoffs (S-1, S-2) remain active at the device level

---

## 7. Notification Design

| Event | Priority | Message |
|---|---|---|
| Tank level low (< 20%) | Medium | "Water level is low. Please check and turn on the pump if needed." |
| Tank level critical (< 10%) | HIGH | "CRITICAL: Water level is very low. Irrigation stopped automatically." |
| Pump auto-stopped (runtime) | Low | "Water pump stopped after reaching the runtime limit." |
| Sensor offline | Medium | "Water sensor offline. Manual check required." |
| Irrigation started | Info | "Irrigation started automatically (soil moisture: X%)." |
| Irrigation stopped | Info | "Irrigation stopped (soil moisture: X% / level: Y%)." |

---

## 8. Fail-Safe Behavior Matrix

| Failure | Behavior |
|---|---|
| Tank sensor offline | Stop new automated actions, alert user |
| Soil sensor offline | Stop/prevent irrigation, alert user |
| Pump loses connectivity | Log last known state, alert user |
| MQTT broker offline | No new commands, existing device state holds |
| Backend offline | Device-level safety rules remain active |
| Internet failure | Same as backend offline |
| Stale sensor data | Treat as unknown/unsafe |

---

## 9. Runtime Tracking

Track per pump:
- start_time (when pump was last turned ON)
- total_runtime_today (cumulative)
- last_stop_time
- last_stop_reason (manual | safety_cutoff | runtime_limit | automation)
- consecutive_runtime (current continuous running time)

Use consecutive_runtime to enforce Rule S-2.

---

## 10. Manual Override

Manual override allows a user to start/stop a pump regardless of automation
rules. However:

- Safety rules S-1 (critical level cutoff) and S-2 (runtime limit) STILL apply
  during manual operation.
- Safety cutoffs cannot be overridden from the app UI.
- If a user forces a pump ON when safety checks warn (but do not block), log
  the override with user ID and timestamp.

---

## 11. References

- designing-iot-architecture/SKILL.md (device model, cloud/local boundaries)
- engineering-automation-rules/SKILL.md (trigger/condition/action engine)
- integrating-iot-devices/SKILL.md (device state verification, MQTT)
- securing-iot-systems/SKILL.md (command authorization)
- testing-iot-systems/SKILL.md (safety testing, failure scenarios)


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

---
name: engineering-automation-rules
description: >-
  Use this skill when designing, implementing, or debugging the Smart CodeFlurry
  automation engine. Activates for tasks involving rule triggers, condition
  evaluation, AND/OR logic, action execution, scheduling, rule conflict
  detection, idempotency, execution history, or safety validation. Use when the
  user asks to build, extend, or review automation rules or the rule engine
  itself.
---

# Engineering Automation Rules

This skill governs the design and implementation of the Smart CodeFlurry
automation engine. The automation engine follows a WHEN / CONDITIONS / THEN
model and must always prioritize safety, idempotency, and conflict detection.

---

## Quick-Reference Checklist

Before implementing any automation feature:

- [ ] Has the trigger type been defined (device state, sensor, time, schedule)?
- [ ] Have all conditions been documented with their logic operators (AND/OR)?
- [ ] Have all actions been listed with their expected outcomes?
- [ ] Has conflict detection been considered for overlapping rules?
- [ ] Has loop prevention been designed (rules triggering each other)?
- [ ] Is idempotency guaranteed for repeated triggers?
- [ ] Has rate limiting been applied to prevent excessive action execution?
- [ ] Has safety validation been applied for physical-device actions?
- [ ] Has stale telemetry been handled (timestamp check before evaluation)?
- [ ] Has execution history logging been included?

---

## 1. Workflow — Plan ? Validate ? Execute

### Phase 1 — Plan

1. Define the full rule structure: trigger, conditions, actions.
2. Identify all device capabilities and telemetry values involved.
3. Determine evaluation order if multiple rules share the same trigger.
4. Identify potential conflicts with other existing rules.

### Phase 2 — Validate

1. Check for condition logic errors (always-true, always-false conditions).
2. Run conflict analysis: does this rule contradict any existing rule?
3. Check for automation loops (Rule A triggers Rule B which triggers Rule A).
4. Validate that all physical-device actions include safety checks.

### Phase 3 — Execute

1. Implement rule storage, trigger subscription, and execution pipeline.
2. Write unit tests for each trigger type, condition operator, and action.
3. Write integration tests simulating real device state changes.
4. Verify execution history records are created on every rule evaluation.

---

## 2. Automation Rule Model

```
AutomationRule
+-- id              (UUID)
+-- name            (string)
+-- enabled         (boolean)
+-- trigger         (Trigger)
+-- conditions      (ConditionGroup)
+-- actions         (Action[])
+-- schedule        (Schedule, optional)
+-- executionHistory (ExecutionRecord[])
`-- metadata        (created_at, updated_at, created_by)
```

---

## 3. Triggers

Supported trigger types:

| Trigger Type | Description | Example |
|---|---|---|
| device_state | Device capability value changes | pump.power changes to ON |
| sensor_value | Sensor reading crosses a threshold | moisture < 30 |
| time | Specific time of day | every day at 06:00 |
| schedule | Cron-style recurring schedule | every Monday at 08:00 |
| device_online | Device comes online | pump reconnects |
| device_offline | Device goes offline | sensor disconnects |
| telemetry | Continuous sensor reading | level < 15% |

Triggers must NOT fire on stale data. Always validate the timestamp of the
triggering value before executing the evaluation pipeline.

---

## 4. Conditions

### 4.1 Condition Operators

| Operator | Symbol | Applicable Types |
|---|---|---|
| Equals | == | boolean, string, enum |
| Not equals | != | boolean, string, enum |
| Greater than | > | number, percentage |
| Less than | < | number, percentage |
| Greater or equal | >= | number, percentage |
| Less or equal | <= | number, percentage |

### 4.2 Condition Groups

Conditions are grouped with AND/OR logic:

```
ConditionGroup
+-- operator: AND | OR
`-- conditions: (Condition | ConditionGroup)[]
```

Example:

```
AND:
  - soil_moisture < 30%
  - tank_level > 25%
  - sensor.connectionStatus == online
  - pump.connectionStatus == online
```

### 4.3 Condition Validation Rules

- Never evaluate conditions on data older than the defined staleness threshold.
- A condition referencing an offline device must evaluate as FALSE (fail-safe).
- Log the result of every condition group evaluation (true/false + values used).

---

## 5. Actions

Supported action types:

| Action Type | Description |
|---|---|
| set_capability | Set a device capability to a value (e.g., power = ON) |
| delay | Wait N seconds before next action |
| send_notification | Push notification to user(s) |
| execute_scene | Run a saved scene (group of device commands) |

Action execution rules:
- Actions execute in order within a rule.
- If any action fails, log the failure and continue (unless marked critical).
- Physical device actions must receive state confirmation (see integrating-iot-devices).
- Never assume an action succeeded because it was dispatched.

---

## 6. Scheduling

- Schedule-triggered rules must respect the user's configured timezone.
- Store schedules in UTC internally, display in local time to the user.
- Missed schedule executions (due to system downtime) must be handled:
  define catch-up behavior explicitly (execute once, skip, or alert).
- Rate limit: do not allow the same scheduled rule to execute more than once
  within its minimum interval.

---

## 7. Conflict Detection

A conflict exists when two rules could issue contradictory commands to the
same device within a short time window.

Rules for conflict detection:
1. On rule creation or update, scan existing rules for overlapping triggers and
   opposing actions on the same device capability.
2. Warn the user if a conflict is detected. Do NOT silently resolve conflicts.
3. If two rules fire simultaneously, apply priority ordering (user-defined or
   creation-order as tiebreaker).
4. Log conflict events in the execution history.

---

## 8. Loop Prevention

A loop occurs when Rule A triggers Rule B which triggers Rule A (directly
or transitively).

Loop prevention:
1. On rule creation, perform a dependency graph traversal to detect cycles.
2. Reject rule creation if a loop is detected, and explain the conflict.
3. At runtime, track active execution chains and abort if a rule re-enters
   within the same chain.

---

## 9. Idempotency

- A rule must produce the same outcome if it fires multiple times for the same
  trigger event.
- Deduplicate trigger events: if the same event fires within a debounce window,
  evaluate the rule only once.
- Actions that set device state are idempotent by nature (setting power=ON
  twice is safe). Document any exceptions.

---

## 10. Safety Validation

For any action targeting a physical actuator (pump, valve, relay):

1. Verify the target device is online before executing the action.
2. Verify that all safety conditions are currently satisfied.
3. If safety conditions cannot be verified (sensor offline, stale data), ABORT
   the action and send an alert.
4. Log the safety check result alongside the action result.

See managing-water-automation/SKILL.md for pump-specific safety rules.

---

## 11. Execution History

Every rule evaluation must produce an ExecutionRecord:

```
ExecutionRecord
+-- rule_id
+-- triggered_at
+-- trigger_value     (the value that fired the trigger)
+-- conditions_result (each condition evaluated, true/false, value used)
+-- actions_result    (each action, success/failure, device response)
+-- overall_result    (success | partial | failed | aborted)
`-- error             (if applicable)
```

Execution history is used for:
- User-facing audit log
- Debugging rule behavior
- Detecting runaway or looping rules

---

## 12. Error Handling

| Error Scenario | Required Behavior |
|---|---|
| Trigger fires on stale data | Skip evaluation, log warning |
| Device offline during action | Abort action, send notification |
| Sensor data invalid | Fail condition as false, log |
| Rule conflict detected | Warn user, do not silently resolve |
| Loop detected at runtime | Abort chain, log, send alert |
| Action confirmation timeout | Log failure, mark action as failed |

---

## 13. References

- designing-iot-architecture/SKILL.md (device model, service boundaries)
- managing-water-automation/SKILL.md (pump safety rules, irrigation logic)
- integrating-iot-devices/SKILL.md (device state verification)
- securing-iot-systems/SKILL.md (command authorization)


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

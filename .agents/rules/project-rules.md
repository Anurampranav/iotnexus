# Smart CodeFlurry - Project & Execution Rules

These rules apply to all agents working within the Smart CodeFlurry project.
Read and follow them unconditionally before performing any task.

---

## Agent Execution Optimization Policy (Permanent)

### 1. No Artificial Delays & Polling
- NEVER use artificial waiting commands (`Start-Sleep`, `sleep`, or arbitrary delays).
- NEVER use repeated polling loops to wait for process completion.
- Allow background tools or actual command exit codes to report completion naturally.

### 2. Streamlined Command & Tool Usage
- NEVER repeatedly explore the same files or re-run identical tasks.
- NEVER re-run a successful command unless verification explicitly requires it.
- NEVER run unnecessary builds, clean builds, bundle exports, tests, or dependency checks.
- Do NOT run `npx expo export` or Expo bundling commands unless the user's specific request requires JS export.
- Use the minimal set of files, tools, skills, context, and commands required to fulfill the task.

### 3. Fail-Fast Error Resolution
- If a command fails: READ THE ERROR LOG ? IDENTIFY ROOT CAUSE ? APPLY FIX ? RETRY ONCE.
- NEVER blindly re-run a failing command without addressing the root cause.

### 4. Scope & Execution Scoping
- Do NOT activate unrelated skills or subagents.
- Do NOT perform unrelated refactoring, code cleanup, visual polish, optimization, or dependency updates.
- Do NOT ask for user confirmation/permission for routine development, file modifications, builds, or tests. Execute automatically.
- Keep internal execution concise and silent. Avoid verbose step-by-step narration.

### 5. Immediate Termination & Concise Reporting
- Once the requested task is verified, STOP IMMEDIATELY.
- Responses must follow this format:
  STATUS: PASS/FAIL
  RESULT: <one-line summary>
  BLOCKER: <NONE or exact blocker>

---

## Project Identity

Smart CodeFlurry is a universal IoT control and automation platform. It is NOT
a Tuya-only application. It is NOT a water pump app. Tuya and water management
are initial integrations within a broader extensible platform architecture.

---

## Absolute Rules - Never Violate

### Architecture
- The core domain (Device Manager, Automation Engine) must NEVER import from
  or reference integration-specific code (Tuya, MQTT, BLE, Zigbee, Matter).
- All integrations are isolated behind the IntegrationAdapter interface.
- Every device is modeled using the Canonical Device Model.
- The UI and automation engine operate on device CAPABILITIES, not device types.

### Safety
- Pump control is SAFETY-SENSITIVE. Safety rules S-1 through S-4 are mandatory and cannot be overridden.
- Low water level does NOT automatically start the main water supply pump.
- Never issue a physical device command without verifying device connectivity and required safety conditions first.
- Never depend solely on cloud connectivity for safety-critical device cutoffs.

### Integrations & Secrets
- Tuya credentials, API secrets, and sensitive tokens MUST be stored in `secrets.properties` or environment variables, excluded by `.gitignore`, and NEVER committed to source control.
- Never invent API endpoints, SDK methods, or protocol behaviors.

### Security & Design
- Never expose or log credentials, API keys, or tokens.
- Smart CodeFlurry uses the warm-neutral glassmorphism design language.

---

## Skills Reference

Activate the relevant skill only when specialized work requires it:

| Task Type | Skill to Activate |
|---|---|
| Architecture design | designing-iot-architecture |
| Integration development | integrating-iot-devices |
| Automation engine | engineering-automation-rules |
| Water management | managing-water-automation |
| Frontend / UI | designing-iot-interfaces |
| Security | securing-iot-systems |
| Testing | testing-iot-systems |
| External project analysis | analyzing-iot-projects |

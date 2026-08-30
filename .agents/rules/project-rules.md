# Smart CodeFlurry — Project Rules

These rules apply to all agents working within the Smart CodeFlurry project.
Read and follow them unconditionally before performing any task.

---

## Project Identity

Smart CodeFlurry is a universal IoT control and automation platform. It is NOT
a Tuya-only application. It is NOT a water pump app. Tuya and water management
are initial integrations within a broader extensible platform architecture.

---

## Absolute Rules — Never Violate

### Architecture
- The core domain (Device Manager, Automation Engine) must NEVER import from
  or reference integration-specific code (Tuya, MQTT, BLE, Zigbee, Matter).
- All integrations are isolated behind the IntegrationAdapter interface.
- Every device is modeled using the Canonical Device Model (see
  designing-iot-architecture/SKILL.md, Section 5).
- The UI and automation engine operate on device CAPABILITIES, not device types.

### Safety
- Pump control is SAFETY-SENSITIVE. Safety rules S-1 through S-4 in
  managing-water-automation/SKILL.md are mandatory and cannot be overridden.
- Low water level does NOT automatically start the main water supply pump.
  The user is notified and decides manually.
- Never issue a physical device command without verifying device connectivity
  and required safety conditions first.
- Never depend solely on cloud connectivity for safety-critical device cutoffs.

### Integrations
- Never invent API endpoints, SDK methods, or protocol behaviors.
- Always verify official documentation before implementing any integration.
- Tuya credentials, MQTT credentials, and all API keys must be stored in
  environment variables or a secrets manager. Never in source code or frontend.

### Security
- Never expose credentials, API keys, or tokens in frontend source code.
- Never log credentials, tokens, or device secrets.
- TLS is required for all external connections in production.
- Authorization must be checked before every physical device command.

### Design
- Smart CodeFlurry uses the warm-neutral glassmorphism design language.
- Generic purple AI themes, blue SaaS schemes, neon cyan, and violet gradients
  are explicitly rejected.
- See designing-iot-interfaces/SKILL.md, Section 2 for the full specification.

### Testing
- Physical device commands must be verified by state confirmation, not just
  by successful command dispatch.
- All safety rules must have automated tests for: normal, boundary, critical,
  and sensor-failure scenarios.

---

## Development Scope — Current Phase

The project is in **implementation and verification** phase.
The React Native / Expo application, Android native layer, and Tuya integration
are actively under development. Agents are authorized to build, test, and deploy
when instructed or when required to complete an assigned task.

---

## Build Execution Policy

These rules govern all build, install, and verification operations.

1. **A build is a single finite process.** It starts, runs, and exits.
   - `BUILD SUCCESS` = process exited with code 0.
   - `BUILD FAILURE` = process exited with non-zero code.
   - Once either state occurs, **STOP**.

2. **Never start a second build while one build is active.**

3. **Never use timers, polling, `whenTaskAdded` hooks, `Start-Sleep`, background
   loops, or "continue" cycles to determine build completion.** Detect completion
   from the actual process exit status and terminal output.

4. **Never report "build running" after the terminal has returned to the shell prompt.**

5. **Never automatically issue another build after a failure.** Diagnose first,
   then perform at most one deliberate retry when the root cause is identified
   and fixed.

6. **Do not ask for permission for each command.** Continue autonomously until
   the current finite task is complete.

7. **Do not modify unrelated files to work around a build error.** Fix the
   actual root cause.

---

## Skills Reference

Always activate the relevant skill before beginning specialized work:

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

---

## Agent Coordination Hierarchy

```
                 iot-architect
                       |
       .---------------+----------------.
       |               |                |
       v               v                v
iot-integration   automation       water-systems
   engineer        engineer          engineer
       |               |                |
       `---------------+----------------'
                       |
                       v
              iot-frontend-designer
                       |
              .---------+---------.
              v                   v
       iot-security           iot-qa
        reviewer              engineer
```

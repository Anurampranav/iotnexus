# Smart CodeFlurry — .agents Directory

This directory contains the authoritative Antigravity Skills, Agents, and Rules for the Smart CodeFlurry IoT platform.

---

## Directory Structure

```
.agents/
+-- rules/
|   `-- project-rules.md          <- Project-wide rules & Build Execution Policy (always active)
+-- skills/
|   +-- smartcodeflurry/
|   |   `-- SKILL.md              <- Authoritative development, diagnosis, and anti-loop skill
|   +-- designing-iot-architecture/
|   |   `-- SKILL.md              <- IoT system architecture skill
|   +-- integrating-iot-devices/
|   |   `-- SKILL.md              <- IoT integration adapter skill
|   +-- engineering-automation-rules/
|   |   `-- SKILL.md              <- Automation engine skill
|   +-- managing-water-automation/
|   |   `-- SKILL.md              <- Water management & safety skill
|   +-- designing-iot-interfaces/
|   |   `-- SKILL.md              <- Frontend design skill
|   +-- securing-iot-systems/
|   |   `-- SKILL.md              <- IoT security skill
|   +-- testing-iot-systems/
|   |   `-- SKILL.md              <- IoT testing skill
|   `-- analyzing-iot-projects/
|       `-- SKILL.md              <- External project analysis skill
`-- agents/
    +-- iot-architect.md          <- Senior IoT systems architect
    +-- iot-integration-engineer.md <- IoT integration specialist
    +-- automation-engineer.md    <- Automation engine specialist
    +-- water-systems-engineer.md <- Water automation & safety specialist
    +-- iot-frontend-designer.md  <- Premium IoT UI/UX designer
    +-- iot-security-reviewer.md  <- IoT security specialist
    `-- iot-qa-engineer.md        <- QA & reliability engineer
```

---

## Skills

| Skill | Purpose |
|---|---|
| smartcodeflurry | Authoritative development, diagnosis, build policy, and Tuya integration |
| designing-iot-architecture | System architecture, service boundaries, device abstraction |
| integrating-iot-devices | Integration adapters: Tuya, MQTT, Matter, Zigbee, BLE, ESP32 |
| engineering-automation-rules | Automation engine: triggers, conditions, actions, safety |
| managing-water-automation | Water system: pumps, sensors, irrigation, safety rules |
| designing-iot-interfaces | Frontend: warm-neutral glassmorphism, capability-driven UI |
| securing-iot-systems | Authentication, authorization, secrets, TLS, audit logging |
| testing-iot-systems | Unit, integration, E2E, failure injection, safety testing |
| analyzing-iot-projects | External repo/SDK/API analysis before reuse |

---

## Important Rules Summary

1. Always inspect CURRENT state first and diagnose before changing code.
2. No execution loops, no timers, no background polling, and no automatic retry builds.
3. At most ONE controlled build and ONE runtime verification per fix.
4. Pump control is SAFETY-SENSITIVE. Safety rules S-1 to S-4 are mandatory.
5. All devices use the Canonical Device Model.
6. The core domain NEVER imports from integration adapters directly.
7. Credentials must never appear in source code or frontend bundles. Keep AppSecret strictly private.
8. When a requested task is complete, STOP immediately.
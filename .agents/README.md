# Smart CodeFlurry — .agents Directory

This directory contains the reusable Antigravity Skills and Agents for the
Smart CodeFlurry IoT platform project.

---

## Directory Structure

```
.agents/
+-- rules/
|   `-- project-rules.md          <- Project-wide rules (always active)
+-- skills/
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
| designing-iot-architecture | System architecture, service boundaries, device abstraction |
| integrating-iot-devices | Integration adapters: Tuya, MQTT, Matter, Zigbee, BLE, ESP32 |
| engineering-automation-rules | Automation engine: triggers, conditions, actions, safety |
| managing-water-automation | Water system: pumps, sensors, irrigation, safety rules |
| designing-iot-interfaces | Frontend: warm-neutral glassmorphism, capability-driven UI |
| securing-iot-systems | Authentication, authorization, secrets, TLS, audit logging |
| testing-iot-systems | Unit, integration, E2E, failure injection, safety testing |
| analyzing-iot-projects | External repo/SDK/API analysis before reuse |

---

## Agents

| Agent | Role |
|---|---|
| iot-architect | Platform architecture, technology decisions, ADRs |
| iot-integration-engineer | Integration adapters, capability mapping |
| automation-engineer | Rule engine, scheduling, conflict/loop detection |
| water-systems-engineer | Water sensors, pump safety, irrigation automation |
| iot-frontend-designer | Premium UI, design system, capability components |
| iot-security-reviewer | Security reviews, credential audit, threat modeling |
| iot-qa-engineer | Test strategy, device simulation, safety validation |

---

## Agent Coordination

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

---

## Important Rules

These rules apply to all agents in this project. See rules/project-rules.md
for the full set.

1. The core domain NEVER imports from integration adapters directly.
2. All devices use the Canonical Device Model.
3. Pump control is SAFETY-SENSITIVE. Safety rules S-1 to S-4 are mandatory.
4. Low water level does NOT automatically start the pump.
5. Never invent API endpoints or SDK behaviors.
6. Credentials must never appear in source code or frontend bundles.
7. TLS is mandatory for all production connections.
8. Physical device commands require state confirmation — not just dispatch.

---

## Current Project Phase

AI development environment setup only.
The application has not been built yet. Do not build it until instructed.

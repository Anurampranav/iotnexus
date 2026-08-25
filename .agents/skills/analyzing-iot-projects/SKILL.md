---
name: analyzing-iot-projects
description: >-
  Use this skill when analyzing an existing IoT repository, SDK, API, or
  open-source project before reuse in Smart CodeFlurry. Activates for tasks
  involving repository inspection, license review, architecture analysis,
  dependency analysis, README-vs-code verification, security review, and
  compatibility assessment. Use when the user wants to evaluate whether an
  existing project, library, or API can be safely adopted, adapted, or
  referenced. README claims must never be assumed to equal actual implementation.
---

# Analyzing IoT Projects

This skill governs the analysis of external IoT repositories, SDKs, APIs, and
open-source projects before any adoption decision is made for Smart CodeFlurry.
Assumptions derived from README files or documentation must always be verified
against the actual source code and license.

---

## Critical Analysis Declaration

README claims are marketing, not guarantees.
Always inspect actual source code, test files, license, and dependency
declarations before recommending reuse of any external project.

---

## Quick-Reference Checklist

Before recommending any external project for adoption:

- [ ] Has the license been identified and confirmed to be compatible?
- [ ] Has the actual source code been inspected (not just the README)?
- [ ] Have all README feature claims been verified against the code?
- [ ] Have all dependencies been reviewed for known vulnerabilities?
- [ ] Has the architecture been analyzed for compatibility with Smart CodeFlurry?
- [ ] Has the security posture been evaluated (credentials, auth, TLS)?
- [ ] Has the project's maintenance status been assessed?
- [ ] Have integration risks and migration paths been documented?

---

## 1. Workflow — Plan ? Validate ? Execute

### Phase 1 — Plan

1. Identify the purpose of the analysis: what is being considered for reuse?
2. Identify the specific components of interest (hardware firmware, SDK, API,
   protocol implementation, reference architecture, etc.).
3. Gather the repository URL, license file location, and documentation links.

### Phase 2 — Validate

1. Inspect the license (Section 2).
2. Verify README claims (Section 3).
3. Analyze the architecture (Section 4).
4. Review dependencies (Section 5).
5. Evaluate security (Section 6).
6. Assess compatibility (Section 7).

### Phase 3 — Execute

1. Write an analysis report documenting findings from each section.
2. State a clear recommendation: adopt as-is, adapt, use as reference only,
   or reject.
3. List any risks that must be mitigated before adoption.

---

## 2. License Inspection

Inspect the LICENSE file directly — do not rely on README license badges alone.

| License Type | Commercial Use | Copyleft | Typical Action |
|---|---|---|---|
| MIT | Yes | No | Generally safe to adopt |
| Apache 2.0 | Yes | No | Generally safe to adopt |
| GPL v2 / v3 | Yes (with conditions) | Yes (strong) | Verify copyleft impact on proprietary code |
| LGPL | Yes (with conditions) | Weak | May link without copyleft if used as library |
| AGPL | Yes (with conditions) | Yes (network) | High risk for SaaS/networked applications |
| BSL / SSPL | Limited | Yes | Review carefully for SaaS use |
| Proprietary | No | N/A | Reject unless licensed |
| No license | No | N/A | Reject — all rights reserved by default |

Questions to answer:
- What exactly is the license?
- Does it permit commercial use?
- Does it require source disclosure for derivative works?
- Does it require attribution? What form?
- Are there any additional terms beyond the main license?

---

## 3. README vs. Code Verification

For each feature claim in the README, verify:

1. Does corresponding implementation code exist?
2. Is the implementation complete or partial/stub?
3. Are there tests that validate the claimed behavior?
4. Are there known issues or PRs indicating the feature is broken?
5. Was the feature present in recent commits or only in older branches?

Document each claim as: VERIFIED / PARTIAL / UNVERIFIED / INCORRECT.

Example (for ESP32 Irrigation Automation project):
- README claims: MQTT support ? Verify by finding MQTT publish/subscribe calls in source.
- README claims: OTA update ? Verify by finding OTA handler in firmware code.
- README claims: Soil moisture ? Verify sensor reading code and calibration logic.

---

## 4. Architecture Analysis

Questions to answer:

1. What is the overall architecture? (monolith, microservices, firmware, library)
2. What protocols does it use? (MQTT, HTTP, BLE, Zigbee, etc.)
3. How are devices abstracted? Is there a capability model?
4. What is the data model? Is it compatible with Smart CodeFlurry's canonical
   device model?
5. What is the configuration mechanism? (hardcoded, environment, runtime)
6. How does it handle offline/failure scenarios?
7. Is the code structured for extension, or is it tightly coupled?

---

## 5. Dependency Analysis

1. List all direct dependencies (package.json, requirements.txt, platformio.ini,
   CMakeLists.txt, etc.).
2. Check each dependency for:
   - Known security vulnerabilities (CVE database, npm audit, pip audit)
   - License compatibility
   - Maintenance status (last commit, issue responsiveness)
   - Version pinning (are versions locked, or floating?)
3. Identify transitive dependencies of concern.

---

## 6. Security Evaluation

Evaluate:

- How are credentials handled? (hardcoded, environment, certificate)
- Is communication encrypted? (TLS, HTTPS, encrypted MQTT)
- Are there any obvious injection vulnerabilities?
- Does the project log sensitive data?
- Is authentication present for any remote access features?
- Are there any known CVEs associated with the project or its dependencies?

Flag any hardcoded credentials, plain-text MQTT, or no authentication as
HIGH RISK findings that must be resolved before adoption.

---

## 7. Compatibility Assessment

Assess compatibility with Smart CodeFlurry's architecture:

| Dimension | Question |
|---|---|
| Protocol | Does it use a protocol Smart CodeFlurry supports or plans to support? |
| Device model | Can its device abstraction map to the Canonical Device Model? |
| Integration boundary | Can it be wrapped in an IntegrationAdapter cleanly? |
| Data formats | Are payload formats compatible or easily transformed? |
| Runtime environment | Does it target the same platform (Node.js, Python, ESP-IDF, etc.)? |
| License | Is the license compatible with Smart CodeFlurry's licensing model? |

---

## 8. Analysis Report Format

Produce a structured report with:

```
Project: [name and URL]
Analyzed at: [timestamp]
Analyst: [agent or user]

## License
[License name, compatibility assessment, risks]

## README Claims vs. Reality
[Table: claim | status | evidence]

## Architecture Summary
[Architecture description, compatibility assessment]

## Dependencies
[List of notable dependencies, vulnerability findings]

## Security Findings
[Findings, severity (HIGH/MEDIUM/LOW/INFO), recommendation]

## Compatibility Assessment
[Protocol, device model, integration boundary assessment]

## Recommendation
ADOPT AS-IS | ADAPT | REFERENCE ONLY | REJECT

## Required Actions Before Adoption
[List of conditions that must be met before any code is used]
```

---

## 9. Reference Projects

### ESP32 Irrigation Automation

URL: https://github.com/lrswss/esp32-irrigation-automation

Potential areas of interest:
- ESP32 firmware patterns for soil moisture and water level sensing
- MQTT topic structure for irrigation control
- Pump control and safety logic
- OTA update mechanism
- Scheduling implementation
- Logging approach

MANDATORY before recommending reuse of this project:
1. Inspect and confirm the license.
2. Verify MQTT, OTA, and sensor claims against source code.
3. Review security: are credentials hardcoded? Is TLS used?
4. Assess whether the architecture is compatible with Smart CodeFlurry's
   integration adapter pattern.
5. Document any legal conditions for use.

---

## 10. References

- designing-iot-architecture/SKILL.md (canonical device model, adapter pattern)
- integrating-iot-devices/SKILL.md (integration requirements)
- securing-iot-systems/SKILL.md (security evaluation criteria)


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

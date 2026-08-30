---
name: smartcodeflurry
description: Authoritative development skill for Smart CodeFlurry IoT platform. Governs engineering workflows, diagnosis protocols, anti-loop rules, Tuya integration, and single-execution verification standards.
---

# Smart CodeFlurry — Authoritative Development Skill

This skill governs all development, diagnosis, building, Tuya integration, and verification tasks in the Smart CodeFlurry project.

---

## 1. Core Workflow & Anti-Loop Policy

1. **Inspect Current State First**:
   - ALWAYS inspect the actual current project files, configuration, and terminal status before taking any action.
   - Never assume past changes or previous agent statements are accurate without verifying current disk state.

2. **Diagnose Before Changing**:
   - Identify the FIRST real error from compiler logs, Gradle outputs, or Android Logcat before making any edits.
   - Never guess, speculate, or make unrelated code changes.

3. **No Execution Loops & No Timers**:
   - **NEVER** run commands in a loop.
   - **NEVER** retry the same failed command automatically.
   - **NEVER** use timers (`schedule`), sleep/wait cycles (`Start-Sleep`), polling loops, background status monitors, or `whenTaskAdded` hooks.
   - **NEVER** automatically start another build after a build finishes.

4. **Autonomous Execution Without Interruption**:
   - **NEVER** ask the user for permission between normal execution steps (file reading, editing, building, diagnostic checks).
   - **NEVER** ask the user to repeatedly paste prompts or confirm routine actions.
   - Proceed autonomously until the requested finite task is complete.

5. **Minimal Scoped Changes**:
   - Make the smallest, most targeted code or configuration change required to solve the verified root cause.
   - **NEVER** modify unrelated files or infrastructure.
   - **NEVER** redesign or refactor working code unless explicitly requested by the user.

6. **Strict Single-Build & Single-Test Limits**:
   - Run at most **ONE** controlled build after applying a fix.
   - Run at most **ONE** controlled runtime/device verification when required.
   - If verification fails, **STOP immediately** and report the exact error instead of retrying or modifying other files.

7. **Strict Stop Condition**:
   - Once the user's requested task is complete, **STOP**.
   - Do NOT continue with "while waiting...", "check again...", "build again...", "verify again...", or any speculative actions.

8. **Secrets & Security**:
   - Always keep sensitive credentials such as `AppSecret` out of logs, reports, responses, and git-tracked files.

---

## 2. Tuya SDK & Smart Life Integration Rules

1. **Existing Application Context**:
   - Smart CodeFlurry uses the existing Tuya SmartLife App SDK integration within the Nexus Tuya application.
   - Do NOT create another Tuya app or cloud project.
   - Package Name / Application ID: `com.smartcodeflurry.app` (Strictly enforced across AndroidManifest.xml, build.gradle, and platform configuration).
   - Tuya SDK Version: `7.8.0`.

2. **Credential Handling**:
   - AppKey and AppSecret belong to the Android Mobile App SDK configuration in the Tuya Developer Platform.
   - Credentials flow strictly through git-ignored `secrets.properties` -> `BuildConfig` -> `ThingHomeSdk.init()`.
   - Never print or expose `AppSecret` in chat output, reports, or artifacts.

3. **Diagnosis & Runtime Separation**:
   - Separate build errors (Gradle/CMake/snapshotting) from runtime Tuya errors (`IllegalArgumentException`, network, auth).
   - A successful Gradle build does NOT prove Tuya runtime initialization works.
   - Do NOT repeatedly rebuild when diagnosing Tuya runtime initialization. Diagnose directly from the exact Logcat stack trace and runtime configuration assets.

4. **Device Discovery & Activation Flow**:
   - Discovery launches native Smart-Life style nearby scanning (`ThingHomeSdk.getBleOperator().startLeScan()`).
   - Discovered devices are displayed dynamically with signal/status.
   - Selecting a device stops scanning and provisions via `ActivatorBuilder` with `IThingSmartActivatorListener`.

---

## 3. Standard Task Report Format

At the end of every task, provide only:

1. **WHAT WAS INSPECTED**: Verified files and runtime state.
2. **WHAT WAS CHANGED**: Exact file(s) modified and reason.
3. **VERIFICATION RESULT**: PASS/FAIL with concrete evidence (exit code, APK path, or exact error).
4. **REMAINING BLOCKER**: Exact blocker if any, or NONE.
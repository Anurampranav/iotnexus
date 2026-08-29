---
name: smartcodeflurry-tuya
description: Controls all Tuya and Smart Life device integration, pairing, SDK initialization, credential verification, and runtime diagnostics in Smart CodeFlurry. Enforces strict engineering build limits, anti-loop safeguards, and exact Smart Life device discovery flows.
---

# Smart CodeFlurry Tuya & Smart Life Integration Skill

This skill governs all Tuya SDK, Smart Life pairing, device discovery, credential management, and runtime diagnostic workflows within the Smart CodeFlurry repository.

## 1. Engineering Workflow & Anti-Loop Safeguards

1. **Strict Build Limits**:
   - Perform thorough diagnosis and configuration verification **BEFORE** starting any build.
   - Build at most **ONCE** per completed fix.
   - Install and test at most **ONCE** after a build.
   - **NEVER** repeatedly run Gradle, CMake, npm, Expo, or APK builds.

2. **Error Resolution & Stop Criteria**:
   - **NEVER** retry the same failed operation more than **ONCE**.
   - If the exact same error appears **TWICE**, **STOP immediately** and perform root cause diagnosis.
   - Do NOT ask for permission before ordinary project operations (file inspection, code edits, diagnostic checks).
   - Do NOT modify unrelated Gradle, CMake, or native infrastructure merely because a build is slow or snapshotting fails.

3. **Stop & Report Protocol**:
   Immediately stop and report if:
   - The same error occurs twice.
   - Required Tuya credentials are missing or unverified.
   - Package name / applicationId cannot be verified.
   - A required Tuya SDK/BizBundle API does not exist in the installed version.
   - A build exceeds reasonable execution time without progress.
   - A proposed fix requires altering unrelated native infrastructure.

   **Standard Stop Report Format**:
   - **ROOT CAUSE**: Clear statement of the verified failure cause.
   - **WHAT WAS VERIFIED**: Evidence gathered from code, configs, or logs.
   - **WHAT WAS CHANGED**: List of files updated.
   - **WHAT REMAINS**: Outstanding blockers or missing inputs.
   - **NEXT SINGLE ACTION**: The exact next step to execute.

---

## 2. Tuya Credentials & Configuration Rules

1. **Credential Source Mapping**:
   - Mobile SDK Initialization **MUST** use the Android **AppKey** and **AppSecret** belonging to the Android App configured in the Tuya Developer Console under package `com.smartcodeflurry.app`.
   - **NEVER** substitute Tuya Cloud Access ID / Client ID (`8d9dveg3...`), Cloud Access Secret, or Cloud Project Code (`p178765...`) into `ThingHomeSdk.init()`.

2. **Mandatory Pre-Build Verification Check**:
   Before initiating any build, verify consistency across:
   - `android/secrets.properties` (`TUYA_APP_KEY`, `TUYA_APP_SECRET`)
   - Root `secrets.properties`
   - `android/gradle.properties` (`TUYA_APP_KEY`, `TUYA_APP_SECRET`)
   - `app/build.gradle` (`applicationId`, `buildConfigField`, `manifestPlaceholders`)
   - `MainApplication.kt` (`ThingHomeSdk.init(this, BuildConfig.TUYA_APP_KEY, BuildConfig.TUYA_APP_SECRET)`)
   - `AndroidManifest.xml` (`package="com.smartcodeflurry.app"`)

3. **Runtime Credentials Exception Handling**:
   - If Logcat outputs `IllegalArgumentException: The app key, app secret or packageName does not match the configuration on the platform`:
     - **DO NOT** modify UI or device discovery code.
     - Treat strictly as a credential/configuration mismatch between local files, packaged APK assets, and the Tuya Developer Console.
     - Trace credential propagation from source files -> `BuildConfig` -> `ThingHomeSdk.init()` -> Logcat.

---

## 3. Smart Life Style Device Discovery & Activation

1. **Target User Flow**:
   - **Devices Screen** -> **+ ADD DEVICE**
   - Automatically launch Tuya Smart-Life-style nearby device discovery (BLE / Wi-Fi EZ / AP).
   - Display discovered nearby Tuya devices.
   - User taps discovered device.
   - Collect Wi-Fi credentials when required.
   - Provision / activate device using official Tuya SDK / BizBundle.
   - Associate device with user's Tuya Home context (`HomeBean`).
   - Return to Devices tab with newly registered device.

2. **API Verification & Compliance**:
   - Use official APIs provided by the installed Tuya SDK / BizBundle versions (`thingsmart:7.8.0`, `thingsmart-bizbundle-device_activator:7.8.0`).
   - **NEVER** guess or invent Tuya SDK classes, methods, delegates, or router URLs.
   - Inspect actual installed dependencies in `app/build.gradle` before invoking native APIs.
   - If an API is missing from the installed version, **STOP** and report the version mismatch.

3. **Discovery Callback Verification**:
   Ensure end-to-end verification of:
   - Discovery start command
   - Nearby device discovered callback
   - Captured device information (`ScanDeviceBean`, BLE/Wi-Fi signal)
   - Selection and provisioning sequence
   - Activation result callback (`onSuccess` / `onError`)
   - Device list state refresh

---

## 4. Build, Verification & Success Criteria

1. **Build Policy**:
   - Step 1: Complete diagnosis first.
   - Step 2: Code / configuration fix second.
   - Step 3: Verify static files third.
   - Step 4: Run **ONE** release build.
   - Step 5: Perform **ONE** install & Logcat runtime test.
   - Step 6: Stop and report runtime status.

2. **Definition of Success**:
   - **NEVER** treat a successful Gradle build as proof that Tuya works.
   - True success requires:
     1. `ThingHomeSdk` initializes cleanly with zero credential/domain exceptions in Logcat.
     2. Tapping **+ ADD DEVICE** launches the Smart Life discovery view.
     3. Nearby Tuya devices are automatically scanned and listed.
     4. A real Tuya device can complete provisioning and pairing into the user's home context.

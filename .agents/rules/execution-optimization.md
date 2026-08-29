# Agent Execution Optimization Policy

This rule governs all agent interactions in the Smart CodeFlurry project.

## Rules

1. **No Artificial Delays**: Never run `Start-Sleep`, `sleep`, or artificial wait loops. Rely on natural command execution exit codes.
2. **Minimal Tool & File Calls**: Read only necessary files. Do not repeat successful commands.
3. **No Unnecessary Builds**: Do not run `assembleRelease`, `expo export`, or full Gradle builds unless specifically requested.
4. **Single-Attempt Diagnostic Repair**: On failure, read full error -> fix cause -> retry once.
5. **Autonomy**: Execute routine file operations, builds, and code updates automatically without asking for user permission.
6. **Concise Output**: Keep responses concise and formatted as:
   STATUS: PASS/FAIL
   RESULT: <one-line summary>
   BLOCKER: <NONE or exact blocker>

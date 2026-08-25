---
name: securing-iot-systems
description: >-
  Use this skill when designing, implementing, or reviewing any security aspect
  of Smart CodeFlurry. Activates for tasks involving authentication,
  authorization, API security, MQTT security, device credentials, Tuya
  credentials, secrets management, TLS configuration, user permissions, command
  authorization, audit logging, or rate limiting. Use when the user asks to
  implement any feature that involves credentials, access control, or sensitive
  data. Also use when reviewing code for security vulnerabilities.
---

# Securing IoT Systems

This skill governs security design and implementation for Smart CodeFlurry.
IoT systems have a uniquely large attack surface: cloud APIs, device protocols,
mobile apps, backend services, and physical actuators. Security must be
a first-class concern from day one, not retrofitted later.

---

## Critical Security Declarations

- NEVER expose credentials in frontend source code.
- NEVER log API keys, tokens, passwords, or device secrets.
- NEVER store secrets in version control.
- NEVER transmit credentials over unencrypted channels.
- NEVER trust device-reported identity without verification.
- Physical device commands require authorization even from authenticated users.

---

## Quick-Reference Checklist

Before implementing any security-sensitive feature:

- [ ] Are all credentials stored in environment variables or a secrets manager?
- [ ] Is no credential present in source code, git history, or frontend bundles?
- [ ] Is TLS enforced on all external connections (API, MQTT, webhooks)?
- [ ] Is every API endpoint protected with authentication?
- [ ] Is authorization checked before every physical device command?
- [ ] Is rate limiting applied on authentication and command endpoints?
- [ ] Is audit logging enabled for all authentication and command events?
- [ ] Have user permissions been scoped to the minimum necessary?

---

## 1. Workflow — Plan ? Validate ? Execute

### Phase 1 — Plan

1. Identify all data flows that involve credentials or sensitive data.
2. Identify all entry points (API endpoints, MQTT topics, webhooks).
3. Design the authentication and authorization model for each entry point.
4. Plan secrets management approach (environment variables, vault, secrets manager).

### Phase 2 — Validate

1. Scan for credentials in source code using secrets detection tools.
2. Verify that every API route has authentication middleware applied.
3. Verify that authorization checks are present for device commands.
4. Verify that TLS is configured on all network connections.

### Phase 3 — Execute

1. Implement authentication and authorization.
2. Configure TLS on all services.
3. Set up audit logging.
4. Run SAST/secrets scanning in CI pipeline.

---

## 2. Authentication

### 2.1 User Authentication (Mobile/Web)

- Use industry-standard protocols: OAuth 2.0 with PKCE, or OpenID Connect.
- Never implement custom password hashing unless using an established library
  (bcrypt, Argon2).
- Store refresh tokens securely (encrypted storage, not localStorage for web).
- Implement token expiry and rotation.
- Implement logout that invalidates tokens server-side.

### 2.2 Device Authentication (MQTT / Custom Devices)

- Each device must have a unique credential (certificate, pre-shared key, or
  device-specific username/password).
- Never use shared credentials across multiple devices.
- Use TLS client certificates where supported by the MQTT broker.
- Rotate device credentials on re-provisioning.

### 2.3 Integration Authentication (Tuya, APIs)

- Store API keys, OAuth tokens, and client secrets ONLY in environment variables
  or a secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault, .env not
  committed to git).
- Never pass integration credentials to the frontend.
- Implement token refresh before expiry.
- Log token refresh failures (not the tokens themselves).

---

## 3. Authorization

### 3.1 User Permission Model

Define roles at minimum:

| Role | Permissions |
|---|---|
| Owner | Full control: manage devices, automations, users, settings |
| Admin | Manage devices, automations; cannot manage other users |
| Member | Control devices, view automations; cannot edit automations |
| Viewer | Read-only: view device states, history |

### 3.2 Command Authorization

Before executing any physical device command (pump ON, valve open, etc.):
1. Verify the requesting user has the Member role or above.
2. Verify the device belongs to the user's home.
3. Log the command with: user_id, device_id, capability, value, timestamp.
4. Apply rate limiting (see Section 6).

Pump commands must also pass safety validation (see managing-water-automation).

### 3.3 Automation Authorization

- Automations execute with the permission level of their creator.
- If the creator's permissions are revoked, automations created by that user
  must be paused until reviewed by an Owner.

---

## 4. API Security

- All API endpoints must require authentication (no anonymous device control).
- Use HTTPS only (HTTP must redirect to HTTPS or be disabled entirely).
- Implement CORS policy: whitelist known origins, do not use wildcard (*) for
  authenticated endpoints.
- Validate all input: reject unexpected fields, validate types and ranges.
- Return generic error messages to clients; log full details server-side.
- Do not expose internal stack traces, database errors, or file paths in
  API responses.

---

## 5. MQTT Security

- Use TLS (port 8883) for all MQTT connections. Never use plain MQTT (port 1883)
  in production.
- Each device authenticates with a unique credential.
- Use MQTT ACLs to restrict each device to its own topic subtree:
  ```
  Device may publish to:   smartcodeflurry/{home_id}/{device_id}/state
  Device may publish to:   smartcodeflurry/{home_id}/{device_id}/telemetry
  Device may subscribe to: smartcodeflurry/{home_id}/{device_id}/command
  ```
- The backend may subscribe to all topics within a home.
- Clients (mobile/web) may NOT connect directly to MQTT; route through backend.
- Validate all incoming MQTT payloads before processing.

---

## 6. Rate Limiting

Apply rate limits to:
- Authentication endpoints (login, token refresh): 5–10 requests per minute per IP.
- Device command endpoints: 30 commands per minute per user.
- Automation execution: configurable maximum per rule per time window.
- API endpoints: tier-based limits appropriate to expected usage.

---

## 7. Secrets Management

| Secret Type | Storage |
|---|---|
| Database credentials | Environment variable / secrets manager |
| Tuya API key / secret | Secrets manager (never in source code) |
| MQTT broker credentials | Secrets manager / device certificate store |
| JWT signing secret | Secrets manager |
| Push notification keys | Secrets manager |
| Device provisioning tokens | Secrets manager |

Rules:
- Never commit .env files to version control. Add .env to .gitignore.
- Rotate secrets when team members leave.
- Audit secret access logs regularly.

---

## 8. Audit Logging

Log the following events with: timestamp, user_id, device_id (if applicable),
action, result (success/failure), source IP:

- User login (success and failure)
- User logout
- Token refresh
- Device command executed
- Automation rule created/edited/deleted
- Device added/removed
- User role changed
- Security event (rate limit exceeded, invalid token, etc.)

Audit logs must be:
- Append-only (not editable by application)
- Retained for a minimum defined period (e.g., 90 days)
- Stored separately from application logs

---

## 9. TLS Configuration

- Minimum TLS version: TLS 1.2. Prefer TLS 1.3.
- Disable weak cipher suites.
- Use certificates from a trusted CA (Let's Encrypt is acceptable for development).
- Enable HSTS for web endpoints.
- Verify certificate chains in all outbound connections (do NOT disable TLS
  verification for "convenience").

---

## 10. Threat Model — IoT-Specific Concerns

| Threat | Mitigation |
|---|---|
| Credential leak in frontend bundle | Keep all secrets server-side only |
| MQTT broker unauthorized access | TLS + per-device ACLs + auth |
| Replay attack on device commands | Include command nonce and timestamp; reject old commands |
| Stale sensor data used for unsafe decision | Timestamp validation on all sensor reads |
| Unauthorized pump control | Role check + device ownership check + rate limiting |
| Automation loop causing runaway commands | Loop detection in automation engine |
| API scraping | Rate limiting + auth on all endpoints |

---

## 11. References

- designing-iot-architecture/SKILL.md (service boundaries, cloud/local)
- integrating-iot-devices/SKILL.md (credential isolation in adapters)
- managing-water-automation/SKILL.md (pump command authorization)
- engineering-automation-rules/SKILL.md (automation authorization)
- testing-iot-systems/SKILL.md (security testing)


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

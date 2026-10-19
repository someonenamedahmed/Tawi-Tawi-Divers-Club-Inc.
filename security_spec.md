# Security Specification & Threat Audit Matrix

## 1. Data Invariants
1. **User Identity Isolation**: An interaction document at `/users/{userId}/interactions/{interactionId}` must have `userId == request.auth.uid`, and only that user or a verified Super Administrator (`aibrahim_220000002077@uic.edu.ph`) may read it.
2. **Horizontal Privilege Escalation Prevention**: User A cannot read, create, update, or delete `/users/{userB}` or `/users/{userB}/interactions/{interactionId}`.
3. **Super Administrator Boundary**: Only the verified Super Administrator (`aibrahim_220000002077@uic.edu.ph` with `email_verified == true`) can write to `/company_benchmarks/{benchmarkId}`.
4. **Audit Benchmark Availability**: Authenticated users can read company benchmarks as reference guidelines for quality evaluation and AI grounding, but cannot modify them.
5. **Role Tampering Guard**: Users cannot elevate their own role to `isSuperAdmin: true` unless verified as the bootstrapped super admin.
6. **Data Size Integrity**: Document string fields have strict length checks (e.g., interaction prompt <= 10,000 characters, response <= 20,000 characters) preventing Denial of Wallet (DoW) attacks.

## 2. The "Dirty Dozen" Threat Payloads
1. **Cross-Tenant Interaction Injection**: Attacker B writes to `/users/{userA}/interactions/int-1` with `userId = "userB"`. Expected: `PERMISSION_DENIED`.
2. **Cross-Tenant Interaction Theft**: Attacker B executes `get` on `/users/{userA}/interactions/int-1`. Expected: `PERMISSION_DENIED`.
3. **Unauthenticated Read on User Profiles**: Unauthenticated client reads `/users/{userA}`. Expected: `PERMISSION_DENIED`.
4. **Unauthenticated Interaction Write**: Unauthenticated client sends write to `/users/{any}/interactions/new`. Expected: `PERMISSION_DENIED`.
5. **Unauthorized Benchmark Mutation**: Non-admin authenticated user attempts write to `/company_benchmarks/std-1`. Expected: `PERMISSION_DENIED`.
6. **Email Spoofing Attack**: Attacker crafts token with `email = "aibrahim_220000002077@uic.edu.ph"` but `email_verified = false` attempting admin write. Expected: `PERMISSION_DENIED`.
7. **Privilege Self-Escalation**: Regular user writes `isSuperAdmin: true` into their own `/users/{userId}` record. Expected: `PERMISSION_DENIED`.
8. **Denial of Wallet Payload**: Attacker sends a 15MB prompt string to `/users/{userId}/interactions/{id}` violating length bounds. Expected: `PERMISSION_DENIED`.
9. **Malicious ID Injection**: Attacker targets document path with invalid character sequences e.g. `/users/../admin` or path poisoning. Expected: `PERMISSION_DENIED`.
10. **Shadow Field Injection**: Incoming update tries to inject arbitrary undefined fields into interaction records. Expected: `PERMISSION_DENIED`.
11. **Foreign UID Ownership Masquerading**: User creates an interaction record where `userId` does not match `request.auth.uid`. Expected: `PERMISSION_DENIED`.
12. **Blanket Collection Scanning**: Unauthenticated or unauthorized user performs unconstrained `list` query across `/users` or all interaction subcollections. Expected: `PERMISSION_DENIED`.

## 3. Test Runner Specification (`firestore.rules.test.ts`)
The test runner asserts that all 12 adversarial vectors are rejected with `PERMISSION_DENIED` by the Firestore ruleset, enforcing zero-trust attribute-based access control.

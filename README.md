# Tawi-Tawi Divers Club Inc. - Quality, Safety & Audit Platform

Tawi-Tawi Divers Club Inc. operates a premier enterprise-grade, user-authenticated quality auditing and maritime dive safety reflection platform powered by Google Gemini (with an automated fallback ladder starting at `gemini-3.6-flash`), Firebase Authentication (Google SSO), and Cloud Firestore with strict Attribute-Based Access Control (ABAC) security rules.

---

## Architecture Overview

1. **Authentication & Identity**: Google Sign-In via Firebase Auth for divemasters, boat captains, compressor technicians, and eco-guides. No raw passwords or user credentials stored locally.
2. **Database Persistence & Isolation**: Cloud Firestore with owner-bound security rules (`/users/{userId}/interactions/{interactionId}`) isolating staff submissions, and role-based permissions granting the designated Super Administrator (`aibrahim_220000002077@uic.edu.ph`) cross-organization quality audit review capabilities.
3. **Maritime & Dive Safety Grounding**: Pre-loaded with PADI / ISO 24803 Recreational Diving Safety Standards, Bauer Compressor Air Purity SOPs, Philippine Coast Guard Vessel Protocols, and Tawi-Tawi Marine Sanctuary Environmental Policies.
4. **Resilient Gemini Fallback Ladder**:
   - Primary: `gemini-3.6-flash`
   - High-Availability Fallback: `gemini-3.1-flash-lite`
   - Dynamic Alias: `gemini-flash-latest`
   - Deep Reasoning Fallback: `gemini-3.7-flash`
   - Error Recovery Matrix automatically catches `503`, `429`, `404`, and `500` status codes and transitions sequentially.
5. **Zero-Crash Payload Hygiene**: Recursive undefined-stripping (`sanitizeFirestorePayload`) and explicit save retry controls guaranteeing transactional verification between user input and Gemini responses.

---

## 1. Prerequisites & Google Cloud APIs

Ensure the following Google Cloud APIs are enabled in your GCP project:
- Cloud Run API (`run.googleapis.com`)
- Secret Manager API (`secretmanager.googleapis.com`)
- Cloud Firestore API (`firestore.googleapis.com`)
- Cloud Build API (`cloudbuild.googleapis.com`)

```bash
# Set your active GCP project
gcloud config set project YOUR_PROJECT_ID

# Enable required Google Cloud services
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com
```

---

## 2. Secret Management Setup

Gemini API keys must never be hardcoded or bundled into client code. Store the key in Secret Manager:

```bash
# 1. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Grant the default Cloud Run service account access to read the secret
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 3. Database Security Configuration (Cloud Firestore)

Deploy the owner-bound security rules enforcing user data isolation and super administrator access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

To deploy the complete fortress ruleset:
```bash
firebase deploy --only firestore:rules
```

---

## 4. Cloud Run Deployment Flow

Build and deploy the unified full-stack Node.js / Express server to Google Cloud Run:

```bash
gcloud run deploy aegis-audit-ai \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --set-env-vars="NODE_ENV=production,PORT=3000"
```

---

## 5. Required Campaign Labeling (Automated Challenge Verification)

Apply the mandatory challenge verification label to your deployed Cloud Run service:

```bash
gcloud run services update aegis-audit-ai \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 6. Functional Verification & Test Walkthrough

Follow these concrete steps to verify each user flow:

### Test Case 1: Google SSO & Landing Page
1. Visit the app root URL.
2. Verify the Landing Page renders with feature pillars and "Sign In with Google SSO" button.
3. Click "Sign In with Google SSO" and complete authentication.
4. Verify user is authenticated and redirected to the dashboard.

### Test Case 2: Professional Profile Setup
1. Upon initial login, confirm the Profile Setup modal opens automatically.
2. Click one of the quick presets (e.g., "Senior QA Engineer") or enter custom Role, Department, and Job Description.
3. Click "Save Professional Profile".
4. Confirm profile data is saved to `/users/{userId}` and displayed in the dashboard header.

### Test Case 3: Quality Audit Multi-Turn Interaction
1. Select the focus category (e.g., "Difficulties & Bottlenecks").
2. Click a suggested starter prompt or type an operational challenge.
3. Click "Submit for Quality Audit".
4. Verify Gemini responds via the fallback ladder with:
   - Analytical reflection grounded in employee role and company standards.
   - Root cause analysis and brainstorming ideas.
   - Synthesized executive takeaway and sentiment tag.
   - Action items list.
5. Verify both user prompt and Gemini output are persisted to `/users/{userId}/interactions/{interactionId}`.

### Test Case 4: User Data Isolation Verification
1. Sign in as Employee A, submit an audit entry.
2. Sign in as Employee B on another session.
3. Confirm Employee B's "My Audit Vault" only displays their own entries and cannot see Employee A's records.

### Test Case 5: Super Administrator Governance
1. Sign in as `aibrahim_220000002077@uic.edu.ph`.
2. Confirm the "Super Admin" badge appears and the "Super Admin Console" toggle is available.
3. Go to "Company Standards & Rubrics", upload or seed a standard (e.g. ISO 9001).
4. Go to "Cross-User Audit Results" and verify all employee submissions across departments are viewable.
5. Go to "AI Executive Synthesis" and click "Generate Executive Synthesis" to review cross-company health metrics.

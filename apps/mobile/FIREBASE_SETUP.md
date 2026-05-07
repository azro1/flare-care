# Firebase (Android / FCM)

One-time setup for push notifications on this Expo app.

## What we did

1. **Created a new Firebase project** in [Firebase Console](https://console.firebase.google.com/) (dedicated project for mobile push).

2. **Registered the Android app** in that project:
   - Package name: **`com.flarecare.mobile`** (must match `app.json` → `android.package`).

3. **Downloaded `google-services.json`** from Firebase: **Project settings → Your apps →** the Android app → **Download Google services file**.

4. **Placed the file here** (this folder, next to `app.json`):

   - **`google-services.json`**

5. **Expo config** expects that path (`app.json`):

   ```json
   "android.googleServicesFile": "./google-services.json"
   ```

After this, rebuild the Android dev client / store build so native Gradle picks up the file (see root `MOBILE_MIGRATION_RUNBOOK.md`).

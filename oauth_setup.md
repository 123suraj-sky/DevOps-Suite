# Google OAuth2 Setup Guide - DevOps Suite

This guide explains how to set up Google OAuth2 credentials and configure the `auth-service` for Google Login.

---

## 🛠️ Step 1: Obtain Credentials from Google Cloud Console

1. Go to the **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Create a new project or select an existing one.
3. Navigate to **APIs & Services > Credentials**.
4. Click **Configure Consent Screen**:
   * Select **External** user type.
   * Fill in the application name (e.g., `DevOps Suite`) and developer email.
   * Save and continue to scopes (you can leave scopes default or request `openid`, `email`, `profile`).
5. Go back to the **Credentials** tab:
   * Click **Create Credentials** and select **OAuth client ID**.
   * Under **Application type**, choose **Web application**.
   * Add a name (e.g., `DevOps Suite Frontend`).
   * **Authorized JavaScript origins**: `http://localhost:5173` (Vite Frontend URL).
   * **Authorized redirect URIs**: `http://localhost:8081/login/oauth2/code/google` (Default Spring Security OAuth client redirect URI).
6. Click **Create** to obtain your:
   * **Client ID**
   * **Client Secret**

---

## ⚙️ Step 2: Configure Environment Variables

For the backend to pick up the credentials, set these variables in your running environment or add them to the local docker environment:

### Method A: Environment File (.env)
Add them to the `.env` file at the root of the project:
```bash
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Method B: OS Environment Variables (Windows PowerShell)
Before running the `auth-service`, run the following commands:
```powershell
$env:GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
$env:GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

---

## 🔍 Step 3: Verification
Once the environment variables are set and the backend is running:
1. Try signing in with Google via the React UI.
2. The browser will redirect to Google's sign-in consent page.
3. Upon successful login, you will be redirected back to the app with a valid JWT token.

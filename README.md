# SSO Login Implementation Guide

## Overview

This repository demonstrates a complete **Single Sign-On (SSO)** implementation using **ForgeRock OpenAM** with **OAuth2/OIDC** authentication protocol. The implementation uses **PKCE (Proof Key for Code Exchange)** for enhanced security and follows industry best practices.

**Key Features:**

- 🔐 Automatic redirect to SSO login page on app startup
- 🔑 OAuth2/OIDC authentication with PKCE security
- 🛡️ Protected routes that require authentication
- 💾 Automatic token management and storage
- 🔄 CSRF protection with state parameter
- 🚪 Secure logout functionality

---

## Architecture

### Authentication Flow

The application follows the **OAuth2 Authorization Code Flow with PKCE**:

```
┌─────────┐                        ┌──────────────┐                        ┌──────────┐
│ Browser │                        │ React App    │                        │ ForgeRock│
└────┬────┘                        └──────┬───────┘                        └────┬─────┘
     │                                     │                                     │
     │  1. App Starts                      │                                     │
     │────────────────────────────────────>│                                     │
     │                                     │                                     │
     │  2. Check Authentication            │                                     │
     │<────────────────────────────────────│                                     │
     │                                     │                                     │
     │  3. Not Authenticated               │                                     │
     │                                     │  4. Generate PKCE Values            │
     │                                     │  (code_verifier, code_challenge)    │
     │                                     │                                     │
     │  5. Redirect to Authorization       │                                     │
     │────────────────────────────────────>│────────────────────────────────────>│
     │                                     │  6. Authorization Request           │
     │                                     │  (with code_challenge)              │
     │                                     │                                     │
     │                                     │  7. Show Login Page                 │
     │                                     │<────────────────────────────────────│
     │                                     │                                     │
     │  8. User Enters Credentials         │                                     │
     │────────────────────────────────────>│────────────────────────────────────>│
     │                                     │                                     │
     │  9. Authorization Code Returned     │                                     │
     │<────────────────────────────────────│<────────────────────────────────────│
     │                                     │                                     │
     │ 10. Exchange Code for Tokens        │                                     │
     │────────────────────────────────────>│────────────────────────────────────>│
     │                                     │  11. Token Exchange Request         │
     │                                     │  (with code_verifier)               │
     │                                     │                                     │
     │ 12. Access Token Received           │                                     │
     │<────────────────────────────────────│<────────────────────────────────────│
     │                                     │                                     │
     │ 13. Fetch User Info                 │                                     │
     │────────────────────────────────────>│────────────────────────────────────>│
     │                                     │                                     │
     │ 14. User Authenticated              │                                     │
     │<────────────────────────────────────│<────────────────────────────────────│
     │                                     │                                     │
```

---

## Implementation Details

### Technology Stack

- **React** 18.2.0 - UI framework
- **@forgerock/javascript-sdk** 4.8.2 - ForgeRock SDK for authentication
- **react-router-dom** 6.10.0 - Routing and navigation
- **OAuth2/OIDC** - Authentication protocol
- **PKCE** - Security extension for public clients

### Core Concepts

1. **OAuth2 Authorization Code Flow**: Industry-standard flow for client applications
2. **PKCE (Proof Key for Code Exchange)**: Security extension that prevents authorization code interception
3. **OpenID Connect (OIDC)**: Identity layer on top of OAuth2 that provides user information
4. **Context API**: React context for global authentication state management
5. **Protected Routes**: Route guards that require authentication

---

## Step-by-Step Setup Guide

### Prerequisites

1. **Node.js** (v14 or higher)
2. **ForgeRock OpenAM Server** with OAuth2/OIDC configured
3. **OAuth2 Client** registered in ForgeRock with:
   - Client ID
   - Redirect URI: `http://localhost:3000/callback`
   - PKCE enabled
   - Grant Type: `authorization_code`
   - Response Type: `code`
   - Scopes: `openid profile email`

### Installation

#### Step 1: Install Dependencies

```bash
npm install @forgerock/javascript-sdk react-router-dom
```

#### Step 2: Configure ForgeRock Settings

Create or update `src/config/forgerock.js`:

```javascript
const forgerockOpenAMConfig = {
  clientId: "your-client-id",
  redirectUri: "http://localhost:3000/callback",
  scope: "openid profile email",
  serverConfig: {
    baseUrl: "https://your-forgerock-server.com/sso",
    realmPath: "your-realm-name",
    timeout: 30000,
  },
};

export const forgerockConfig = forgerockOpenAMConfig;
export const providerName = "ForgeRock OpenAM";
export default forgerockConfig;
```

**Important Configuration Parameters:**

| Parameter     | Description                                | Example                            |
| ------------- | ------------------------------------------ | ---------------------------------- |
| `clientId`    | Your OAuth2 client ID from ForgeRock       | `"reactClientPKCE"`                |
| `redirectUri` | Must exactly match ForgeRock configuration | `"http://localhost:3000/callback"` |
| `scope`       | OAuth2 scopes for requested user info      | `"openid profile email"`           |
| `baseUrl`     | Base URL of your ForgeRock server          | `"https://server.com/sso"`         |
| `realmPath`   | Realm path in ForgeRock                    | `"wfcnhes"`                        |

#### Step 3: Setup Authentication Context

Create `src/context/AuthContext.js` (see [Code Structure](#code-structure) section for complete implementation).

#### Step 4: Wrap Your App with AuthProvider

In `src/App.js` or `src/index.js`:

```javascript
import { AuthProvider } from "./context/AuthContext";
import { BrowserRouter } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>{/* Your app routes */}</AuthProvider>
    </BrowserRouter>
  );
}
```

#### Step 5: Setup Routes

Create routes with protected route wrapper:

```javascript
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/auth/LoginPage";
import WelcomePage from "./pages/welcomePage";

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/callback" element={<Callback />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>
    </Routes>
  );
}
```

---

## Code Structure

### 1. Authentication Context (`src/context/AuthContext.js`)

The core authentication manager that handles:

#### Key Functions

**`initializeForgeRock()`**

- Fetches OpenID Connect well-known configuration
- Configures ForgeRock SDK
- Handles OAuth callback with authorization code
- Manages token exchange and storage

**`login()`**

- Generates PKCE values (code_verifier and code_challenge)
- Constructs authorization URL with all required parameters
- Redirects user to ForgeRock login page

**`loadUserInfo()`**

- Fetches user information from UserInfo endpoint
- Updates authentication state

**`logout()`**

- Clears all tokens and storage
- Logs out from ForgeRock server
- Redirects to login page

#### PKCE Implementation

```javascript
// Generate Code Verifier (random string)
const generateCodeVerifier = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
};

// Generate Code Challenge (SHA-256 hash of verifier)
const generateCodeChallenge = async (verifier) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
};
```

#### Token Exchange

```javascript
// Exchange authorization code for access token
const tokenResponse = await fetch(tokenEndpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization: `Basic ${btoa(`${clientId}:`)}`, // Basic Auth for public client
    Accept: "application/json",
  },
  body: new URLSearchParams({
    grant_type: "authorization_code",
    code: authorizationCode,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier, // PKCE verifier
  }),
});
```

### 2. Configuration File (`src/config/forgerock.js`)

Centralized configuration for ForgeRock settings:

```javascript
const forgerockOpenAMConfig = {
  clientId: "reactClientPKCE",
  redirectUri: "http://localhost:3000/callback",
  scope: "openid profile email",
  serverConfig: {
    baseUrl: "https://wfcssodev1.nhes.nh.gov/sso",
    realmPath: "wfcnhes",
    timeout: 30000,
  },
};
```

### 3. Protected Route Component (`src/components/ProtectedRoute.jsx`)

Route guard that protects routes requiring authentication:

```javascript
const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />; // Render protected route
};
```

### 4. Login Page (`src/pages/auth/LoginPage.js`)

Shows loading state while redirecting to SSO:

```javascript
const LoginPage = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div>
      <h2>Redirecting to login...</h2>
    </div>
  );
};
```

---

## Authentication Flow Details

### Step 1: Application Initialization

When the app starts:

1. **AuthContext** initializes ForgeRock SDK
2. Fetches OpenID Connect well-known configuration:
   ```
   GET {baseUrl}/oauth2/realms/root/realms/{realmPath}/.well-known/openid-configuration
   ```
3. Extracts endpoints:
   - `authorization_endpoint`
   - `token_endpoint`
   - `userinfo_endpoint`
   - `end_session_endpoint`

### Step 2: Authorization Request

When user is not authenticated:

1. Generate PKCE values:

   - `code_verifier`: Random 32-byte string (base64url encoded)
   - `code_challenge`: SHA-256 hash of verifier (base64url encoded)

2. Store `code_verifier` and `state` in localStorage

3. Build authorization URL:

   ```
   {authorization_endpoint}?
     client_id={clientId}
     &redirect_uri={redirectUri}
     &response_type=code
     &scope={scope}
     &state={state}
     &code_challenge={codeChallenge}
     &code_challenge_method=S256
     &prompt=login
   ```

4. Redirect user to ForgeRock login page

### Step 3: User Authentication

User enters credentials on ForgeRock login page.

### Step 4: Authorization Code Callback

After successful authentication:

1. ForgeRock redirects to: `{redirectUri}?code={authCode}&state={state}`

2. App extracts `code` and `state` from URL

3. Validates `state` parameter (CSRF protection)

4. Retrieves stored `code_verifier` from localStorage

### Step 5: Token Exchange

Exchange authorization code for tokens:

```javascript
POST {token_endpoint}
Headers:
  Content-Type: application/x-www-form-urlencoded
  Authorization: Basic {base64(clientId:)}
  Accept: application/json
Body:
  grant_type=authorization_code
  &code={authorizationCode}
  &redirect_uri={redirectUri}
  &code_verifier={codeVerifier}
```

**Response:**

```json
{
  "access_token": "...",
  "id_token": "...",
  "refresh_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### Step 6: Store Tokens

Store tokens in ForgeRock SDK's TokenStorage:

```javascript
await TokenStorage.set({
  accessToken: tokenData.access_token,
  idToken: tokenData.id_token,
  refreshToken: tokenData.refresh_token,
  expiresIn: tokenData.expires_in,
  tokenType: tokenData.token_type,
});
```

### Step 7: Fetch User Info

Get user information:

```javascript
GET {userinfo_endpoint}
Headers:
  Authorization: Bearer {access_token}
```

**Response:**

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "name": "John Doe",
  ...
}
```

### Step 8: Update Authentication State

Set user as authenticated and redirect to protected route.

---

## Security Features

### 1. PKCE (Proof Key for Code Exchange)

- **Prevents authorization code interception**
- **Code Verifier**: Random 32-byte string stored in browser
- **Code Challenge**: SHA-256 hash sent in authorization request
- **Verification**: Server validates verifier matches challenge

### 2. CSRF Protection

- **State Parameter**: Random string generated per request
- **Validation**: Server returns same state, app verifies it matches
- **Prevention**: Blocks unauthorized authorization code usage

### 3. Secure Token Storage

- Tokens stored in ForgeRock SDK's secure storage
- PKCE values stored in localStorage (cleared after use)
- State parameter stored temporarily

### 4. Token Validation

- Checks token expiration before granting access
- Validates tokens by calling UserInfo endpoint
- Automatically redirects to login if tokens are invalid

### 5. Protected Routes

- Route guards prevent unauthorized access
- Validates authentication before rendering
- Redirects unauthenticated users to login

---

## Key Components Explained

### AuthContext

**Purpose**: Central authentication state management

**Exports**:

- `AuthProvider`: Context provider component
- `useAuth`: Hook to access auth state and methods

**State**:

- `isAuthenticated`: Boolean indicating auth status
- `isLoading`: Boolean for loading state
- `user`: User object with profile information
- `email`: User email address

**Methods**:

- `login()`: Initiate SSO login flow
- `logout()`: Sign out user
- `checkAuthentication()`: Verify current auth status

### ProtectedRoute

**Purpose**: Route guard for protected pages

**Behavior**:

- Shows loading spinner while validating
- Redirects to `/login` if not authenticated
- Renders child routes if authenticated

### LoginPage

**Purpose**: Entry point for unauthenticated users

**Behavior**:

- Automatically triggers SSO redirect via `AuthContext`
- Shows loading message during redirect
- Redirects to home if already authenticated

---

## How to Use in Components

### Accessing Authentication State

```javascript
import { useAuth } from "../context/AuthContext";

function MyComponent() {
  const { isAuthenticated, user, email, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <h1>Welcome, {user.name || email}!</h1>
    </div>
  );
}
```

### Manual Login Trigger

```javascript
import { useAuth } from "../context/AuthContext";

function LoginButton() {
  const { login } = useAuth();

  return <button onClick={login}>Login with SSO</button>;
}
```

### Logout Functionality

```javascript
import { useAuth } from "../context/AuthContext";

function LogoutButton() {
  const { logout } = useAuth();

  return <button onClick={logout}>Logout</button>;
}
```

---

## Adapting for Other Projects

### Step 1: Copy Core Files

Copy these files to your project:

1. `src/context/AuthContext.js` - Authentication logic
2. `src/config/forgerock.js` - Configuration (update values)
3. `src/components/ProtectedRoute.jsx` - Route guard

### Step 2: Update Configuration

Modify `src/config/forgerock.js` with your ForgeRock server details:

```javascript
const forgerockOpenAMConfig = {
  clientId: "your-client-id", // Update
  redirectUri: "http://your-app/callback", // Update
  scope: "openid profile email", // Update if needed
  serverConfig: {
    baseUrl: "https://your-server.com", // Update
    realmPath: "your-realm", // Update
    timeout: 30000,
  },
};
```

### Step 3: Install Dependencies

```bash
npm install @forgerock/javascript-sdk react-router-dom
```

### Step 4: Wrap App with AuthProvider

```javascript
import { AuthProvider } from "./context/AuthContext";

function App() {
  return <AuthProvider>{/* Your app */}</AuthProvider>;
}
```

### Step 5: Setup Routes

Use `ProtectedRoute` to protect routes:

```javascript
<Route element={<ProtectedRoute />}>
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/profile" element={<Profile />} />
</Route>
```

### Step 6: Update Redirect URI

Ensure your redirect URI matches in:

- `src/config/forgerock.js` (client-side)
- ForgeRock server configuration (server-side)

**Critical**: The redirect URI must match exactly, including protocol (`http` vs `https`), domain, and path.

---

## Troubleshooting

### Issue 1: "Redirect URI mismatch" Error

**Problem**: Redirect URI doesn't match ForgeRock configuration.

**Solution**:

1. Check `redirectUri` in `src/config/forgerock.js`
2. Verify it matches exactly in ForgeRock server config
3. Ensure protocol, domain, and path are identical

**Example**:

```javascript
// ✅ Correct
redirectUri: "http://localhost:3000/callback";

// ❌ Wrong - trailing slash
redirectUri: "http://localhost:3000/callback/";

// ❌ Wrong - different protocol
redirectUri: "https://localhost:3000/callback";
```

### Issue 2: "400 Bad Request" on Token Exchange

**Problem**: Token exchange request fails.

**Possible Causes**:

1. **Missing or invalid `code_verifier`**: PKCE verifier not stored or retrieved correctly
2. **Mismatched `redirect_uri`**: Different from authorization request
3. **Invalid authorization code**: Code expired or already used
4. **Missing Basic Auth header**: Required for public clients

**Solution**:

1. Check browser console for specific error message
2. Verify `code_verifier` is stored in localStorage before redirect
3. Ensure `redirect_uri` is identical in both requests
4. Verify Basic Auth header format: `Basic ${btoa(clientId:)}`

### Issue 3: Not Redirecting to Login Page

**Problem**: App doesn't automatically redirect to SSO.

**Solution**:

1. Verify `AuthProvider` wraps your app
2. Check `initializeForgeRock` is called on mount
3. Ensure no existing valid tokens in storage
4. Check browser console for errors

### Issue 4: "Invalid state parameter" Error

**Problem**: State validation fails after callback.

**Possible Causes**:

1. State not stored before redirect
2. State cleared from localStorage
3. Multiple tabs causing state conflict

**Solution**:

1. Verify state is stored: `localStorage.setItem("oauth_state", state)`
2. Check state persists through redirect
3. Clear localStorage if testing multiple times
4. Use sessionStorage instead of localStorage if needed

### Issue 5: CORS Errors

**Problem**: Cross-Origin Resource Sharing errors.

**Solution**:

1. Configure CORS on ForgeRock server
2. Add your domain to allowed origins
3. Include credentials if needed

### Issue 6: Well-known Configuration Fails

**Problem**: Cannot fetch OpenID Connect configuration.

**Solution**:

1. Verify `baseUrl` and `realmPath` are correct
2. Check well-known URL format:
   ```
   {baseUrl}/oauth2/realms/root/realms/{realmPath}/.well-known/openid-configuration
   ```
3. Ensure ForgeRock server is accessible
4. Check network connectivity

---

## Environment Variables (Optional)

For production deployments, use environment variables:

```javascript
// src/config/forgerock.js
const forgerockOpenAMConfig = {
  clientId: process.env.REACT_APP_CLIENT_ID || "default-client-id",
  redirectUri:
    process.env.REACT_APP_REDIRECT_URI || "http://localhost:3000/callback",
  scope: process.env.REACT_APP_SCOPE || "openid profile email",
  serverConfig: {
    baseUrl: process.env.REACT_APP_BASE_URL || "https://server.com/sso",
    realmPath: process.env.REACT_APP_REALM_PATH || "realm",
    timeout: 30000,
  },
};
```

Create `.env` file:

```env
REACT_APP_CLIENT_ID=your-client-id
REACT_APP_REDIRECT_URI=http://localhost:3000/callback
REACT_APP_SCOPE=openid profile email
REACT_APP_BASE_URL=https://your-server.com/sso
REACT_APP_REALM_PATH=your-realm
```

---

## Production Considerations

### 1. HTTPS Required

- Use HTTPS in production
- Update `redirectUri` to use `https://`
- Ensure ForgeRock server uses HTTPS

### 2. Secure Token Storage

- Consider using secure, httpOnly cookies for tokens (backend required)
- Implement token refresh mechanism
- Add token expiration handling

### 3. Error Handling

- Implement comprehensive error boundaries
- Show user-friendly error messages
- Log errors for debugging (without sensitive data)

### 4. Performance

- Cache well-known configuration
- Implement token refresh before expiration
- Optimize re-renders with React.memo

### 5. Security Headers

Add security headers in production:

```javascript
// In your server configuration or meta tags
<meta http-equiv="Content-Security-Policy" content="...">
```

---

## API Reference

### AuthContext Methods

#### `login()`

Initiates SSO login flow by redirecting to ForgeRock.

```javascript
const { login } = useAuth();
await login();
```

#### `logout()`

Signs out user and clears all tokens.

```javascript
const { logout } = useAuth();
await logout();
```

#### `checkAuthentication()`

Verifies current authentication status.

```javascript
const { checkAuthentication } = useAuth();
await checkAuthentication();
```

### AuthContext State

```javascript
const {
  isAuthenticated, // boolean
  isLoading, // boolean
  user, // object | null
  email, // string
} = useAuth();
```

---

## Testing Checklist

- [ ] App redirects to SSO on startup when not authenticated
- [ ] Authorization URL contains all required parameters
- [ ] PKCE code_verifier and code_challenge are generated correctly
- [ ] State parameter is validated on callback
- [ ] Token exchange succeeds with correct parameters
- [ ] Tokens are stored securely
- [ ] User info is fetched successfully
- [ ] Protected routes redirect to login when not authenticated
- [ ] Logout clears all tokens and redirects
- [ ] Existing valid tokens prevent unnecessary redirects
- [ ] Error handling works for network failures
- [ ] CORS is configured correctly

---

## Additional Resources

- [ForgeRock JavaScript SDK Documentation](https://backstage.forgerock.com/docs/sdks/latest/javascript/)
- [OAuth 2.0 Specification](https://oauth.net/2/)
- [PKCE Specification](https://oauth.net/2/pkce/)
- [OpenID Connect Specification](https://openid.net/connect/)

---

## License

This implementation is provided as a reference guide for implementing SSO authentication in React applications using ForgeRock OpenAM.

---

## Support

For issues or questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review ForgeRock SDK documentation
3. Verify server configuration matches client configuration
4. Check browser console for detailed error messages

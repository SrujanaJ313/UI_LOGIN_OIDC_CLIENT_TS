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
- **oidc-client-ts** 3.3.0 - OIDC client for authentication
- **@forgerock/javascript-sdk** 4.8.2 - ForgeRock SDK
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
npm install
```

#### Step 2: Configure ForgeRock Settings

Update `src/config/forgerock.js` with your specific ForgeRock instance details:

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
```

#### Step 3: Run the Application

```bash
npm start
```

---

## Code Structure

### 1. Authentication Context (`src/context/AuthContext.js`)

The core authentication manager that handles the OIDC flow using `oidc-client-ts`.

**Key Functions:**

- **`initializeOidc()`**:
  - Fetches OpenID Connect well-known configuration
  - Initializes the `UserManager`
  - Handles OAuth callback (`signinRedirectCallback`)
  - Manages token exchange and user session

- **`login()`**:
  - Triggers the redirect to the Identity Provider (`signinRedirect`)

- **`logout()`**:
  - Clears local session and redirects to the Identity Provider's logout endpoint (`signoutRedirect`)

- **`checkAuthentication()`**:
  - Verifies if the user has a valid session
  - Attempts silent renewal if the token is expired

### 2. Configuration File (`src/config/forgerock.js`)

Centralized configuration for ForgeRock settings.

### 3. Protected Route Component (`src/components/ProtectedRoute.jsx`)

Route guard that protects routes requiring authentication. It checks the `isAuthenticated` state from `AuthContext` and redirects unauthenticated users to the login page.

---

## Troubleshooting

### Issue 1: "Redirect URI mismatch" Error

**Problem**: Redirect URI doesn't match ForgeRock configuration.

**Solution**:
1. Check `redirectUri` in `src/config/forgerock.js`
2. Verify it matches exactly in ForgeRock server config
3. Ensure protocol, domain, and path are identical

### Issue 2: "400 Bad Request" on Token Exchange

**Problem**: Token exchange request fails.

**Possible Causes**:
1. **Missing or invalid `code_verifier`**: PKCE verifier not stored or retrieved correctly
2. **Mismatched `redirect_uri`**: Different from authorization request

**Solution**:
1. Check browser console for specific error message
2. Ensure `redirect_uri` is identical in both requests

### Issue 3: Not Redirecting to Login Page

**Problem**: App doesn't automatically redirect to SSO.

**Solution**:
1. Verify `AuthProvider` wraps your app
2. Check `initializeOidc` is called on mount
3. Check browser console for errors

---

## Environment Variables (Optional)

For production deployments, use environment variables:

```env
REACT_APP_CLIENT_ID=your-client-id
REACT_APP_REDIRECT_URI=http://localhost:3000/callback
REACT_APP_SCOPE=openid profile email
REACT_APP_BASE_URL=https://your-server.com/sso
REACT_APP_REALM_PATH=your-realm
```

# React MSL Application

## Overview

This React application implements OAuth2/OIDC authentication using the ForgeRock JavaScript SDK (now Ping SDK). The application supports **both PingOne and ForgeRock OpenAM** as identity providers, configurable via environment variable.

**Key Features:**
- Supports both **PingOne** and **ForgeRock OpenAM** authentication
- Automatic provider selection based on `REACT_APP_IS_FORGE_ROCK_LIVE` environment variable
- PKCE (Proof Key for Code Exchange) flow for secure authentication
- Provider-specific optimizations (iframe handling, logout flows, etc.)

## Code Flow Overview

This section explains how the authentication flow works from file to file, making it easy for new developers to understand the codebase structure.

### Application Initialization Flow

**Entry Point: `src/index.js`**
- React application entry point
- Renders the root `App` component wrapped in `BrowserRouter` for routing

**Main App Component: `src/App.jsx`**
- Wraps the application with `AuthProvider` (from `src/context/AuthContext.js`)
- Provides authentication context to all child components
- Sets up routing using `AppRoutes` component

**Routes Configuration: `src/routes/index.js`**
- Defines all application routes
- Public routes: `/login`, `/callback`
- Protected routes: `/`, `/homePage` (wrapped in `ProtectedRoute` component)

**Authentication Context: `src/context/AuthContext.js`**
- **Initialization (`useEffect` hook)**: 
  - Loads configuration from `src/config/forgerock.js`
  - Calls `Config.setAsync()` to configure the ForgeRock SDK with PingOne settings
  - Checks if user is returning from OAuth callback (looks for `code` and `state` in URL)
  - If callback detected: exchanges authorization code for tokens
  - If no callback: checks for existing tokens in storage
- **State Management**: Maintains `isAuthenticated`, `user`, `email`, and `isLoading` states
- **Exports**: `login()`, `logout()`, `checkAuthentication()`, and authentication state

**Configuration: `src/config/forgerock.js`**
- Contains PingOne OAuth2 configuration:
  - Client ID
  - Redirect URI
  - Scopes (including required `revoke` scope)
  - Well-known endpoint URL
  - Timeout settings

### Login Flow

**1. User Clicks Login Button**
- **File**: `src/pages/auth/LoginPage.js`
- User clicks "Sign in with PingOne" button
- Calls `login()` function from `useAuth()` hook

**2. Login Function Execution**
- **File**: `src/context/AuthContext.js` → `login()` function
- Attempts to use `TokenManager.getTokens({ login: "redirect" })` to trigger OAuth redirect
- If SDK redirect doesn't work, falls back to manual redirect:
  - Fetches well-known configuration from PingOne
  - Constructs authorization URL with PKCE parameters
  - Generates code verifier and challenge
  - Stores PKCE values in sessionStorage
  - Redirects browser to PingOne authorization server using `window.location.href`

**3. User Authenticates on PingOne**
- Browser redirects to PingOne authorization server
- User enters credentials and authenticates
- PingOne validates authentication

**4. PingOne Redirects Back**
- PingOne redirects back to `http://localhost:3000` (configured redirect URI)
- URL contains `code` (authorization code) and `state` (CSRF protection) query parameters

### Callback Handling Flow

**1. Callback Detection**
- **File**: `src/context/AuthContext.js` → `initializeForgeRock()` function
- Checks URL for `code` and `state` parameters
- If found, triggers callback handling

**2. Token Exchange**
- **File**: `src/context/AuthContext.js` → callback handler
- Calls `OAuth2Client.getTokens()` to exchange authorization code for tokens
- SDK automatically handles PKCE code verifier verification
- Receives access token, ID token, and refresh token

**3. User Information Loading**
- **File**: `src/context/AuthContext.js` → `loadUserInfo()` function
- Calls `UserManager.getCurrentUser()` to fetch user profile
- Extracts user information (email, name, etc.)
- Updates authentication state: sets `isAuthenticated = true`, stores user data

**4. Navigation to Welcome Page**
- **File**: `src/context/AuthContext.js` → callback handler
- Cleans up URL by removing query parameters
- Navigates to `/` (root route) using React Router's `navigate()` function

**5. Protected Route Access**
- **File**: `src/components/ProtectedRoute.jsx`
- Checks `isAuthenticated` state from `AuthContext`
- If authenticated: validates token by calling `UserManager.getCurrentUser()`
- If valid: renders `WelcomePage` component
- If not authenticated: redirects to `/login`

**6. Welcome Page Rendering**
- **File**: `src/pages/welcomePage.jsx`
- Displays welcome message and user information
- Renders `MainLayout` component which includes the Header

**7. Header Component**
- **File**: `src/pages/MainLayout/Header/index.js`
- Uses `useAuth()` hook to get user information
- Displays user name/email in the header
- Provides logout functionality

### Logout Flow

**1. User Clicks Logout**
- **File**: `src/pages/MainLayout/Header/index.js` → `handleLogout()` function
- Calls `logout()` function from `useAuth()` hook

**2. Logout Execution**
- **File**: `src/context/AuthContext.js` → `logout()` function
- Calls `FRUser.logout({ logoutRedirectUri: window.location.origin })`
- SDK handles:
  - Token revocation on PingOne server
  - Session termination
  - Redirect back to application

**3. State Cleanup**
- **File**: `src/context/AuthContext.js` → `logout()` function
- Clears local authentication state:
  - Sets `isAuthenticated = false`
  - Clears `user` and `email` state
- PingOne redirects back to application root

**4. Re-authentication Required**
- User is now unauthenticated
- Any attempt to access protected routes redirects to login page

### Protected Route Access Flow

**1. User Navigates to Protected Route**
- **File**: `src/components/ProtectedRoute.jsx`
- Component checks authentication status from `AuthContext`

**2. Authentication Check**
- If `isLoading = true`: Shows loading state ("Verifying access...")
- If `isAuthenticated = false`: Redirects to `/login`
- If `isAuthenticated = true`: Validates token with `UserManager.getCurrentUser()`

**3. Token Validation**
- If token is valid: Renders protected content (`<Outlet />`)
- If token is invalid: Redirects to `/login`

**4. Content Rendering**
- Protected route content (e.g., `WelcomePage`) is rendered
- User can interact with authenticated features

## Authentication Architecture

### High-Level Flow

1. **Application Startup**
   - Application initializes React Router
   - `AuthProvider` wraps the application and initializes ForgeRock SDK
   - SDK configuration is loaded from `src/config/forgerock.js`
   - System checks for existing authentication or OAuth callback

2. **Authentication Process**
   - User clicks login button on `LoginPage`
   - Application redirects to PingOne authorization server
   - User authenticates on PingOne
   - PingOne redirects back with authorization code
   - Application exchanges code for tokens
   - User information is loaded and stored
   - User is redirected to welcome page

3. **Token Management**
   - Tokens are managed by ForgeRock SDK's `TokenManager`
   - Access tokens are stored securely by the SDK
   - User information is extracted from ID token via `UserManager`
   - Token validation happens automatically on protected route access

## Configuration Files

### PingOne Configuration: `src/config/forgerock.js`

This file contains all PingOne OAuth2/OIDC configuration:

- **clientId**: OAuth2 client ID from your PingOne application
- **redirectUri**: Callback URL where PingOne redirects after authentication (must match PingOne configuration)
- **scope**: OAuth2 scopes including required `revoke` scope for PingOne
- **serverConfig.wellknown**: PingOne well-known endpoint URL for OIDC discovery
- **serverConfig.timeout**: Request timeout in milliseconds (recommended: 3000-5000ms)

**Important**: 
- The `redirectUri` must exactly match what's configured in your PingOne application
- The `revoke` scope is required when using PingOne services
- The well-known URL format: `https://auth.pingone.sg/{environment-id}/as/.well-known/openid-configuration`

## Key Components

### 1. Authentication Context (`src/context/AuthContext.js`)

**Purpose**: Central authentication state management and OAuth flow handling

**Key Responsibilities:**
- Initializes ForgeRock SDK with PingOne configuration
- Manages authentication state (`isAuthenticated`, `user`, `email`, `isLoading`)
- Handles OAuth2 login flow (redirects to PingOne)
- Processes OAuth callback (exchanges code for tokens)
- Loads user information from PingOne
- Handles logout flow
- Provides authentication context to all components via React Context

**Key Functions:**
- `initializeForgeRock()`: Sets up SDK and checks for existing authentication
- `login()`: Initiates OAuth login flow (redirects to PingOne)
- `logout()`: Logs out user and clears session
- `loadUserInfo()`: Fetches user profile from PingOne
- `checkAuthentication()`: Validates existing tokens

**Exports:**
- `AuthProvider`: React context provider component
- `useAuth()`: Hook to access authentication state and functions

### 2. Protected Route Component (`src/components/ProtectedRoute.jsx`)

**Purpose**: Route guard that protects authenticated routes

**Key Responsibilities:**
- Checks if user is authenticated before rendering protected content
- Validates tokens with PingOne
- Shows loading state during authentication check
- Redirects unauthenticated users to login page
- Renders protected content only for authenticated users

**Behavior:**
- If `isLoading = true`: Shows "Verifying access..." message
- If `isAuthenticated = false`: Redirects to `/login`
- If `isAuthenticated = true`: Validates token and renders `<Outlet />` (protected content)

### 3. Login Page (`src/pages/auth/LoginPage.js`)

**Purpose**: User interface for initiating authentication

**Key Responsibilities:**
- Displays login form (optional traditional login)
- Provides "Sign in with PingOne" button
- Triggers OAuth login flow when clicked
- Shows loading state during redirect

**Flow:**
- User clicks "Sign in with PingOne"
- Calls `login()` from `AuthContext`
- Browser redirects to PingOne authorization server

### 4. Callback Handler (`src/pages/auth/Callback.jsx`)

**Purpose**: Handles OAuth callback from PingOne (alternative to AuthContext callback)

**Note**: The primary callback handling happens in `AuthContext.js` during initialization. This component serves as a backup handler.

**Key Responsibilities:**
- Detects OAuth callback (checks for `code` and `state` in URL)
- Exchanges authorization code for tokens
- Validates authentication
- Redirects to appropriate page

### 5. HTTP Client (`src/utils/api.js`)

**Purpose**: API client with automatic token attachment

**Key Responsibilities:**
- Automatically attaches access tokens to API requests using ForgeRock SDK's `HttpClient`
- Handles GET, POST, PUT, DELETE, PATCH requests
- Manages request/response formatting
- Provides error handling

**Usage:**
- Uses `HttpClient.request()` from ForgeRock SDK
- SDK automatically includes access token in Authorization header

## Application Startup Sequence

### Step 1: Application Bootstrap
**Files**: `src/index.js` → `src/App.jsx`
- React application starts
- `BrowserRouter` is initialized for routing
- `AuthProvider` wraps the application, providing authentication context

### Step 2: Authentication Context Initialization
**File**: `src/context/AuthContext.js` → `useEffect` hook
- Configuration is loaded from `src/config/forgerock.js`
- ForgeRock SDK is configured using `Config.setAsync()` with:
  - Client ID
  - Redirect URI
  - Scopes
  - Well-known endpoint URL
  - Timeout settings

### Step 3: Authentication Status Check
**File**: `src/context/AuthContext.js` → `initializeForgeRock()` function
- Checks URL for OAuth callback parameters (`code` and `state`)
- **If callback detected**:
  - Calls `OAuth2Client.getTokens()` to exchange code for tokens
  - Calls `loadUserInfo()` to fetch user profile
  - Sets `isAuthenticated = true`
  - Navigates to welcome page
- **If no callback**:
  - Attempts to get existing tokens from storage
  - If tokens exist and valid: loads user info
  - If no tokens: user remains unauthenticated

### Step 4: Route Rendering
**File**: `src/routes/index.js`
- Routes are defined and rendered
- Public routes (`/login`, `/callback`) are accessible
- Protected routes (`/`, `/homePage`) are wrapped in `ProtectedRoute` component

### Step 5: Protected Route Evaluation
**File**: `src/components/ProtectedRoute.jsx`
- Checks `isAuthenticated` state from `AuthContext`
- If authenticated: validates token and renders content
- If not authenticated: redirects to `/login`

## Detailed Authentication Flow Steps

### Initial Authentication Flow

**Step 1: User Access**
- User navigates to protected route (e.g., `http://localhost:3000/`)
- **File**: `src/components/ProtectedRoute.jsx` checks authentication

**Step 2: Authentication Check**
- `ProtectedRoute` reads `isAuthenticated` from `AuthContext`
- If `false`: Redirects to `/login`
- **File**: `src/pages/auth/LoginPage.js` is rendered

**Step 3: Login Initiation**
- User clicks "Sign in with PingOne" button
- **File**: `src/context/AuthContext.js` → `login()` function is called
- Function attempts SDK redirect or constructs manual authorization URL
- Browser redirects to PingOne authorization server

**Step 4: PingOne Authentication**
- User authenticates on PingOne server
- PingOne validates credentials

**Step 5: OAuth Callback**
- PingOne redirects to `http://localhost:3000?code=...&state=...`
- **File**: `src/context/AuthContext.js` → `initializeForgeRock()` detects callback
- Extracts `code` and `state` from URL parameters

**Step 6: Token Exchange**
- **File**: `src/context/AuthContext.js` → callback handler
- Calls `OAuth2Client.getTokens()` to exchange authorization code for tokens
- SDK handles PKCE verification automatically
- Receives access token, ID token, and refresh token

**Step 7: User Information Loading**
- **File**: `src/context/AuthContext.js` → `loadUserInfo()` function
- Calls `UserManager.getCurrentUser()` to fetch user profile from PingOne
- Extracts user email, name, and other profile information
- Updates state: `isAuthenticated = true`, stores user data

**Step 8: Navigation**
- **File**: `src/context/AuthContext.js` → callback handler
- Cleans URL by removing query parameters
- Navigates to `/` using React Router

**Step 9: Protected Content Rendering**
- **File**: `src/components/ProtectedRoute.jsx`
- Validates token with `UserManager.getCurrentUser()`
- Renders `WelcomePage` component
- **File**: `src/pages/welcomePage.jsx` displays authenticated content

### Token Management

**Token Storage:**
- Tokens are managed by ForgeRock SDK's `TokenManager`
- SDK handles secure storage automatically
- No manual token storage required

**Token Validation:**
- `ProtectedRoute` validates tokens on each protected route access
- Calls `UserManager.getCurrentUser()` to verify token validity
- If token invalid: redirects to login

**Token Refresh:**
- Handled automatically by ForgeRock SDK
- SDK monitors token expiration
- Automatically refreshes tokens when needed
- If refresh fails: user must re-authenticate

### Logout Flow

**Step 1: Logout Initiation**
- User clicks logout in header menu
- **File**: `src/pages/MainLayout/Header/index.js` → `handleLogout()` function
- Calls `logout()` from `useAuth()` hook

**Step 2: Logout Execution**
- **File**: `src/context/AuthContext.js` → `logout()` function
- Calls `FRUser.logout({ logoutRedirectUri: window.location.origin })`
- SDK handles:
  - Token revocation on PingOne server
  - Session termination
  - Redirect back to application

**Step 3: State Cleanup**
- **File**: `src/context/AuthContext.js` → `logout()` function
- Clears local state: `isAuthenticated = false`, `user = null`, `email = ""`

**Step 4: Post-Logout**
- PingOne redirects back to application root
- User is now unauthenticated
- Any protected route access redirects to login

## Route Protection

### Public Routes
**File**: `src/routes/index.js`

- `/login`: Login page (accessible to all)
- `/callback`: OAuth callback handler (accessible to all, handled by SDK)

### Protected Routes
**File**: `src/routes/index.js` → Wrapped in `<ProtectedRoute>` component

- `/`: Welcome page (requires authentication)
- `/homePage`: Welcome page alias (requires authentication)

### Route Guard Behavior
**File**: `src/components/ProtectedRoute.jsx`

- **Loading State**: If `isLoading = true`, shows "Verifying access..." message
- **Unauthenticated**: If `isAuthenticated = false`, redirects to `/login`
- **Authenticated**: If `isAuthenticated = true`:
  - Validates token with `UserManager.getCurrentUser()`
  - If valid: renders protected content via `<Outlet />`
  - If invalid: redirects to `/login`

## User Information Extraction

**File**: `src/context/AuthContext.js` → `loadUserInfo()` function

User information is fetched from PingOne using `UserManager.getCurrentUser()`:

- **Email**: From `userInfo.email`
- **Name**: From `userInfo.name`
- **User ID**: From `userInfo.id` or `userInfo.sub`
- **Additional Claims**: Any other claims returned by PingOne userinfo endpoint

The user object is stored in `AuthContext` state and accessible via `useAuth()` hook throughout the application.

## Development Setup

### Prerequisites

**For PingOne:**
- PingOne account with OAuth2 application configured
- OAuth2 client in PingOne with:
  - Client ID
  - Redirect URI: `http://localhost:3000` (root path, no /callback)
  - PKCE Enforcement: Optional (but recommended)
  - Scopes: `openid profile email phone revoke` (revoke is required)
  - CORS: `http://localhost:3000` added to allowed origins

**For ForgeRock OpenAM:**
- ForgeRock OpenAM server accessible
- OAuth2 client configured in ForgeRock with:
  - Client ID
  - Redirect URI: `http://localhost:3000/callback` (with /callback path)
  - PKCE enabled (recommended)
  - Scopes: `openid profile email phone` (no revoke needed)
  - Realm path configured

### Installation Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variable**
   - Create a `.env` file in the root directory (copy from `.env.example`)
   - Set `REACT_APP_IS_FORGE_ROCK_LIVE=true` for ForgeRock OpenAM
   - Set `REACT_APP_IS_FORGE_ROCK_LIVE=false` or leave empty for PingOne

3. **Configure Provider Settings**
   
   **For PingOne (when IS_FORGE_ROCK_LIVE=false):**
   - Update `src/config/forgerock.js` - `pingOneConfig` section:
     - Client ID
     - Well-known endpoint URL
     - Redirect URI (must match PingOne configuration: `http://localhost:3000`)

   **For ForgeRock OpenAM (when IS_FORGE_ROCK_LIVE=true):**
   - Update `src/config/forgerock.js` - `forgerockOpenAMConfig` section, OR
   - Set environment variables in `.env`:
     - `REACT_APP_FORGEROCK_CLIENT_ID`
     - `REACT_APP_FORGEROCK_REDIRECT_URI`
     - `REACT_APP_FORGEROCK_SCOPE`
     - `REACT_APP_FORGEROCK_BASE_URL`
     - `REACT_APP_FORGEROCK_REALM_PATH`
     - `REACT_APP_FORGEROCK_TIMEOUT`
     - `REACT_APP_FORGEROCK_TREE` (optional)

4. **Start Development Server**
   ```bash
   npm start
   ```

5. **Application Initialization**
   - Application runs on `http://localhost:3000`
   - On first load, `AuthContext` initializes with the selected provider
   - Configuration is loaded based on `IS_FORGE_ROCK_LIVE` environment variable
   - If not authenticated, user is redirected to login page

### Running the Application

- **Start**: `npm start`
- **URL**: `http://localhost:3000`
- **First Access**: Redirects to login page if not authenticated
- **After Login**: Redirects to selected provider (PingOne or ForgeRock), then back to welcome page

### Switching Between Providers

To switch between PingOne and ForgeRock:

1. **For PingOne**: Set `REACT_APP_IS_FORGE_ROCK_LIVE=false` in `.env` (or leave unset)
2. **For ForgeRock**: Set `REACT_APP_IS_FORGE_ROCK_LIVE=true` in `.env`
3. Restart the development server: `npm start`

The application will automatically:
- Load the correct configuration
- Use appropriate redirect URIs
- Handle provider-specific features (iframe blocking, logout, etc.)

## Troubleshooting

### Common Issues

1. **"OAuth2Client.authorize is not a function" errors**
   - **Solution**: Use `TokenManager.getTokens({ login: "redirect" })` instead
   - The code now includes a fallback to manual redirect if SDK redirect doesn't work
   - **File**: `src/context/AuthContext.js` → `login()` function

2. **X-Frame-Options / Iframe Blocking Errors**
   - **Cause**: PingOne blocks iframes with `X-Frame-Options: sameorigin`
   - **Solution**: Code skips iframe-based token checks to avoid this error
   - **File**: `src/context/AuthContext.js` → `checkAuthentication()` function
   - This is expected behavior - authentication uses full-page redirects

3. **Redirect URI Mismatch**
   - **Error**: "redirect_uri_mismatch" in console
   - **Solution**: Ensure redirect URI in `src/config/forgerock.js` exactly matches PingOne configuration
   - Must be: `http://localhost:3000` (no trailing slash, no `/callback`)

4. **Not Redirecting to PingOne**
   - **Cause**: SDK redirect might not work in some cases
   - **Solution**: Code includes manual redirect fallback that constructs authorization URL
   - **File**: `src/context/AuthContext.js` → `login()` function
   - Check console for "Attempting manual redirect..." message

5. **Redirected Back to Login After Authentication**
   - **Cause**: Authentication state not set before navigation
   - **Solution**: Code now waits for state update before navigating
   - **File**: `src/context/AuthContext.js` → callback handler
   - Also removed duplicate auth check from `WelcomePage`

6. **"AuthProvider context is undefined" Error**
   - **Cause**: Component using wrong `useAuth` import
   - **Solution**: Ensure components import from `src/context/AuthContext.js`
   - **File**: `src/pages/MainLayout/Header/index.js` (fixed)

7. **Token Exchange Fails**
   - **Check**: Browser console for detailed error messages
   - **Verify**: PingOne application configuration matches code settings
   - **Verify**: Well-known endpoint URL is correct and accessible
   - **Verify**: Client ID matches PingOne application

## Logging

The application includes comprehensive console logging for debugging:

- `[Boot]`: Application startup and configuration loading
- `[Auth]`: Authentication flow, token management, and user operations
- `[HTTP]`: HTTP request/response logging
- `[Guard]`: Route protection and authorization checks
- `[Route]`: Route navigation events

All logs are prefixed with tags for easy filtering in browser console.

## Security Considerations

- Tokens are stored in session storage (cleared on browser close)
- PKCE is used for enhanced security
- Access tokens are automatically attached to API requests
- Tokens are refreshed automatically before expiration
- Logout properly clears tokens and terminates ForgeRock session

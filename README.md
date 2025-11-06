# React MSL Application

## Overview

This React application implements ForgeRock OAuth2/OIDC authentication using the ForgeRock JavaScript SDK. The authentication system uses PKCE (Proof Key for Code Exchange) flow for secure authentication.

## Authentication Architecture

### High-Level Flow

1. **Application Startup**

   - Application loads configuration from `configs.json`
   - Initializes ForgeRock SDK with credentials from `forgeRock.json`
   - Sets up HTTP client interceptors for automatic token attachment

2. **Authentication Process**

   - User accesses protected route
   - If not authenticated, user is redirected to ForgeRock authorization server
   - User authenticates on ForgeRock server
   - Authorization code is returned to application callback URL
   - Application exchanges authorization code for access and ID tokens
   - Tokens are stored and user session is established

3. **Token Management**
   - Access tokens are automatically attached to API requests
   - Tokens are automatically refreshed before expiration
   - User information is extracted from ID token

## Configuration Files

### Step 1: Configure Application Settings (`public/configs.json`)

This file contains application-level configuration:

- **FORGEROCK_PATH**: Path to ForgeRock configuration file (typically `/forgeRock.json`)
- **API_BASE_URL**: Base URL for API endpoints
- **FORGEROCK_OIDC_ISSUER**: ForgeRock OIDC issuer URL (optional)

### Step 2: Configure ForgeRock Credentials (`public/forgeRock.json`)

This file contains ForgeRock-specific authentication settings:

- **authority**: Full ForgeRock authorization server URL (must not have trailing characters)
- **client_id**: OAuth2 client ID configured in ForgeRock
- **redirect_uri**: Application callback URL where ForgeRock redirects after authentication
- **response_type**: OAuth2 response type (typically "code")
- **scope**: Requested OAuth2 scopes (e.g., "openid profile email")
- **realm**: ForgeRock realm name
- **auth-server-url**: Base URL of the ForgeRock authentication server

**Important**: Ensure the `authority` URL is correctly formatted without trailing characters (no `@` or extra slashes).

## Key Components

### 1. Authentication Service (`src/lib/authService.js`)

**Responsibilities:**

- Initializes ForgeRock SDK with configuration
- Handles OAuth2 authorization flow
- Manages token storage and retrieval
- Implements automatic token refresh
- Extracts user information from tokens
- Provides authentication status checking
- Handles logout functionality

**Key Functions:**

- `initForgeRock()`: Initializes SDK and checks for existing tokens or redirects for authentication
- `doLogin()`: Initiates login flow
- `doLogout()`: Logs out user and clears tokens
- `isLoggedIn()`: Checks if user is authenticated
- `getToken()`: Retrieves current access token
- `refreshToken()`: Manually refreshes tokens
- `getUserFullName()`, `getLoginName()`, `getUserId()`: Extract user information
- `getRoles()`, `hasRole()`: Extract and check user roles

### 2. HTTP Client (`src/lib/httpClient.js`)

**Responsibilities:**

- Automatically attaches access tokens to API requests
- Handles request/response interceptors
- Manages error responses
- Supports skipping authentication for public endpoints

### 3. Route Protection (`src/lib/authUser.js`)

**Responsibilities:**

- Protects routes requiring authentication
- Supports role-based access control
- Shows unauthorized message for insufficient permissions
- Returns null while authentication is in progress

### 4. Storage Utility (`src/utils/storage.js`)

**Responsibilities:**

- Manages session storage for tokens
- Provides secure token storage/retrieval
- Handles token cleanup on logout

## Application Startup Sequence

### Step 1: Load Configuration

- Application fetches `configs.json` from public folder
- Configuration is stored in global window object

### Step 2: Initialize ForgeRock

- ForgeRock configuration file path is retrieved from configs
- `forgeRock.json` is fetched and parsed
- Authority URL is parsed to extract base URL and realm path
- ForgeRock SDK is configured with extracted settings

### Step 3: Check Authentication Status

- System checks if user is returning from OAuth callback (has authorization code in URL)
- If callback detected: exchanges code for tokens
- If no callback: checks for existing valid tokens
- If no tokens: redirects to ForgeRock for authentication

### Step 4: Setup HTTP Interceptors

- Request interceptor attaches access token to API calls
- Response interceptor handles errors and logging

### Step 5: Render Application

- React application is rendered with routing
- Protected routes are wrapped with authentication guards

## Authentication Flow Steps

### Initial Authentication

1. User navigates to protected route
2. `RequireAuth` component checks authentication status
3. If not authenticated, `authService` redirects to ForgeRock
4. User authenticates on ForgeRock server
5. ForgeRock redirects back to `/callback` with authorization code
6. Application detects callback and exchanges code for tokens
7. Tokens are stored in session storage
8. User is redirected to original destination
9. Application renders with authenticated user

### Token Refresh

1. Token expiration is monitored automatically
2. Before expiration (5 seconds buffer), refresh is scheduled
3. When refresh timer fires, new tokens are requested
4. If refresh fails, user is redirected to re-authenticate
5. New tokens replace old tokens in storage

### Logout

1. User clicks logout button
2. Tokens are cleared from storage
3. ForgeRock logout endpoint is called
4. User is redirected to ForgeRock for session termination
5. User returns to application in unauthenticated state

## Route Protection

### Public Routes

- `/callback`: OAuth callback handler (no protection needed)

### Protected Routes

- `/`: Home page (requires authentication)
- `/admin`: Admin area (requires authentication + admin role)
- `/user`: User area (requires authentication)

### Route Guard Behavior

- If user is not authenticated: returns null (triggers redirect)
- If user lacks required roles: shows unauthorized message
- If user is authenticated with proper roles: renders protected content

## User Information Extraction

User information is extracted from the ID token (JWT):

- **Full Name**: From `name` claim
- **Login Name**: From `preferred_username` or `email` claim
- **User ID**: From `sub` (subject) claim
- **Roles**: From `roles` array or `realm_access.roles` array

## Development Setup

### Prerequisites

- Node.js and npm installed
- ForgeRock server accessible
- OAuth2 client configured in ForgeRock with:
  - Client ID matching `forgeRock.json`
  - Redirect URI matching callback URL
  - PKCE enabled
  - Appropriate scopes granted

### Installation Steps

1. Install dependencies using npm
2. Configure `public/configs.json` with application settings
3. Configure `public/forgeRock.json` with ForgeRock credentials
4. Ensure ForgeRock server is accessible
5. Start development server
6. Application will automatically initialize authentication on first load

### Running the Application

- Start development server: `npm start`
- Application runs on `http://localhost:3000`
- First access will redirect to ForgeRock for authentication
- After authentication, user is redirected back to application

## Troubleshooting

### Common Issues

1. **"OAuth2Client is not a function" errors**

   - Ensure ForgeRock SDK version is compatible (4.8.2)
   - Check that imports are correct

2. **Cross-origin frame errors**

   - Application uses safe URL parameter checking instead of SDK's frame detection
   - This avoids cross-origin security issues

3. **Token refresh failures**

   - Check that tokens are being stored correctly
   - Verify ForgeRock server is accessible
   - Check browser console for detailed error messages

4. **Configuration errors**

   - Verify `authority` URL has no trailing characters
   - Ensure `redirect_uri` matches ForgeRock client configuration
   - Check that `client_id` matches ForgeRock client ID

5. **Authentication redirect loops**
   - Check that callback route (`/callback`) is properly configured
   - Verify ForgeRock server is responding correctly
   - Check browser console logs for detailed error information

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

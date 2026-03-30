const { appId, functionsVersion, appBaseUrl } = appParams;

// Clear any stale Base44 auth token from localStorage
// so the SDK never attempts to call User/me
if (typeof window !== 'undefined') {
  localStorage.removeItem('base44_access_token');
  localStorage.removeItem('token');
}

export const base44 = createClient({
  appId,
  token: null,
  requiresAuth: false,
  functionsVersion,
  serverUrl: '',
  appBaseUrl
});
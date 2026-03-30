import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, functionsVersion, appBaseUrl } = appParams;

// Clear any stale Base44 auth tokens from localStorage
// This prevents the SDK from picking up old tokens and calling User/me
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
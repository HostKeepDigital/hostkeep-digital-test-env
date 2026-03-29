import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, functionsVersion, appBaseUrl } = appParams;

// Create a client with NO Base44 Auth
export const base44 = createClient({
  appId,
  token: null,            // 🔥 Disable Base44 Auth completely
  requiresAuth: false,    // 🔥 Prevent auto-auth
  functionsVersion,
  serverUrl: '',          // Keep empty
  appBaseUrl
});
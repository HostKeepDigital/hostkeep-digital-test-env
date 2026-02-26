import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const failedAttempts = new Map();

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const { token, challenge } = await req.json();
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    // Simple anti-bot check
    if (!challenge || challenge !== 'human') {
      return Response.json({ 
        success: false, 
        error: 'Access denied'
      }, { status: 403 });
    }
    
    // Rate limiting
    const attemptKey = clientIp;
    const now = Date.now();
    const attempts = failedAttempts.get(attemptKey) || [];
    const recentAttempts = attempts.filter(time => now - time < RATE_LIMIT_WINDOW);
    
    if (recentAttempts.length >= MAX_ATTEMPTS) {
      return Response.json({ 
        success: false, 
        error: 'Too many attempts'
      }, { status: 429 });
    }
    
    // Validate token
    const storedToken = Deno.env.get('LOCK_ACCESS_TOKEN');
    
    if (!storedToken || !token) {
      recentAttempts.push(now);
      failedAttempts.set(attemptKey, recentAttempts);
      return Response.json({ 
        success: false, 
        error: 'Access denied'
      }, { status: 401 });
    }
    
    if (token === storedToken) {
      // Clear failed attempts on success
      failedAttempts.delete(attemptKey);
      
      // Generate session token
      const sessionToken = crypto.randomUUID();
      
      return Response.json({ 
        success: true,
        sessionToken
      });
    }
    
    // Invalid token
    recentAttempts.push(now);
    failedAttempts.set(attemptKey, recentAttempts);
    
    return Response.json({ 
      success: false, 
      error: 'Access denied'
    }, { status: 401 });
    
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: 'Access denied'
    }, { status: 500 });
  }
});
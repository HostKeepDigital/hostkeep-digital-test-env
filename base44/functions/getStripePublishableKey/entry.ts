Deno.serve(async (_req) => {
  return Response.json({ publishable_key: Deno.env.get('STRIPE_PUBLISHABLE_KEY') });
});
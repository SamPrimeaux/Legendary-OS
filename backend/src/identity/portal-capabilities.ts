import type { WorkerEnv } from '../env';
import { legendaryIdentityApp, legendaryIdentityRoutes } from './app-config';

export function configuredIdentityOptions(env: Partial<WorkerEnv>, supportEmail = '') {
  const has = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
  const iam = has(env.IAM_CLIENT_ID) && has(env.IAM_CLIENT_SECRET) && has(env.IAM_OAUTH_ISSUER);
  return {
    passwordLogin: true,
    signup: true,
    passwordReset: has(env.RESEND_API_KEY) && has(supportEmail),
    providers: {
      iam,
      google: has(env.GOOGLE_CLIENT_ID) && has(env.GOOGLE_CLIENT_SECRET),
      github: has(env.GITHUB_CLIENT_ID) && has(env.GITHUB_CLIENT_SECRET),
    },
    backupCodes: false,
  };
}

export async function identityOptions(env: WorkerEnv) {
  const company = env.RESEND_API_KEY
    ? await env.DB.prepare('SELECT support_email FROM company WHERE slug = ? LIMIT 1').bind('default').first<{support_email: string}>()
    : null;
  return configuredIdentityOptions(env, company?.support_email || '');
}

export async function renderIdentityPortal(request: Request, env: WorkerEnv) {
  const response = await env.ASSETS.fetch(request);
  if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) return response;
  const options = await identityOptions(env);
  const url = new URL(request.url);
  const next = legendaryIdentityRoutes.resolveReturnTo({ appId: legendaryIdentityApp.id, value: url.searchParams.get('next') }) || '/dashboard/cms';
  const iamHref = `/api/oauth/iam/start?next=${encodeURIComponent(next)}`;
  const rewrite = new HTMLRewriter();
  for (const provider of ['google', 'github'] as const) {
    if (!options.providers[provider]) rewrite.on(`#${provider}SignIn`, { element(element) { element.remove(); } });
  }
  if (options.providers.iam) rewrite.on('.oauth-stack', { element(element) {
    element.prepend(`<a id="iamSignIn" href="${iamHref}" class="btn-primary" style="display:flex;justify-content:center;text-decoration:none;padding:14px 20px">Continue with Inner Animal Media</a>`, { html: true });
  } });
  rewrite.on('#backupCodeToggle', { element(element) { element.remove(); } });
  if (!options.passwordReset) {
    rewrite.on('#forgotPasswordLink', { element(element) { element.remove(); } });
    rewrite.on('.forgot-prompt', { element(element) { element.remove(); } });
  }
  if (url.pathname === '/auth/login') rewrite.on('.subtitle', { element(element) {
    if (!element.getAttribute('id')) element.setInnerContent(options.providers.iam ? 'Use your Legendary email and password, or continue with Inner Animal Media.' : 'Use your Legendary email and password.');
  } });
  if (url.pathname === '/auth/reset' && !options.passwordReset) {
    rewrite.on('.subtitle', { element(element) { element.setInnerContent('Email password recovery is not configured for Legendary yet. For an Inner Animal Media account, recover your password through Inner Animal Media.'); } });
    rewrite.on('form', { element(element) { element.setAttribute('style', 'display:none'); } });
    rewrite.on('input, button[type="submit"]', { element(element) { element.setAttribute('disabled', ''); } });
  }
  const headers = new Headers(response.headers);
  headers.delete('etag'); headers.delete('content-length');
  headers.set('cache-control', 'no-store');
  return rewrite.transform(new Response(response.body, { status: response.status, headers }));
}

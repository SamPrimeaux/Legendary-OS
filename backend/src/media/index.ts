import { MediaApplication, type MediaEnv } from './application';
import { handleMediaDelivery } from './routes/delivery';
import { handleMediaUpload } from './routes/upload';
import { handleMediaImport } from './routes/import';
import { handleMediaMetadata } from './routes/metadata';
import { handleMediaApi } from './routes/media-api';
import { rejectUnauthorizedCmsApi, type CmsRouteAuthEnv } from '../auth/cms-route-auth';

export * from './contracts';
export { MediaApplication } from './application';

export async function handleMediaRequest(request: Request, env: MediaEnv & CmsRouteAuthEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/media/') && !url.pathname.startsWith('/assets/')) return null;
  // Published image delivery stays public; library records and operations use
  // the same human-session / machine-bridge authentication as the CMS.
  const publicVariant = request.method === 'GET' && /^\/api\/media\/assets\/[^/]+\/variant$/.test(url.pathname);
  if (url.pathname.startsWith('/api/media/') && !publicVariant) {
    const rejected = await rejectUnauthorizedCmsApi(request, env);
    if (rejected) return rejected;
  }
  const app = new MediaApplication(env);
  return (
    await handleMediaDelivery(request, app)
    || await handleMediaUpload(request, app)
    || await handleMediaImport(request, app)
    || await handleMediaMetadata(request, app)
    || await handleMediaApi(request, app)
  );
}

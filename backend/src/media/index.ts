import { MediaApplication, type MediaEnv } from './application';
import { handleMediaDelivery } from './routes/delivery';
import { handleMediaUpload } from './routes/upload';
import { handleMediaImport } from './routes/import';
import { handleMediaMetadata } from './routes/metadata';
import { handleMediaApi } from './routes/media-api';

export * from './contracts';
export { MediaApplication } from './application';

export async function handleMediaRequest(request: Request, env: MediaEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/media/') && !url.pathname.startsWith('/assets/')) return null;
  const app = new MediaApplication(env);
  return (
    await handleMediaDelivery(request, app)
    || await handleMediaUpload(request, app)
    || await handleMediaImport(request, app)
    || await handleMediaMetadata(request, app)
    || await handleMediaApi(request, app)
  );
}

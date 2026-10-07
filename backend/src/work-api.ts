import { rejectUnauthorizedCmsApi } from './auth/cms-route-auth.js';
import type { WorkerEnv } from './env.js';

type WorkArtifact = {
  id: string;
  name: string;
  kind: 'image' | 'document' | 'code' | 'archive' | 'other';
  source: 'r2';
  preview?: string | null;
  mime?: string | null;
  sizeLabel?: string | null;
  updatedLabel?: string | null;
};

type MediaRow = {
  id?: unknown;
  filename?: unknown;
  content_type?: unknown;
  media_kind?: unknown;
  size_bytes?: unknown;
  object_key?: unknown;
  updated_at?: unknown;
};

function artifactKind(row: MediaRow): WorkArtifact['kind'] {
  const mediaKind = String(row.media_kind || '').toLowerCase();
  const filename = String(row.filename || '').toLowerCase();
  const mime = String(row.content_type || '').toLowerCase();

  if (mediaKind === 'image' || mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf' || mime.startsWith('text/') || /\.(pdf|docx?|pages|rtf|txt|md)$/i.test(filename)) return 'document';
  if (/\.(ts|tsx|js|jsx|mjs|cjs|json|css|scss|html|sql|rs|py|go|java|c|cc|cpp|h|hpp|sh|yaml|yml)$/i.test(filename)) return 'code';
  if (/\.(zip|tar|gz|tgz|bz2|7z|rar)$/i.test(filename)) return 'archive';
  return 'other';
}

function publicAssetPath(objectKey: string) {
  return '/assets/' + objectKey.split('/').map(encodeURIComponent).join('/');
}

function formatBytes(value: unknown) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  const amount = size >= 10 || unit === 0 ? String(Math.round(size)) : size.toFixed(1);
  return amount + ' ' + units[unit];
}

function updatedLabel(value: unknown) {
  const numeric = Number(value || 0);
  if (!numeric) return null;
  return new Date(numeric).toISOString();
}

export async function handleWorkApi(request: Request, env: WorkerEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/work/')) return null;

  const rejected = await rejectUnauthorizedCmsApi(request, env);
  if (rejected) return rejected;

  if (url.pathname === '/api/work/snapshot' && request.method === 'GET') {
    const rows = await env.DB
      .prepare(
        "SELECT id,filename,content_type,media_kind,size_bytes,object_key,updated_at " +
        "FROM media_assets WHERE organization_id=? AND status!='archived' " +
        "ORDER BY updated_at DESC LIMIT 250",
      )
      .bind('legendary')
      .all<MediaRow>();

    const artifacts: WorkArtifact[] = (rows.results ?? []).map((row) => {
      const objectKey = String(row.object_key || '');
      const kind = artifactKind(row);
      return {
        id: String(row.id || ''),
        name: String(row.filename || 'Untitled asset'),
        kind,
        source: 'r2',
        preview: kind === 'image' && objectKey ? publicAssetPath(objectKey) : null,
        mime: row.content_type == null ? null : String(row.content_type),
        sizeLabel: formatBytes(row.size_bytes),
        updatedLabel: updatedLabel(row.updated_at),
      };
    });

    return Response.json({
      snapshot: {
        fixtureName: 'legendary-live',
        nav: [
          { id: 'calendar', label: 'Calendar', href: '/collaborate', group: 'work' },
          { id: 'tickets', label: 'Tickets', href: '/collaborate?seg=tickets', group: 'work' },
          { id: 'mail', label: 'Mail', href: '/mail', group: 'work' },
          { id: 'projects', label: 'Projects', href: '/projects', group: 'work' },
          { id: 'artifacts', label: 'Artifacts', href: '/artifacts', group: 'files' },
          { id: 'r2', label: 'R2 Storage', href: '/artifacts?source=r2', group: 'files' },
        ],
        tickets: [],
        artifacts,
        projects: [],
        mail: [],
        calendar: [],
        currentProjectId: '',
        ticketAnalytics: {
          completionRate: 0,
          avgCycleDays: 0,
          oldestActiveDays: 0,
        },
      },
    });
  }

  return Response.json({ error: 'not_found', path: url.pathname }, { status: 404 });
}

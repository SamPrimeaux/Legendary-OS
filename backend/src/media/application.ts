import { D1MediaStore, type MediaD1Database } from './adapters/d1-media-store';
import { R2MediaObjectStore } from './adapters/r2-object-store';
import { AssetService } from './services/asset-service';
import { UsageService } from './services/usage-service';
import { ImportService } from './services/import-service';
import { DeliveryService } from './services/delivery-service';

export interface MediaEnv {
  DB: MediaD1Database;
  ASSETS_BUCKET: R2Bucket;
  IMAGES?: unknown;
}

export class MediaApplication {
  readonly store: D1MediaStore;
  readonly objects: R2MediaObjectStore;
  readonly assets: AssetService;
  readonly usages: UsageService;
  readonly imports: ImportService;
  readonly delivery: DeliveryService;

  constructor(env: MediaEnv) {
    this.store = new D1MediaStore(env.DB);
    this.objects = new R2MediaObjectStore(env.ASSETS_BUCKET, 'legendary-os');
    this.assets = new AssetService(this.store, this.objects, env.IMAGES);
    this.usages = new UsageService(this.store);
    this.imports = new ImportService(this.assets, this.usages);
    this.delivery = new DeliveryService(this.assets);
  }
}

export function mediaOrganizationId(_request: Request) {
  return 'legendary';
}

export const LEGENDARY_SITE_MAP: Record<string, string> = {
  'legendary-contractors': 'site_contractors',
  contractors: 'site_contractors',
  'legendary-scapes': 'site_scapes',
  scapes: 'site_scapes',
};

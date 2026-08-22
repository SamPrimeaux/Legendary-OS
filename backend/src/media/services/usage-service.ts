import type { MediaUsageInput } from '../contracts';
import { D1MediaStore } from '../adapters/d1-media-store';

export class UsageService {
  constructor(readonly store: D1MediaStore) {}

  list(assetId: string, organizationId: string) {
    return this.store.listUsages(assetId, organizationId);
  }

  async add(assetId: string, organizationId: string, input: MediaUsageInput) {
    const asset = await this.store.getAsset(assetId, organizationId);
    if (!asset) throw new Error('media_asset_not_found');
    return this.store.createUsage(assetId, organizationId, input);
  }

  async remove(id: string, organizationId: string) {
    await this.store.deleteUsage(id, organizationId);
    return { ok: true };
  }
}

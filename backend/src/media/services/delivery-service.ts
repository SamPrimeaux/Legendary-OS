import { renderCloudflareImageVariant, type ImageVariantOptions } from '../adapters/cloudflare-images';
import { AssetService } from './asset-service';

export class DeliveryService {
  constructor(readonly assets: AssetService) {}

  async rawObject(key: string) {
    return this.assets.objects.get(key);
  }

  async variant(assetId: string, organizationId: string, options: ImageVariantOptions) {
    const asset = await this.assets.get(assetId, organizationId);
    if (!asset) return null;
    const object = await this.assets.objects.get(asset.storage.key);
    if (!object) return null;
    const response = await renderCloudflareImageVariant(this.assets.imagesBinding, object.body, options).catch(() => null);
    return response || new Response(object.body, { headers: { 'content-type': asset.mimeType, 'cache-control': 'public, max-age=3600' } });
  }
}

// FUTURE ENTRY. Not wired: the live worker still runs backend/src/index.ts until cutover (see MIGRATION.md).
// A deployment only decides which white-label sites are mounted where.
import deployment from "../deployment.json" with { type: "json" };
import contractorsManifest from "../../../apps/contractors/app.manifest.json" with { type: "json" };
import contractorsBrand from "../../../apps/contractors/brand/brand.json" with { type: "json" };
import contractorsTokens from "../../../apps/contractors/brand/tokens.json" with { type: "json" };
import scapesManifest from "../../../apps/scapes/app.manifest.json" with { type: "json" };
import scapesBrand from "../../../apps/scapes/brand/brand.json" with { type: "json" };
import scapesTokens from "../../../apps/scapes/brand/tokens.json" with { type: "json" };
import type { AppManifest, BrandPack } from "@inneranimalmedia/site-contracts";
import { createPlatformWorker, type SiteMount } from "@inneranimalmedia/platform-runtime";

const packs: Record<string, Omit<SiteMount, "basePath">> = {
  contractors: { manifest: contractorsManifest as AppManifest, brand: contractorsBrand as BrandPack, tokens: contractorsTokens },
  scapes: { manifest: scapesManifest as AppManifest, brand: scapesBrand as BrandPack, tokens: scapesTokens },
};

const sites: SiteMount[] = deployment.sites.map((s) => {
  const pack = packs[s.app];
  if (!pack) throw new Error(`deployment mounts unknown app: ${s.app}`);
  return { ...pack, basePath: s.basePath };
});

export default createPlatformWorker({ sites });

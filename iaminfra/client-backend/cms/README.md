# CMS — @inneranimalmedia-client/backend

This is the isolated extraction target for the canonical IAM CMS core.

## Upstream architecture

Source: `SamPrimeaux/inneranimalmedia/src/core/agentsam/cms/`

The upstream core already establishes the principles we want here:

- one canonical CMS domain
- Site → Page → Section → Block
- thin HTTP/Worker hosts
- tenant/workspace/site context separated from deployment mechanics
- registry/capability-driven human + Agent Sam operations
- shared preview/public rendering semantics
- lifecycle/publish/revision ownership in core
- provider-neutral AI and storage adapters
- InnerAnimalMedia is a host, not a special case

## Target layout

```text
cms/
  contracts/
  context/
  routing/
  registry/
  pages/
  sections/
  blocks/
  assets/
  theme/
  preview/
  lifecycle/
  bootstrap/
  templates/
  agents/
  ai/
  adapters/cloudflare/
  upstream/
```

`upstream/` contains literal source snapshots used during extraction. Refined modules move out of `upstream/` once their IAM-specific dependencies have been removed and their contracts are stable.

## First invariant

The editor and public website are two consumers of the same CMS domain:

```text
edit draft
  → validate canonical tree
  → publish
  → immutable publication snapshot
  → public renderer
```

Public rendering never reads an unpublished draft.

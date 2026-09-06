---
name: GitHub repository publishing
description: Environment-specific constraint when transferring a complete repository from Replit to GitHub.
---

For complete repository publishing, use an authenticated normal Git push rather
than GitHub connector file-by-file uploads.

**Why:** The connector can read repositories and may accept a small number of
writes, but sustained content writes can be blocked by Cloudflare even with
cooldowns and request pacing. Connector uploads also do not preserve the local
Git history.

**How to apply:** Confirm the Replit Git/source-control session or GitHub CLI is
authenticated, then push the prepared local branch. Use the connector only for
repository-management API operations, not full project transfer.
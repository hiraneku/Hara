# N10–N11 implementation notes

## N10 collaboration core

`kolaborasi-murni.js` is a transport-independent data model: every room has an explicit owner/member list and role; only owner changes access; editors submit revision-based block operations; same-block concurrent edits are returned as conflicts without modifying either version; independent block operations can merge; comments and change events carry actor IDs; cursor/presence records are ephemeral and never written into note content.

This is not a live collaboration service. A production integration still needs an authenticated relay, identity verification, encrypted transport/storage, invitations, reconnect/outbox management, retention policy, cursor broadcast, and multi-client/browser tests. The local engine deliberately does not pretend a user-supplied actor string is authentication.

## N11 controlled extension actions

`ekstensi-api.js` offers a narrow registration boundary for application-bundled extensions. Actions declare `notes:read` / `notes:write`, receive cloned selected-note snapshots only, return a limited set of declarative operations, and must pass through preview, staleness checking, current-grant checking, and one-time explicit apply. No `eval`, remote script loader, raw blob access, or arbitrary mutation operation is provided. This API is a capability boundary for app-integrated bundles, not a JavaScript sandbox: untrusted code must not be loaded into the app origin.

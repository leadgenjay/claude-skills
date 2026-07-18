# Funnel page internal API

Status: experimental, reverse-engineered from GHL's production page-builder bundles on
2026-07-16, and verified against an isolated draft in the Otter PR account.

The public `GET /funnels/page` endpoint returns page metadata only. Builder content is
stored as versioned JSON artifacts. The UI currently uses these internal routes:

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/funnels/funnel/create-step` | Create a funnel step and blank page |
| `GET` | `/funnels/page/{pageId}` | Page record plus signed draft/live artifact URLs |
| `POST` | `/funnels/builder/autosave/{pageId}` | Store full builder-v2 page data |
| `GET` | `/funnels/builder/get-versions` | Version history |
| `POST` | `/funnels/builder/restore-version` | Restore a version |
| `POST` | `/funnels/builder/publish-version` | Publish a stored version |
| `POST` | `/funnels/builder/delete-version-history-data` | Delete version history data |
| `GET` | `/funnels/builder/redis-key-data/{pageId}` | Builder cache data |
| `GET` | `/funnels/funnel/fetch/{funnelId}` | Funnel and global-section metadata |
| `POST` | `/funnels/builder/global-sections/{funnelId}` | Store versioned shared sections |

The autosave body is `{funnelId, pageData, pageVersion, pageType, manualSave,
integrations, meta?}`. `pageData.sections[].elements` is a flat node list whose
`child` arrays encode section → row → column → element relationships. GHL also
requires generated `sectionStyles`, root variables, and `pageStyles`; accepted node
JSON without those CSS artifacts may appear as an empty section in the editor.

## Element coverage

The compact adapter has first-class generators for text, bullet lists, buttons,
images, video, dividers, forms, surveys, calendars, timers, FAQs, logo showcases,
custom code, checkout/order forms, and order confirmation. It generates page popups,
background media, responsive visibility, global CSS and tracking data as well.

GHL has additional and frequently changing widget families such as store, blog,
navigation, reviews, maps, SVG, galleries, and new marketplace widgets. Those are
handled without schema loss by exporting the element and embedding it as
`{"type":"native","node":{...}}`. Advanced `class`, `styles`, `extra`, `wrapper`,
`mobileStyles`, and `customCss` dictionaries can be deep-merged into any generated
element.

Safety rules:

- Use only on an account you own. Authentication is a full Firebase session, not a
  scoped integration token.
- Export a page before replacing it.
- Save drafts and inspect them in desktop and mobile views before publishing.
- Prefer Snapshots when provisioning client accounts.
- Treat every route and payload as unstable; GHL can change these without notice.

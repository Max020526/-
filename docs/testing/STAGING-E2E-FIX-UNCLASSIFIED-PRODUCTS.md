# Staging E2E Fix — Unclassified Product Operations

Status: implementation complete; Draft PR checks pass. Production is frozen.

## Root cause

`rbac_products_select` and the variant policies delegated every row to
`private.has_category_access(category_id)`. That generic helper deliberately
returns `false` for `NULL`, so products created by quick inbound without a
category disappeared from the Product Operator queue together with their
variants.

The queue also embedded `categories(name)` while `products` has both
`products_category_id_fkey` and `products_subcategory_id_fkey`. PostgREST could
not safely choose the relationship.

## Security impact

The Product Operations write boundary is implemented with `SECURITY DEFINER`.
The save/media functions and seven additional draft, variant, price,
publication and bulk functions previously checked organization and a functional
permission but did not consistently verify the caller's current or target
category scope. A user who knew an out-of-scope product ID could therefore
attempt a direct RPC call. `bulk_update_products` could also skip unknown IDs
after earlier rows had already been changed. The repair treats these as
authorization vulnerabilities, not only a UI bug.

## New access model

- `private.has_category_access(NULL)` is unchanged.
- `private.has_product_operations_scope(category_id)` is product-specific.
- An unclassified product requires canonical `product.edit`; each SELECT policy
  separately requires canonical `product.view`.
- A classified product continues to require `has_category_access(category_id)`.
- Warehouse Staff with `product.view` alone do not gain access to unclassified
  Product Operations rows.
- Owner and System Admin retain their global permission behavior.

## Helper definition

Migration `20260807131039_fix_product_operations_scope_security.sql` adds
`private.has_product_operations_scope(uuid)`. It is `STABLE`,
`SECURITY DEFINER`, uses an empty `search_path`, validates `auth.uid()`, and is
executable only by `authenticated` for use by RLS.

Two non-callable internal helpers centralize the privileged RPC checks:

- `private.can_view_product_for_operations(uuid)` requires authentication,
  organization membership, canonical `product.view`, and current product scope.
- `private.can_edit_product_for_operations(uuid)` additionally requires
  canonical `product.edit`.

They are not granted directly to browser roles; repaired `SECURITY DEFINER`
entry points call them while running under their fixed, empty `search_path`.

## Products RLS changes

- SELECT: organization + `product.view` + product-specific scope.
- INSERT: organization + `product.create` + product-specific scope.
- UPDATE USING: organization + `product.edit` + old product-specific scope.
- UPDATE WITH CHECK: organization + `product.edit` + new product-specific scope.

## Variant RLS changes

SELECT, INSERT and UPDATE follow the parent product's product-specific scope.
Existing SKU permissions remain operation-specific. Classified Warehouse data
access is preserved, while an unclassified parent additionally requires
`product.edit`.

## `rpc_save_product_operations` changes

The privileged implementation now explicitly validates:

1. authenticated caller and current organization;
2. canonical `product.view` and `product.edit`;
3. old product organization and category scope;
4. target category existence, active state and category scope;
5. subcategory membership under the selected parent category;
6. brand and supplier organization boundaries.

`products.manage` remains a legacy permission in historical migrations but is
not used by the repaired save path. It should be retired separately after all
remaining callers are migrated; this PR does not add new `products.*` keys.

## Expanded Product Operations RPC hardening

The same migration replaces the privileged implementations for:

| Function | Canonical permission and scope rule |
| --- | --- |
| `create_product_draft` | `product.create` + `product.edit`; a supplied target category must be in scope |
| `upsert_product_variant` | `sku.edit` + editable parent Product scope; color/size must belong to the organization |
| `set_product_channel_price` | `product.price.edit` + visible parent Product scope; channel/price book must belong to the organization |
| `validate_product_publication` | `product.publish` + visible Product scope before returning validation details |
| `publish_product_channel` | `product.publish` + visible Product scope + organization-owned channel |
| `unpublish_product_channel` | `product.unpublish` + visible Product scope + organization-owned channel |
| `bulk_update_products` | `product.view` + `product.edit`; every source Product and any target category is validated before writes |

`bulk_update_products` is now transactional all-or-nothing. Duplicate, missing,
cross-organization, or out-of-scope product IDs reject the request before the
first mutation. Category changes also clear a stale subcategory and validate
the target category scope. `products.archive` is retained only as documented
legacy compatibility for archive/restore; no new legacy permission is added.

All functions derive the actor from `auth.uid()` and the organization from the
authenticated profile. Client-supplied actor or organization identifiers are
never trusted. The internal `product_publication_errors` helper is no longer
directly executable by authenticated clients, preventing a validation-detail
information side channel.

Historical private implementations `save_catalog_product`, `publish_product`
and `unpublish_product` are also stripped of authenticated execution. Their
public wrappers were already disabled by Phase 2, but leaving the private
`SECURITY DEFINER` implementations callable would preserve a second legacy
write path around the repaired boundary.

## Media RPC changes

`private.can_manage_product_media(uuid)` centralizes authenticated user,
organization, `product.view`, `product.edit`, `media.manage`, and product scope
checks. Registration, soft deletion, ordering, and primary-image changes call
it before writing. Their empty `search_path` and authenticated-only execution
grants are retained.

## Queue query changes

The product queue explicitly embeds:

- `category:categories!products_category_id_fkey(name)`
- `brand:brands!products_brand_id_fkey(name)`

Unclassified rows display `未分类`. A failed product query now renders a retryable
error state and records details only in non-production developer diagnostics;
it is no longer presented as a valid empty queue.

## Automated tests

Added `supabase/tests/product_operations_scope_security.test.sql` with 50 pgTAP
assertions covering unclassified access, Warehouse denial, category A/B scope,
old/target category enforcement, all seven expanded RPCs, media enforcement,
variant inheritance, anonymous and cross-organization denial, explicit
permission deny precedence, Owner/System Admin regression, all-or-nothing bulk
behavior, immutable generic NULL semantics, function grants, disabled legacy
paths and empty `search_path`.

Application contract tests cover the helper, canonical permissions, media
guards, all seven scoped RPC implementations, bulk prevalidation, explicit FK
hints, `未分类`, and the non-silent error state.

## CI results

Local application checks completed successfully:

- ESLint: pass
- TypeScript: pass
- Node/application tests: 81 pass, 0 fail
- Vinext production build: pass
- Next.js/Netlify production build: pass
- PostgreSQL outer migration syntax parse: pass

GitHub Draft PR #19 checks completed successfully on commit `bc3cf65`:

- PR policy: pass
- Code quality and builds: pass
- Storefront quality and build: pass
- Secret scan: pass
- Dependency review: pass
- Migration and database tests: pass

The isolated database job verified a fresh replay of every migration,
Canonical base Seed, Staging Seed, migration filename/version uniqueness,
database lint, all 50 pgTAP assertions, local database type generation, zero
schema diff, and safe schema artifact export. No remote Supabase project was
used as a substitute.

## Migration version

`20260807131039_fix_product_operations_scope_security.sql`

## Staging deployment

Not applied yet. The Draft PR must pass all required checks before any merge or
Staging forward migration.

## Inventory baseline

Before deployment, reported Staging inventory for `TEST-DRESS-001`:

| Variant | Quantity |
| --- | ---: |
| Black | 28 |
| Brown | 13 |
| Red | 8 |
| Total | 49 |

No migration statement writes inventory, inbound receipts, or inventory
movements. Post-deployment values remain pending verification.

## Product Operator validation

Pending Staging deployment. The existing `TEST-DRESS-001` will be reused; no
replacement product will be created.

## Security validation

Fresh replay and automated database authorization tests pass. Live Staging API,
Storage object-policy and `TEST-DRESS-001` continuation testing remain pending a
separate approval to merge and deploy this Draft PR.

## Remaining risk

- Storage object policies require separate continuation testing after the
  metadata RPC fix is deployed.
- `products.archive` remains a legacy compatibility permission for the existing
  archive/restore operation and should be migrated in a separate permission-key
  cleanup.
- Read-only Storefront catalog functions and database trigger functions were
  inventoried but are not Product Operations mutation entry points; they remain
  outside this narrowly scoped repair.
- No Production schema or application deployment has been performed.

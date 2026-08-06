# Production 规范化 Schema 目录

生成时间：2026-08-06。通过只读系统目录查询生成；不含业务数据、连接字符串、密码或 Token。定义仅保存 MD5 签名，完整 SQL 不进入仓库。

## 概览

- Tables: 65
- Functions (public/private): 128
- Policies (public/storage): 192
- Indexes (public/storage): 376
- Browser/service table grant rows: 186

## Tables

| Table | RLS | Force RLS | Columns | Column signature | Constraint signature |
|---|---:|---:|---:|---|---|
| `audit_logs` | true | false | 11 | `152e3a309778cef5ab2aa40dc67fbe9b` | `65ead322263efe4a04b29f1d637b9981` |
| `brands` | true | false | 11 | `dd66f6cbb124997cb6ae0c125486da07` | `bfc2e56b43ee88f89a821a66b884656e` |
| `cash_movements` | true | false | 10 | `316e6e8d581f4a3892995e6b3946207d` | `7a983f30f4c92dccbd72d91091d4e09f` |
| `categories` | true | false | 12 | `0886639cc1f3a165cada21c2993964cd` | `1ce95120a8a2080ad7eafec07364c734` |
| `channels` | true | false | 11 | `be70a9566d9d9a8618169516952e673d` | `187c7cf667131394f3c2c32f7b427cde` |
| `colors` | true | false | 13 | `5856e0a84b0ae91f391b8f605e073051` | `ce0cfa2a946c6bc58afdef2a5c40eb19` |
| `customer_addresses` | true | false | 14 | `04f5a2d15a9e3ae0382e15177a78dd92` | `abd3dd142b2404968e877daee807885a` |
| `customers` | true | false | 9 | `b3edf21b3c6fe5eb6244e3c76f487b35` | `ea1e60d4d8f67b58a18102a8e2b0749d` |
| `employee_invitations` | true | false | 15 | `a366bf1809a51765bc99eeebfd5adb08` | `2bb27b0186bbb38a66122a9860711a65` |
| `employees` | true | false | 10 | `e83a375bbc013e31d84673bbda758a69` | `1fcf17d46b8523110ed71376ae288548` |
| `expenses` | true | false | 20 | `34ee87500c32b4d332db512b52e3c421` | `d6a34bba7b5fc1642d303b02ddbae1c1` |
| `financial_entries` | true | false | 19 | `f15bd55cf01f3a3ed5dab4d3255e85be` | `7d2f0d61598370235590712a3679221f` |
| `fulfillment_exceptions` | true | false | 15 | `0e20dd3612a84aeb752602d6de6a5122` | `0ec7c24893b081f4dc7f47dd4cfac200` |
| `inbound_order_items` | true | false | 12 | `1a97576805a514e6eacbe849678ed7ab` | `23c7fd841fd984f8fb23b44bb09adecc` |
| `inbound_orders` | true | false | 18 | `95fd7cf7e17d433fe75edf74e10f1bdd` | `48a27afacbffd31ba00a926a985db17f` |
| `inventory` | true | false | 14 | `0ed23b64ee3b4b6d26db42f09b01f389` | `a6db31cf38d20ef1c70ed074e3c3d1f9` |
| `inventory_movements` | true | false | 21 | `aada9f63ec9c5ee6593a24541646829f` | `86398736096837f8e5fcc5105fc7c42d` |
| `notifications` | true | false | 6 | `8642afae37bc229e9911290c78010a88` | `ceddeb07af75436073fab14a32100079` |
| `online_listings` | true | false | 15 | `a8fc65369e19ffe58d874fbf9b9bfcbf` | `089084721d7bdd199616d60a52b1b6c0` |
| `order_events` | true | false | 9 | `1b812ace93d25a749c51dd1f56c203db` | `d9f032ff1adbc0ac20e39891994d976f` |
| `order_items` | true | false | 21 | `452a2cbe4988ded87e3c92c0d4acd09a` | `42782955deb001d65a86b8720382a0ea` |
| `order_notes` | true | false | 7 | `dd78b033532ff049315ac46cbe64f63e` | `0ded3dbc2c22b6519e5d2b4e0d1fbe8d` |
| `orders` | true | false | 46 | `eb5d7b65b80ee2f79fa05961b7dec85d` | `ba6f9d4cb9137393d90eeb9714c61a09` |
| `organizations` | true | false | 9 | `a789167bdc331e2a600e466cb9cc22a5` | `91d78b8f3cd91b7a3c0dfdbb03016e74` |
| `outbox_events` | true | false | 13 | `b0b50b85c6ea6ef69a84216b9d4cf161` | `676983257732d90b22b27fb97d93513c` |
| `payments` | true | false | 15 | `23a5ae13e2ae105d440803fefcff4f57` | `1f0756640b8a533b1423c10c12b6f9ab` |
| `permissions` | true | false | 8 | `54e48bcd55dc57298bac584504779c71` | `86fc96caf25b9e5736e24b20b0da9442` |
| `pos_sessions` | true | false | 20 | `5c45ec9d291ce35219d87e33e33aeee1` | `e5d321004a34edd690b9499828a1129c` |
| `price_book_items` | true | false | 14 | `ce4884c85fb7227a5ad06e4d6546cfaa` | `332feab25f36f85bcbcd8833e950899f` |
| `price_books` | true | false | 14 | `1fe0626d4a9996df07f187d8ac17e7f5` | `65bdc3fdc2b5251df4b54439d57be346` |
| `product_images` | true | false | 22 | `b46fa9541c3a482bb65272530f03ae86` | `7cea35051f96ed74f027db065bddc3b8` |
| `product_publications` | true | false | 15 | `2020afcae156609dcb01d593796d0c90` | `958d8bf8426dc6ec23f0ea801999610a` |
| `product_tag_relations` | true | false | 2 | `6dbbbf979dc7cd9167ea2e162b23e9ca` | `a5f8fbcec9c4ab1a8fb46432a92e463e` |
| `product_tags` | true | false | 3 | `c2d242a77b04c0f7c9627c31b34393a8` | `0e88bc5c1bf5baf927b9a5eefda96e34` |
| `product_variants` | true | false | 13 | `d33b35ba0eb4451d583bf7318478576a` | `39ca4096f0c0a1f5cedd1de73c2cf49c` |
| `products` | true | false | 63 | `f083e20017958d48c1d161fe16a7a25b` | `0f1e2bb786ff92a4ea9fdb4543fd2bd4` |
| `profiles` | true | false | 8 | `6e007e75cb166307aa6ec66826121bd0` | `657dfaa2655ca82f4ead12c17d6f32b0` |
| `purchase_order_items` | true | false | 14 | `d0faeed6d0fd03901a755c5f7b2a375a` | `cecdc4d066f86b6a23e7bc881e64083b` |
| `purchase_orders` | true | false | 22 | `01da240d4b5ba82899b90127d00cc6b0` | `683ca0da3f55c5afa6bb89f342b542ef` |
| `purchase_payments` | true | false | 12 | `9dadb7200a883506ceb2581ce798f938` | `23aae739d64b27ef2da578c826ea01e5` |
| `refunds` | true | false | 19 | `2649933328aaa4676b89a967ccbaade7` | `d6d18a5c8444ce0271adf07830b56846` |
| `return_items` | true | false | 15 | `71be63d0baf8b1935e46a4fd24779702` | `c8fc1470da2768eda58bf56b2c106fa0` |
| `returns` | true | false | 21 | `0064c0bfbd644c1a05f9b55d192a7f35` | `68b1e3e7c3b9f5a75a3dbd03572b7efc` |
| `role_permissions` | true | false | 2 | `cc2e2e6b1949c3f90f53ee782fa8200c` | `d2252e0413cfcd7f0689510bfa2b3508` |
| `roles` | true | false | 9 | `7e264b41ba5c44073f16d103a30a766e` | `bfdcc4bfcd48dd35af82bee36bafda74` |
| `settings` | true | false | 4 | `7200c38545182ead05db38c9f296a751` | `46e2b7a55f03c3e71307355e52b85e1e` |
| `shipment_items` | true | false | 13 | `9830f45fc283488732555d1dff4e2283` | `bc2c0cdc31248c58cc9c44a6e8f30ae9` |
| `shipments` | true | false | 22 | `0a750eb29b023b6e240496873325d917` | `71988701d2f9ff175bda078b10845daf` |
| `shopping_cart_items` | true | false | 7 | `2829b4607af9a9af82a45e4b2e02080d` | `8031c0c5ed3acb50fee6a4ba058758f9` |
| `shopping_carts` | true | false | 5 | `0f6f07d94fa75139f5e3d802d3d498ad` | `4be4b6afd122e12c1f65ce0a414f4abe` |
| `sizes` | true | false | 12 | `dc0868923d16bd6777f77ff9c0929074` | `2108d948497e8968abb6e74bc0e0a7b4` |
| `staff_invitations` | true | false | 12 | `27a9332b848fca88e8468b4fa0261e17` | `251f5faca023cd8d4a1e3d32346d0b8c` |
| `stock_adjustments` | true | false | 9 | `71e2185645ca93fd551387d7c1c1371c` | `6c36b12db37536a8fa01c2df65d57b01` |
| `stock_receipt_attachments` | true | false | 10 | `ad2eaeb9e23008d1cbfb205b516c511d` | `47205c5c5b2970e60faf73c80bded2eb` |
| `stock_receipt_exceptions` | true | false | 8 | `7aa28568eb2f38ee3781d291e09fe2b9` | `1ff971294ba4a521b40ee7158278ca66` |
| `stock_receipt_items` | true | false | 21 | `0356a4ae12ff4f6f6e9d49e8f92db5fc` | `3b6ffd5d65183aa1de983452f13aee6c` |
| `stock_receipt_raw_lines` | true | false | 8 | `252d7e8d760db0ceaaedc638157c05aa` | `9498f1c0f20c0160745a22892e3aa4bb` |
| `stock_receipts` | true | false | 28 | `5d88953b753792ff05fe9442af525ca1` | `8bf80f3491d87d72713864ace8978d5f` |
| `stock_reservations` | true | false | 16 | `475c21cd44aabd8a06676ae7ac50a267` | `3ebae636001214cd89716d7a539f6b68` |
| `suppliers` | true | false | 19 | `a23b939d44f989cdb8dc4c866a46c628` | `bd705cc3195fa312d0dec6fc87cf8c58` |
| `user_category_scopes` | true | false | 5 | `3557b90e5edac1b0e24da182114fe0d0` | `59392f9dafd908c10c508428f35b5c06` |
| `user_permissions` | true | false | 5 | `668686fa1e8496e1f6eafc63bff46785` | `f20116832ceff9f8765bb8d069aa9bc0` |
| `user_roles` | true | false | 4 | `5267481e7a740b549c6403dfa77a187e` | `8a33ef2d936aa44b17e40e6d8b950851` |
| `user_warehouses` | true | false | 6 | `bb97358f27f0968dcabb80e51a7e835d` | `dc4b40ed0f4d0ed817d5459d3d995c2d` |
| `warehouses` | true | false | 9 | `1da0ac3dcb556b5cc36fa85191ba48d0` | `41da64a2e5c720712fd447e69046177c` |

## Functions

| Function | Returns | Definer | Volatility | Config | ACL | Definition signature |
|---|---|---:|---|---|---|---|
| `private.adjust_inventory_stock(p_inventory_id uuid, p_counted_quantity integer, p_reason text, p_notes text)` | jsonb | true | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres} | `6274306631003d98b62ccd9d88029b07` |
| `private.append_financial_entry(p_organization_id uuid, p_source_type text, p_source_id uuid, p_source_no text, p_entry_type text, p_direction text, p_amount numeric, p_tax numeric, p_currency text, p_occurred_at timestamp with time zone, p_channel_id uuid, p_location_id uuid, p_actor_id uuid, p_key text, p_description text, p_reversal_of uuid)` | uuid | true | v | search_path="" | {postgres=X/postgres} | `bb6c86c4b50da3d7162e55eac6371395` |
| `private.assert_command_key(p_key text)` | text | false | i | search_path="" | {postgres=X/postgres} | `2be46c2ce8f2939377b4a3f1b45feb47` |
| `private.bulk_update_products(p_product_ids uuid[], p_action text, p_value text)` | jsonb | true | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres} | `d6172819a8a9571d16d815dab3dfc8ea` |
| `private.cancel_fast_inbound(p_inbound_order_id uuid, p_reason text)` | jsonb | true | v | search_path="",statement_timeout=15s | {postgres=X/postgres,authenticated=X/postgres} | `533a86f86df89653aac0d969c6aa6d7b` |
| `private.capture_order_cost()` | trigger | true | v | search_path="" | {postgres=X/postgres} | `d5793980a9d865f63132d22714da8231` |
| `private.check_storefront_rate_limit(p_request_id uuid, p_action text, p_guest_session_id text)` | void | true | v | search_path=extensions | {postgres=X/postgres} | `19ba100d81f9638714a47b03730ffa8e` |
| `private.complete_pos_sale(p_session_id uuid, p_cart jsonb, p_payments jsonb, p_idempotency_key text, p_request_id uuid)` | jsonb | true | v | search_path=extensions | {postgres=X/postgres} | `ce816d24e0f49018c387d49a89773d9e` |
| `private.confirm_fast_inbound(p_items jsonb, p_notes text, p_warehouse_id uuid, p_idempotency_key text)` | jsonb | true | v | search_path="",statement_timeout=15s | {postgres=X/postgres,authenticated=X/postgres} | `87d9a2a09fc06043ad4e34179a692a82` |
| `private.confirm_stock_receipt(p_receipt_id uuid)` | jsonb | true | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `f1fe3f9e5a42ce116bbdc6f5fc06db68` |
| `private.consume_order_stock(p_order_id uuid, p_shipment_id uuid, p_idempotency_key text, p_request_id uuid)` | jsonb | true | v | search_path="" | {postgres=X/postgres} | `189463c65ef7cd10f57d76de31307479` |
| `private.create_inbound_color(p_name_zh text, p_code text, p_hex_value text)` | jsonb | true | v | search_path="",statement_timeout=5s | {postgres=X/postgres,authenticated=X/postgres} | `5f17d39b7b1d63d8351d07d2fff90c39` |
| `private.create_online_order(p_items jsonb, p_fulfillment_type text, p_shipping_address jsonb, p_shipping_fee numeric, p_customer_note text, p_idempotency_key text)` | jsonb | true | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `8f211ae8afc45a66c52fad5a3fbab833` |
| `private.create_product_draft(p_payload jsonb)` | jsonb | true | v | search_path="",statement_timeout=10s | {postgres=X/postgres,authenticated=X/postgres} | `77d9b8cb07b6609e1156b352e4592e6f` |
| `private.create_stock_receipt(p_header jsonb, p_raw_lines jsonb, p_items jsonb)` | jsonb | true | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres} | `ab8cd029307efbf5115ee20c0d865a56` |
| `private.create_storefront_order(p_items jsonb, p_fulfillment_method text, p_contact jsonb, p_shipping_address jsonb, p_customer_note text, p_idempotency_key text, p_guest_session_id text, p_request_id uuid)` | jsonb | true | v | search_path=extensions | {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `2428a50ff2eb593cb7b92c28551c7020` |
| `private.current_organization_id()` | uuid | true | s | search_path="" | {postgres=X/postgres,authenticated=X/postgres} | `ecb608ef80ee8fa675bdf58b2e2d7c94` |
| `private.execute_finance_command(p_entity_type text, p_entity_id uuid, p_command text, p_payload jsonb, p_idempotency_key text, p_request_id uuid)` | jsonb | true | v | search_path=extensions | {postgres=X/postgres} | `0af20a1095bddfafe383681f3b542b61` |
| `private.execute_order_command(p_order_id uuid, p_command text, p_payload jsonb, p_idempotency_key text, p_request_id uuid)` | jsonb | true | v | search_path=extensions | {postgres=X/postgres} | `6493503f34091079f8900cefd6c2fb1b` |
| `private.execute_pos_session_command(p_session_id uuid, p_command text, p_payload jsonb, p_idempotency_key text, p_request_id uuid)` | jsonb | true | v | search_path=extensions | {postgres=X/postgres} | `65a90f90050a86294a88d3418b3f7dfc` |
| `private.execute_purchase_order_command(p_purchase_order_id uuid, p_command text, p_payload jsonb, p_idempotency_key text, p_request_id uuid)` | jsonb | true | v | search_path=extensions | {postgres=X/postgres} | `9e7329baf68319739a53317de4a98bb7` |
| `private.execute_return_command(p_return_id uuid, p_command text, p_payload jsonb, p_idempotency_key text, p_request_id uuid)` | jsonb | true | v | search_path="" | {postgres=X/postgres} | `03905e712e073b022eef2d3932ae914d` |
| `private.expire_stale_orders(p_limit integer)` | integer | true | v | search_path="" | {postgres=X/postgres} | `f900c6707088608e6b69ca89796460f9` |
| `private.finish_business_command(p_organization_id uuid, p_key text, p_command text, p_result jsonb)` | jsonb | false | v | search_path="" | {postgres=X/postgres} | `ec1dcd1cbd34e1454e6290039cc4613e` |
| `private.get_business_metrics(p_from date, p_to date, p_channel_id uuid, p_location_id uuid)` | jsonb | true | v | search_path="" | {postgres=X/postgres} | `ad3089882b865c40902a67098da8c55e` |
| `private.get_my_authorization()` | jsonb | true | s | search_path="" | {postgres=X/postgres,authenticated=X/postgres} | `8db453be09087e6d3f27624c2f3a9f5f` |
| `private.get_storefront_catalog(p_slug text, p_limit integer)` | jsonb | true | s | search_path="" | {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `dae2e6e72cde9b418b2eb8e9bf628638` |
| `private.get_storefront_order(p_order_id uuid, p_lookup_token text, p_request_id uuid)` | jsonb | true | v | search_path=extensions | {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `c7eefe9898594005d3a3ca0d0922cb71` |
| `private.has_all_permissions(required_permissions text[])` | boolean | true | s | search_path="" | {postgres=X/postgres,authenticated=X/postgres} | `a631eddb9c297470ca24bfe740fb48de` |
| `private.has_app_role(required_roles text[])` | boolean | true | s | search_path="" | {postgres=X/postgres,authenticated=X/postgres} | `22a8fe6405475cb3bb4c4a95a0973cad` |
| `private.has_category_access(required_category_id uuid)` | boolean | true | s | search_path="" | <default PUBLIC> | `413fa7edc56092fa31ab4af27f0724ba` |
| `private.has_permission(required_permission text)` | boolean | true | s | search_path="" | {postgres=X/postgres,authenticated=X/postgres} | `3e4211b2ba8782c87e4f4b3fefeb9411` |
| `private.has_role(required_roles text[])` | boolean | true | s | search_path="" | {postgres=X/postgres,authenticated=X/postgres} | `afadfb7b9286c38e9966983f7e238c98` |
| `private.has_warehouse_access(required_warehouse_id uuid)` | boolean | true | s | search_path="" | {postgres=X/postgres,authenticated=X/postgres} | `15078a86b4acea763073d1f43e564f6b` |
| `private.is_global_operator()` | boolean | true | s | search_path="" | <default PUBLIC> | `bf86ae7c26b5100c5348b3f364bc4776` |
| `private.is_global_warehouse_operator()` | boolean | true | s | search_path="" | {postgres=X/postgres,authenticated=X/postgres} | `90739c2aa9aa75aeda0960330ea9a1ea` |
| `private.manage_product_image(p_product_id uuid, p_image_id uuid, p_action text)` | jsonb | true | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres} | `651ad7c917c1f177394721f896d16853` |
| `private.merge_customer_cart(p_items jsonb, p_request_id uuid)` | jsonb | true | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `96d96dcb9172d44f15b9424b2f117fff` |
| `private.next_document_no(p_organization_id uuid, p_type text, p_prefix text, p_date date)` | text | true | v | search_path="" | {postgres=X/postgres} | `201f958a5fc2226f7d9ea2d5590f8258` |
| `private.next_inbound_number(p_inbound_date date)` | text | true | v | search_path="" | {postgres=X/postgres} | `548ac75254b013065ecc352ef012dcc1` |
| `private.normalize_order_phase4_states()` | trigger | false | v | search_path="" | {postgres=X/postgres} | `369b762c02b13121cda229ffe21fa320` |
| `private.normalize_product_identifiers()` | trigger | false | v | search_path="" | {postgres=X/postgres} | `069d74af885f37e4d62ba76848dacd95` |
| `private.normalize_variant_sku()` | trigger | false | v | search_path="" | {postgres=X/postgres} | `0028af132aaefdfc01cea9143a290370` |
| `private.number_order()` | trigger | false | v | search_path="" | <default PUBLIC> | `6e310dc755d29fdb23af714472b0fb5d` |
| `private.number_receipt()` | trigger | false | v | search_path="" | <default PUBLIC> | `4535a25ebe819cb688920533e505077d` |
| `private.post_fast_inbound_receipt(p_items jsonb, p_warehouse_id uuid, p_supplier_id uuid, p_supplier_reference text, p_arrival_date date, p_notes text, p_idempotency_key text)` | jsonb | true | v | search_path="",statement_timeout=15s | {postgres=X/postgres} | `1a552595275fb3ea09041bdcffc83833` |
| `private.post_return(p_return_id uuid, p_dispositions jsonb, p_idempotency_key text, p_request_id uuid)` | jsonb | true | v | search_path="" | {postgres=X/postgres} | `28b8cc34ec8b515c5444fc274a9f31c7` |
| `private.prevent_immutable_change()` | trigger | false | v | search_path="" | {postgres=X/postgres} | `263d9054994a6f7275da612567ed5cdc` |
| `private.product_publication_errors(p_product_id uuid, p_channel_id uuid, p_organization_id uuid)` | jsonb | true | s | search_path="" | {postgres=X/postgres,authenticated=X/postgres} | `7922ae1570c179bffbb8b4df4744bbd3` |
| `private.protect_profile_security_fields()` | trigger | true | v | search_path="" | {postgres=X/postgres} | `a857ab9ee0a1131f70e03695a80bdd2a` |
| `private.publish_product(p_product_id uuid)` | jsonb | true | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `a3a0122379a6fb8bac96ff24dcf314f0` |
| `private.publish_product_channel(p_product_id uuid, p_channel_id uuid, p_scheduled_at timestamp with time zone)` | jsonb | true | v | search_path="",statement_timeout=10s | {postgres=X/postgres,authenticated=X/postgres} | `164627cd0bdad226bad5eec7973fc4c4` |
| `private.receive_purchase_order(p_purchase_order_id uuid, p_items jsonb, p_idempotency_key text, p_request_id uuid)` | jsonb | true | v | search_path=extensions | {postgres=X/postgres} | `b35b4ae43180cc4ddf111e4ac028cdfc` |
| `private.register_product_media(p_product_id uuid, p_variant_id uuid, p_storage_path text, p_mime_type text, p_file_size bigint, p_width integer, p_height integer, p_media_type text, p_alt_text_zh text, p_alt_text_it text, p_alt_text_en text, p_is_primary boolean)` | uuid | true | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres} | `c7f14377b626627e70c41e9ff0f9235e` |
| `private.release_order_stock(p_order_id uuid, p_reason text, p_idempotency_key text, p_request_id uuid)` | jsonb | true | v | search_path="" | {postgres=X/postgres} | `d182fffa0e9fe972f2a8949e7a782ce3` |
| `private.request_return(p_order_id uuid, p_items jsonb, p_reason text, p_customer_note text, p_idempotency_key text, p_request_id uuid)` | jsonb | true | v | search_path="" | {postgres=X/postgres} | `818e9ff5d905b91fb76260581642c620` |
| `private.save_catalog_product(p_product_id uuid, p_product jsonb, p_variants jsonb)` | jsonb | true | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres} | `b0e49bbc597d63d2d942c8bcdb0a71c4` |
| `private.save_product_operations(p_product_id uuid, p_payload jsonb)` | jsonb | true | v | search_path="",statement_timeout=10s | {postgres=X/postgres,authenticated=X/postgres} | `9fc0e0f984a95c5dcb7904a802c6c210` |
| `private.save_received_quantities(p_receipt_id uuid, p_items jsonb)` | jsonb | true | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres} | `6958116ec4da8102c55aa1d7fd37727a` |
| `private.set_inventory_online_limit(p_inventory_id uuid, p_limit integer)` | jsonb | true | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres} | `609b6d92c8890936b0da505432b75b51` |
| `private.set_product_channel_price(p_product_id uuid, p_channel_id uuid, p_variant_id uuid, p_unit_price numeric, p_compare_at_price numeric, p_valid_from timestamp with time zone, p_valid_until timestamp with time zone)` | jsonb | true | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres} | `337d7bc4259b6a9d8df5f99bbe23765e` |
| `private.set_updated_at()` | trigger | false | v | search_path="" | <default PUBLIC> | `2fd62250fe5bc492f7b3b5bb9224986f` |
| `private.soft_delete_product_media(p_product_id uuid, p_media_id uuid)` | text | true | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres} | `4e28f75e6600b05bc3c56858654b155f` |
| `private.storefront_available_quantity(p_variant_id uuid)` | integer | true | s | search_path="" | {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `4ccb507ad64600399ec098eda66274a9` |
| `private.sync_inbound_workflow_status()` | trigger | false | v | search_path="" | {postgres=X/postgres} | `d75d7083686f390b33e45dbd516eb4d0` |
| `private.sync_payment_financial_entry()` | trigger | true | v | search_path="" | {postgres=X/postgres} | `8f70856eb615646772c532b65950382c` |
| `private.sync_published_product_listing()` | trigger | true | v | search_path="" | {postgres=X/postgres} | `a99f3a53eb887404c0e7cd33573e2290` |
| `private.sync_refund_financial_entry()` | trigger | true | v | search_path="" | {postgres=X/postgres} | `df54f0fb4a57aa8f210c2a80cf047423` |
| `private.transition_inbound_receipt(p_receipt_id uuid, p_target_status text, p_reason text)` | jsonb | true | v | search_path="" | {postgres=X/postgres} | `8f79f131dad6fb0cc086179aa3be1ff8` |
| `private.transition_order_inventory(p_order_id uuid, p_target_status order_status)` | jsonb | true | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `5c382bf40ae0d2ab91f57209ca98c258` |
| `private.transition_order_status(p_order_id uuid, p_target_status order_status)` | jsonb | true | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres} | `61fd03d2c61911f9bf896fc6b4eeacbd` |
| `private.unpublish_product(p_product_id uuid)` | jsonb | true | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres} | `6fa626dd5905b7b6049fc4221ede2faf` |
| `private.unpublish_product_channel(p_product_id uuid, p_channel_id uuid)` | jsonb | true | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres} | `372a43eb8466f3f081b12ff428d9c56c` |
| `private.upsert_product_variant(p_product_id uuid, p_variant_id uuid, p_color_id uuid, p_size_id uuid, p_sku text, p_barcode text, p_is_active boolean, p_is_visible_online boolean, p_sort_order integer)` | jsonb | true | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres} | `e7c7f83249dec0e637901a90f53da16d` |
| `private.uuid_min_state(current_value uuid, next_value uuid)` | uuid | false | i | search_path="" | {postgres=X/postgres} | `799a1ef9a3ee969bf64c5b5611b19f8b` |
| `private.validate_product_publication(p_product_id uuid, p_channel_id uuid)` | jsonb | true | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres} | `73ed912a4b6b9c0bf6c18c6f63edd463` |
| `public.adjust_inventory_stock(p_inventory_id uuid, p_counted_quantity integer, p_reason text, p_notes text)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `ee3f830ed5dd8fe0d62e13b0b6e943b5` |
| `public.cancel_inbound_order(p_inbound_order_id uuid, p_reason text)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `43e1edda6e95873e67b9eb2c6617a609` |
| `public.confirm_inbound_order(p_items jsonb, p_notes text, p_warehouse_id uuid, p_idempotency_key text)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `50e04df1de4cf48651589780d855e4fe` |
| `public.confirm_stock_receipt(p_receipt_id uuid)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `919a2e97fb38898a74deed12288f2a6e` |
| `public.create_inbound_color(p_name_zh text, p_code text, p_hex_value text)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `67f4d01cab8a5e733ab90f610cd31556` |
| `public.create_online_order(p_items jsonb, p_fulfillment_type text, p_shipping_address jsonb, p_shipping_fee numeric, p_customer_note text, p_idempotency_key text)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `3a6471fe40a0fa295a59585c17824f5c` |
| `public.create_stock_receipt(p_header jsonb, p_raw_lines jsonb, p_items jsonb)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `5107a627cb8cd16d2a429c5153fbd5c8` |
| `public.get_my_authorization()` | jsonb | false | s | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `91da3b14fdb9e4ae6722e728a730fe31` |
| `public.handle_new_user()` | trigger | true | v | search_path="" | {postgres=X/postgres,service_role=X/postgres} | `d53ca096e2001b56502aaba6ebe84369` |
| `public.manage_product_image(p_product_id uuid, p_image_id uuid, p_action text)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `04503c1f7de1368d6e419f303ad85126` |
| `public.publish_product(p_product_id uuid)` | jsonb | false | v | search_path="" | {postgres=X/postgres,service_role=X/postgres} | `6b06ad67bfe1c6af506ad97e512a1659` |
| `public.rls_auto_enable()` | event_trigger | true | v | search_path=pg_catalog | {postgres=X/postgres,service_role=X/postgres} | `6998ea6b4c2480f5d2e34b5dcf3f8d36` |
| `public.rpc_bulk_update_products(p_product_ids uuid[], p_action text, p_value text)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `2cf0ff6afd75613df1795c835b27d3a8` |
| `public.rpc_business_metrics(p_from date, p_to date, p_channel_id uuid, p_location_id uuid)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `ad03d76362b1bfa397a1cde595785820` |
| `public.rpc_complete_employee_registration(p_token_hash text, p_auth_user_id uuid, p_email text, p_employee_name text)` | jsonb | true | v | search_path="" | {postgres=X/postgres,service_role=X/postgres} | `66e0dcbc47d210938caadb82a91f8b89` |
| `public.rpc_complete_pos_sale(p_session_id uuid, p_cart jsonb, p_payments jsonb, p_idempotency_key text, p_request_id uuid)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `f385c4cb09106d34d5aa792bf57163aa` |
| `public.rpc_consume_order_stock(p_order_id uuid, p_shipment_id uuid, p_idempotency_key text, p_request_id uuid)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `14cb6ba6a1bd748e93c1673e1ce2887c` |
| `public.rpc_create_product_draft(p_payload jsonb)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `ac1f611f6054444a0edb0dace475787e` |
| `public.rpc_create_staff_invitation(p_email text, p_full_name text, p_role_code text, p_token text)` | TABLE(invitation_id uuid, email text, expires_at timestamp with time zone) | true | v | search_path="" | {postgres=X/postgres,service_role=X/postgres} | `682c1b016b14edb054a0b9dc3a1138e4` |
| `public.rpc_create_storefront_order(p_items jsonb, p_fulfillment_method text, p_contact jsonb, p_shipping_address jsonb, p_customer_note text, p_idempotency_key text, p_guest_session_id text, p_request_id uuid)` | jsonb | false | v | search_path="" | {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `8907528a5bd571174a8d1f74522f35ee` |
| `public.rpc_finance_command(p_entity_type text, p_entity_id uuid, p_command text, p_payload jsonb, p_idempotency_key text, p_request_id uuid)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `e563fef464ccda7d8a950aebeb29c0fb` |
| `public.rpc_force_employee_logout(p_user_id uuid)` | integer | true | v | search_path="" | {postgres=X/postgres,service_role=X/postgres} | `cad537dde45ed644fb0496c5dfb7f604` |
| `public.rpc_get_storefront_catalog(p_slug text, p_limit integer)` | jsonb | false | s | search_path="" | {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `1098a3856987db49b876ecb1a412f1ae` |
| `public.rpc_get_storefront_order(p_order_id uuid, p_lookup_token text, p_request_id uuid)` | jsonb | false | v | search_path="" | {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `1e6ddfe058235219e3a2746874ec4ed6` |
| `public.rpc_list_staff_accounts()` | TABLE(id uuid, email text, full_name text, role text, is_active boolean, created_at timestamp with time zone, last_sign_in_at timestamp with time zone) | true | v | search_path="" | {postgres=X/postgres,service_role=X/postgres} | `05e571b08c79975227db2ea3b0e6dff2` |
| `public.rpc_merge_customer_cart(p_items jsonb, p_request_id uuid)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `af967e2b0187e498636e3f469478e935` |
| `public.rpc_order_command(p_order_id uuid, p_command text, p_payload jsonb, p_idempotency_key text, p_request_id uuid)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `19567ec4fea40d6e8e396bbd316abaab` |
| `public.rpc_pos_session_command(p_session_id uuid, p_command text, p_payload jsonb, p_idempotency_key text, p_request_id uuid)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `74238cf5b1bc4bffbb0c25bdde7c01ce` |
| `public.rpc_post_inbound_receipt(p_items jsonb, p_warehouse_id uuid, p_supplier_id uuid, p_supplier_reference text, p_arrival_date date, p_notes text, p_idempotency_key text)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `b55a1f4040ee427d04e5b66c76e8b86b` |
| `public.rpc_post_return(p_return_id uuid, p_dispositions jsonb, p_idempotency_key text, p_request_id uuid)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `dde554f6511a85f2f6df5e92300a70a0` |
| `public.rpc_publish_product_channel(p_product_id uuid, p_channel_id uuid, p_scheduled_at timestamp with time zone)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `4b997910dfc68d87103a26dede54b8e9` |
| `public.rpc_purchase_order_command(p_purchase_order_id uuid, p_command text, p_payload jsonb, p_idempotency_key text, p_request_id uuid)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `4422cb3915a1a898c06cefe138079613` |
| `public.rpc_receive_purchase_order(p_purchase_order_id uuid, p_items jsonb, p_idempotency_key text, p_request_id uuid)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `6c4e0c1f0f90841fa84867e936f70dfb` |
| `public.rpc_register_product_media(p_product_id uuid, p_variant_id uuid, p_storage_path text, p_mime_type text, p_file_size bigint, p_width integer, p_height integer, p_media_type text, p_alt_text_zh text, p_alt_text_it text, p_alt_text_en text, p_is_primary boolean)` | uuid | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `cf5144140e727aed471e0b99144a50cb` |
| `public.rpc_release_order_stock(p_order_id uuid, p_reason text, p_idempotency_key text, p_request_id uuid)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `00b0396ad35974b97fb578ffc78d8db7` |
| `public.rpc_request_return(p_order_id uuid, p_items jsonb, p_reason text, p_customer_note text, p_idempotency_key text, p_request_id uuid)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `735fa4f8a306d80c3546fba851803671` |
| `public.rpc_return_command(p_return_id uuid, p_command text, p_payload jsonb, p_idempotency_key text, p_request_id uuid)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `f31848704e6fbb25f5ef4a3e2f7f0611` |
| `public.rpc_save_product_operations(p_product_id uuid, p_payload jsonb)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `166132ce5b0e8b83afc8994e4f9fc2a6` |
| `public.rpc_set_product_channel_price(p_product_id uuid, p_channel_id uuid, p_variant_id uuid, p_unit_price numeric, p_compare_at_price numeric, p_valid_from timestamp with time zone, p_valid_until timestamp with time zone)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `a4963dfad9c92976e3b851868765897b` |
| `public.rpc_soft_delete_product_media(p_product_id uuid, p_media_id uuid)` | text | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `c40df55113cf9fe5c6ced01dc44bd3e7` |
| `public.rpc_transition_inbound_receipt(p_receipt_id uuid, p_target_status text, p_reason text)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `44688578857da7265f5b59c8399c05d0` |
| `public.rpc_unpublish_product_channel(p_product_id uuid, p_channel_id uuid)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `5edd77dc24c1e5a479fe52f80172ba13` |
| `public.rpc_update_staff_account(p_user_id uuid, p_full_name text, p_role_code text, p_is_active boolean)` | void | true | v | search_path="" | {postgres=X/postgres,service_role=X/postgres} | `9d3e36567241594bc37ceabda3dc9c80` |
| `public.rpc_upsert_product_variant(p_product_id uuid, p_variant_id uuid, p_color_id uuid, p_size_id uuid, p_sku text, p_barcode text, p_is_active boolean, p_is_visible_online boolean, p_sort_order integer)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `64042a805da9c56b3500d3820ef25f37` |
| `public.rpc_validate_product_publication(p_product_id uuid, p_channel_id uuid)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `ddaaa8c77aad56ccc830854ee33e9b2e` |
| `public.rpc_validate_staff_invitation(p_email text, p_token text)` | TABLE(valid boolean, full_name text, role_label text) | true | s | search_path="" | {postgres=X/postgres,service_role=X/postgres} | `8f266cfd64c4404f7b924d4aeaced6ae` |
| `public.save_catalog_product(p_product_id uuid, p_product jsonb, p_variants jsonb)` | jsonb | false | v | search_path="" | {postgres=X/postgres,service_role=X/postgres} | `27100b783078c68ce7f6e6c5e7d873aa` |
| `public.save_received_quantities(p_receipt_id uuid, p_items jsonb)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `1b2472ee9d2ed5b3d43ba505eef50e3f` |
| `public.set_inventory_online_limit(p_inventory_id uuid, p_limit integer)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `42e68717358cc4462a700714f8aab309` |
| `public.transition_order_inventory(p_order_id uuid, p_target_status order_status)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `143d114c059d3fb996109a7b056edcad` |
| `public.transition_order_status(p_order_id uuid, p_target_status order_status)` | jsonb | false | v | search_path="" | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | `c528f772fe47c28847a8bbdc4d83fa2b` |
| `public.unpublish_product(p_product_id uuid)` | jsonb | false | v | search_path="" | {postgres=X/postgres,service_role=X/postgres} | `05e05d7b48b6ab74270cb2f857b7d19c` |

## Policies

| Object | Policy | Mode | Roles | Command | USING signature | CHECK signature |
|---|---|---|---|---|---|---|
| `public.audit_logs` | audit_owner_read | PERMISSIVE | {authenticated} | SELECT | `ab1881c9a11f2319217182bcf01a3273` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.audit_logs` | organization_isolation_audit_logs | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.brands` | anon_read_brands | PERMISSIVE | {anon} | SELECT | `b326b5062b2f0e69046810717534cb09` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.brands` | authenticated_read_brands | PERMISSIVE | {authenticated} | SELECT | `b326b5062b2f0e69046810717534cb09` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.brands` | manage_delete_brands | PERMISSIVE | {authenticated} | DELETE | `bfffe93fc5f99dba6af30626d2964575` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.brands` | manage_insert_brands | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `bfffe93fc5f99dba6af30626d2964575` |
| `public.brands` | manage_update_brands | PERMISSIVE | {authenticated} | UPDATE | `bfffe93fc5f99dba6af30626d2964575` | `bfffe93fc5f99dba6af30626d2964575` |
| `public.brands` | organization_isolation_brands | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.cash_movements` | cash_movements_read | PERMISSIVE | {authenticated} | SELECT | `b3aa9d2a61bc31d124eda94e3e97fa63` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.cash_movements` | organization_isolation_cash_movements | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.categories` | anon_read_categories | PERMISSIVE | {anon} | SELECT | `4264c638e0098acb172519b0436db099` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.categories` | rbac_categories_delete | PERMISSIVE | {authenticated} | DELETE | `398b4aaa3c2c86ccfcc95e96e804b320` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.categories` | rbac_categories_insert | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `398b4aaa3c2c86ccfcc95e96e804b320` |
| `public.categories` | rbac_categories_select | PERMISSIVE | {authenticated} | SELECT | `3ca0dd6c003030e3007e8a0f519495f6` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.categories` | rbac_categories_update | PERMISSIVE | {authenticated} | UPDATE | `398b4aaa3c2c86ccfcc95e96e804b320` | `398b4aaa3c2c86ccfcc95e96e804b320` |
| `public.channels` | internal_read_channels | PERMISSIVE | {authenticated} | SELECT | `4e2ae92f2b7b4ebbce89db475f94eac1` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.channels` | organization_isolation_channels | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.colors` | anon_read_colors | PERMISSIVE | {anon} | SELECT | `4264c638e0098acb172519b0436db099` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.colors` | authenticated_read_colors | PERMISSIVE | {authenticated} | SELECT | `67728edf3623e4a144427199d7f18d09` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.colors` | manage_delete_colors | PERMISSIVE | {authenticated} | DELETE | `bfffe93fc5f99dba6af30626d2964575` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.colors` | manage_insert_colors | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `bfffe93fc5f99dba6af30626d2964575` |
| `public.colors` | manage_update_colors | PERMISSIVE | {authenticated} | UPDATE | `bfffe93fc5f99dba6af30626d2964575` | `bfffe93fc5f99dba6af30626d2964575` |
| `public.colors` | organization_isolation_colors | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.customer_addresses` | addresses_self | PERMISSIVE | {authenticated} | ALL | `6e32f5fd1af9b5900257399f463a6912` | `6e32f5fd1af9b5900257399f463a6912` |
| `public.customers` | customer_self | PERMISSIVE | {authenticated} | ALL | `c778c06b8b516cb97a96969fe120a0e0` | `c778c06b8b516cb97a96969fe120a0e0` |
| `public.employee_invitations` | employee_invitations_deny_direct_access | PERMISSIVE | {authenticated} | ALL | `68934a3e9455fa72420237eb05902327` | `68934a3e9455fa72420237eb05902327` |
| `public.employees` | employees_self_or_admin | PERMISSIVE | {authenticated} | SELECT | `4cefeac59da226d91a11316c62257901` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.expenses` | expenses_read | PERMISSIVE | {authenticated} | SELECT | `904db188eb2fddcaa066094126e09dfb` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.expenses` | organization_isolation_expenses | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.financial_entries` | financial_entries_read | PERMISSIVE | {authenticated} | SELECT | `3ede0e50c0595134b2bf9f2c27eab872` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.financial_entries` | organization_isolation_financial_entries | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.fulfillment_exceptions` | organization_isolation_fulfillment_exceptions | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.fulfillment_exceptions` | phase4_staff_read_exceptions | PERMISSIVE | {authenticated} | SELECT | `ec2f08c6350940c9718fb46093179628` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.inbound_order_items` | receiving_insert_inbound_order_items | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `f2e14b77e2ab63ce88a396ebc58ad4d4` |
| `public.inbound_order_items` | receiving_select_inbound_order_items | PERMISSIVE | {authenticated} | SELECT | `8e38f96025c547ba7a71388bf12ba854` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.inbound_order_items` | receiving_update_inbound_order_items | PERMISSIVE | {authenticated} | UPDATE | `79dc9740de36b2e7ecf1c03ffc7d8566` | `79dc9740de36b2e7ecf1c03ffc7d8566` |
| `public.inbound_orders` | receiving_delete_inbound_orders | PERMISSIVE | {authenticated} | DELETE | `a9666f5b465942a8d5d1750a49002eca` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.inbound_orders` | receiving_insert_inbound_orders | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `bff87a7e61fe3b7c41f441dcbcaa6c1d` |
| `public.inbound_orders` | receiving_select_inbound_orders | PERMISSIVE | {authenticated} | SELECT | `0fecf2db97f4bb6a0e7708242cfe7fe1` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.inbound_orders` | receiving_update_inbound_orders | PERMISSIVE | {authenticated} | UPDATE | `0432244b41251e62e5ba3681b3e80b71` | `0432244b41251e62e5ba3681b3e80b71` |
| `public.inventory` | receiving_insert_inventory | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `d6a8affac6b468116a820dcf67d1420a` |
| `public.inventory` | receiving_select_inventory | PERMISSIVE | {authenticated} | SELECT | `4c2a8749a3a88741b79545f6728f19a5` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.inventory` | receiving_update_inventory | PERMISSIVE | {authenticated} | UPDATE | `b8c147b2c93b771aee0b5ff3052bc9a9` | `8c1e6cb819f0365989bee8ee7b24d251` |
| `public.inventory_movements` | receiving_insert_inventory_movements | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `0da9d41b262a520daa2fd003f36c245a` |
| `public.inventory_movements` | receiving_select_inventory_movements | PERMISSIVE | {authenticated} | SELECT | `b43dbcca444a49a251ddfb7d00d62bf1` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.notifications` | notifications_delete | PERMISSIVE | {authenticated} | DELETE | `440eaa1f9b2d310132b1ff8e41ae52ad` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.notifications` | notifications_insert | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `440eaa1f9b2d310132b1ff8e41ae52ad` |
| `public.notifications` | notifications_select | PERMISSIVE | {authenticated} | SELECT | `89ae76ab5393550743736a8aa14aadfe` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.notifications` | notifications_update | PERMISSIVE | {authenticated} | UPDATE | `06e7667fddf88e71e42db0da1418c9c9` | `06e7667fddf88e71e42db0da1418c9c9` |
| `public.online_listings` | anon_read_listings | PERMISSIVE | {anon} | SELECT | `cf8431b9b53483a964bb103de161611b` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.online_listings` | authenticated_read_listings | PERMISSIVE | {authenticated} | SELECT | `99e7d17f77095d4baadc8aed30868312` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.online_listings` | manage_delete_online_listings | PERMISSIVE | {authenticated} | DELETE | `bfffe93fc5f99dba6af30626d2964575` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.online_listings` | manage_insert_online_listings | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `bfffe93fc5f99dba6af30626d2964575` |
| `public.online_listings` | manage_update_online_listings | PERMISSIVE | {authenticated} | UPDATE | `bfffe93fc5f99dba6af30626d2964575` | `bfffe93fc5f99dba6af30626d2964575` |
| `public.order_events` | organization_isolation_order_events | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.order_events` | phase4_order_events_read | PERMISSIVE | {authenticated} | SELECT | `10700bba0bae3aee883b53265e26a7e3` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.order_items` | manage_delete_order_items | PERMISSIVE | {authenticated} | DELETE | `440eaa1f9b2d310132b1ff8e41ae52ad` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.order_items` | manage_insert_order_items | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `440eaa1f9b2d310132b1ff8e41ae52ad` |
| `public.order_items` | manage_update_order_items | PERMISSIVE | {authenticated} | UPDATE | `440eaa1f9b2d310132b1ff8e41ae52ad` | `440eaa1f9b2d310132b1ff8e41ae52ad` |
| `public.order_items` | order_items_customer_or_staff_select | PERMISSIVE | {authenticated} | SELECT | `b4d14cc156b099fc6d7e4aa68fcd41ef` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.order_notes` | organization_isolation_order_notes | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.order_notes` | phase4_staff_read_notes | PERMISSIVE | {authenticated} | SELECT | `609597bde5bdd55f5e9a659c3edef52d` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.orders` | manage_delete_orders | PERMISSIVE | {authenticated} | DELETE | `440eaa1f9b2d310132b1ff8e41ae52ad` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.orders` | manage_insert_orders | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `440eaa1f9b2d310132b1ff8e41ae52ad` |
| `public.orders` | manage_update_orders | PERMISSIVE | {authenticated} | UPDATE | `440eaa1f9b2d310132b1ff8e41ae52ad` | `440eaa1f9b2d310132b1ff8e41ae52ad` |
| `public.orders` | orders_customer_or_staff_select | PERMISSIVE | {authenticated} | SELECT | `834ad33de472bc295e5d0d18c5f0e8ed` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.orders` | phase4_organization_isolation_orders | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.organizations` | organization_member_read | PERMISSIVE | {authenticated} | SELECT | `db8a54c7de0fc02524f8de6a63093e59` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.outbox_events` | organization_isolation_outbox_events | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.outbox_events` | phase4_outbox_admin_read | PERMISSIVE | {authenticated} | SELECT | `313b5d73223eff6ea2fe91350d050c40` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.payments` | manage_delete_payments | PERMISSIVE | {authenticated} | DELETE | `440eaa1f9b2d310132b1ff8e41ae52ad` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.payments` | manage_insert_payments | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `440eaa1f9b2d310132b1ff8e41ae52ad` |
| `public.payments` | manage_update_payments | PERMISSIVE | {authenticated} | UPDATE | `440eaa1f9b2d310132b1ff8e41ae52ad` | `440eaa1f9b2d310132b1ff8e41ae52ad` |
| `public.payments` | phase4_organization_isolation_payments | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.payments` | staff_select_payments | PERMISSIVE | {authenticated} | SELECT | `21841ecc426eebe2cec37c59bee25584` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.permissions` | owner_permissions | PERMISSIVE | {authenticated} | ALL | `ab1881c9a11f2319217182bcf01a3273` | `ab1881c9a11f2319217182bcf01a3273` |
| `public.pos_sessions` | organization_isolation_pos_sessions | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.pos_sessions` | pos_sessions_read | PERMISSIVE | {authenticated} | SELECT | `d57a0d1b1f603bea077310a53d199815` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.price_book_items` | internal_read_price_book_items | PERMISSIVE | {authenticated} | SELECT | `4e2ae92f2b7b4ebbce89db475f94eac1` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.price_book_items` | organization_isolation_price_book_items | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.price_books` | internal_read_price_books | PERMISSIVE | {authenticated} | SELECT | `4e2ae92f2b7b4ebbce89db475f94eac1` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.price_books` | organization_isolation_price_books | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.product_images` | authenticated_staff_read_images | PERMISSIVE | {authenticated} | SELECT | `4e2ae92f2b7b4ebbce89db475f94eac1` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.product_images` | manage_delete_product_images | PERMISSIVE | {authenticated} | DELETE | `bfffe93fc5f99dba6af30626d2964575` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.product_images` | manage_insert_product_images | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `bfffe93fc5f99dba6af30626d2964575` |
| `public.product_images` | manage_update_product_images | PERMISSIVE | {authenticated} | UPDATE | `bfffe93fc5f99dba6af30626d2964575` | `bfffe93fc5f99dba6af30626d2964575` |
| `public.product_images` | organization_isolation_product_images | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.product_publications` | internal_read_product_publications | PERMISSIVE | {authenticated} | SELECT | `4e2ae92f2b7b4ebbce89db475f94eac1` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.product_publications` | organization_isolation_product_publications | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.product_tag_relations` | manage_delete_product_tag_relations | PERMISSIVE | {authenticated} | DELETE | `bfffe93fc5f99dba6af30626d2964575` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.product_tag_relations` | manage_insert_product_tag_relations | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `bfffe93fc5f99dba6af30626d2964575` |
| `public.product_tag_relations` | manage_update_product_tag_relations | PERMISSIVE | {authenticated} | UPDATE | `bfffe93fc5f99dba6af30626d2964575` | `bfffe93fc5f99dba6af30626d2964575` |
| `public.product_tag_relations` | staff_select_product_tag_relations | PERMISSIVE | {authenticated} | SELECT | `21841ecc426eebe2cec37c59bee25584` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.product_tags` | manage_delete_product_tags | PERMISSIVE | {authenticated} | DELETE | `bfffe93fc5f99dba6af30626d2964575` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.product_tags` | manage_insert_product_tags | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `bfffe93fc5f99dba6af30626d2964575` |
| `public.product_tags` | manage_update_product_tags | PERMISSIVE | {authenticated} | UPDATE | `bfffe93fc5f99dba6af30626d2964575` | `bfffe93fc5f99dba6af30626d2964575` |
| `public.product_tags` | staff_select_product_tags | PERMISSIVE | {authenticated} | SELECT | `21841ecc426eebe2cec37c59bee25584` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.product_variants` | rbac_variants_delete | PERMISSIVE | {authenticated} | DELETE | `0de77884e6e1a65bf398f2e0fcc20226` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.product_variants` | rbac_variants_insert | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `9c8f037e4debf254f759d6082a26da2f` |
| `public.product_variants` | rbac_variants_select | PERMISSIVE | {authenticated} | SELECT | `fdca5ccae1e28c2f1b6958f81c9cf49d` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.product_variants` | rbac_variants_update | PERMISSIVE | {authenticated} | UPDATE | `09e7ff95638e78345841d8304704f350` | `09e7ff95638e78345841d8304704f350` |
| `public.products` | rbac_products_delete | PERMISSIVE | {authenticated} | DELETE | `ad95b5b0ba3f1425fc96ca99347a681a` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.products` | rbac_products_insert | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `3f76e6301b70523383080b6a5aa7776c` |
| `public.products` | rbac_products_select | PERMISSIVE | {authenticated} | SELECT | `e562a13c6d491e34fc426a41b58a36f1` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.products` | rbac_products_update | PERMISSIVE | {authenticated} | UPDATE | `bbc307ee21c173c6a16cf312062b954b` | `bbc307ee21c173c6a16cf312062b954b` |
| `public.profiles` | organization_isolation_profiles | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.profiles` | profile_internal_read | PERMISSIVE | {authenticated} | SELECT | `d3b210eabb6ec4494d9e8bb762f3f285` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.profiles` | profile_internal_update | PERMISSIVE | {authenticated} | UPDATE | `d3b210eabb6ec4494d9e8bb762f3f285` | `d3b210eabb6ec4494d9e8bb762f3f285` |
| `public.purchase_order_items` | organization_isolation_purchase_order_items | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.purchase_order_items` | purchase_order_items_read | PERMISSIVE | {authenticated} | SELECT | `1caf6e21984b7d5f235830eb3528023b` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.purchase_orders` | organization_isolation_purchase_orders | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.purchase_orders` | purchase_orders_read | PERMISSIVE | {authenticated} | SELECT | `1caf6e21984b7d5f235830eb3528023b` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.purchase_payments` | organization_isolation_purchase_payments | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.purchase_payments` | purchase_payments_read | PERMISSIVE | {authenticated} | SELECT | `904db188eb2fddcaa066094126e09dfb` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.refunds` | organization_isolation_refunds | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.refunds` | phase4_refunds_read | PERMISSIVE | {authenticated} | SELECT | `12cdaf10d2071027c245ff8d52307467` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.return_items` | organization_isolation_return_items | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.return_items` | phase4_return_items_read | PERMISSIVE | {authenticated} | SELECT | `13b2df82e694a18ce8ba86231d81a7fa` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.returns` | manage_delete_returns | PERMISSIVE | {authenticated} | DELETE | `440eaa1f9b2d310132b1ff8e41ae52ad` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.returns` | manage_insert_returns | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `440eaa1f9b2d310132b1ff8e41ae52ad` |
| `public.returns` | manage_update_returns | PERMISSIVE | {authenticated} | UPDATE | `440eaa1f9b2d310132b1ff8e41ae52ad` | `440eaa1f9b2d310132b1ff8e41ae52ad` |
| `public.returns` | phase4_organization_isolation_returns | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.returns` | phase4_returns_read | PERMISSIVE | {authenticated} | SELECT | `244da392fc02220d66e2f7c140841888` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.role_permissions` | owner_role_permissions | PERMISSIVE | {authenticated} | ALL | `ab1881c9a11f2319217182bcf01a3273` | `ab1881c9a11f2319217182bcf01a3273` |
| `public.roles` | organization_isolation_roles | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.roles` | owner_roles | PERMISSIVE | {authenticated} | ALL | `ab1881c9a11f2319217182bcf01a3273` | `ab1881c9a11f2319217182bcf01a3273` |
| `public.settings` | settings_owner_delete | PERMISSIVE | {authenticated} | DELETE | `440eaa1f9b2d310132b1ff8e41ae52ad` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.settings` | settings_owner_insert | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `440eaa1f9b2d310132b1ff8e41ae52ad` |
| `public.settings` | settings_owner_update | PERMISSIVE | {authenticated} | UPDATE | `440eaa1f9b2d310132b1ff8e41ae52ad` | `440eaa1f9b2d310132b1ff8e41ae52ad` |
| `public.settings` | settings_staff_select | PERMISSIVE | {authenticated} | SELECT | `21841ecc426eebe2cec37c59bee25584` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.shipment_items` | organization_isolation_shipment_items | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.shipment_items` | phase4_staff_read_shipment_items | PERMISSIVE | {authenticated} | SELECT | `ec2f08c6350940c9718fb46093179628` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.shipments` | manage_delete_shipments | PERMISSIVE | {authenticated} | DELETE | `440eaa1f9b2d310132b1ff8e41ae52ad` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.shipments` | manage_insert_shipments | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `440eaa1f9b2d310132b1ff8e41ae52ad` |
| `public.shipments` | manage_update_shipments | PERMISSIVE | {authenticated} | UPDATE | `440eaa1f9b2d310132b1ff8e41ae52ad` | `440eaa1f9b2d310132b1ff8e41ae52ad` |
| `public.shipments` | phase4_organization_isolation_shipments | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.shipments` | phase4_staff_read_shipments | PERMISSIVE | {authenticated} | SELECT | `ec2f08c6350940c9718fb46093179628` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.shopping_cart_items` | cart_items_self | PERMISSIVE | {authenticated} | ALL | `060f591af56b8ddee9c374962c2d1477` | `060f591af56b8ddee9c374962c2d1477` |
| `public.shopping_carts` | carts_self | PERMISSIVE | {authenticated} | ALL | `6e32f5fd1af9b5900257399f463a6912` | `6e32f5fd1af9b5900257399f463a6912` |
| `public.sizes` | anon_read_sizes | PERMISSIVE | {anon} | SELECT | `4264c638e0098acb172519b0436db099` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.sizes` | authenticated_read_sizes | PERMISSIVE | {authenticated} | SELECT | `67728edf3623e4a144427199d7f18d09` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.sizes` | manage_delete_sizes | PERMISSIVE | {authenticated} | DELETE | `bfffe93fc5f99dba6af30626d2964575` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.sizes` | manage_insert_sizes | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `bfffe93fc5f99dba6af30626d2964575` |
| `public.sizes` | manage_update_sizes | PERMISSIVE | {authenticated} | UPDATE | `bfffe93fc5f99dba6af30626d2964575` | `bfffe93fc5f99dba6af30626d2964575` |
| `public.sizes` | organization_isolation_sizes | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.staff_invitations` | staff_invitations_deny_direct_access | PERMISSIVE | {anon,authenticated} | ALL | `68934a3e9455fa72420237eb05902327` | `68934a3e9455fa72420237eb05902327` |
| `public.stock_adjustments` | manage_delete_stock_adjustments | PERMISSIVE | {authenticated} | DELETE | `2c97bc3c89646e161114abcd36a7ecdc` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.stock_adjustments` | manage_insert_stock_adjustments | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `2c97bc3c89646e161114abcd36a7ecdc` |
| `public.stock_adjustments` | manage_update_stock_adjustments | PERMISSIVE | {authenticated} | UPDATE | `2c97bc3c89646e161114abcd36a7ecdc` | `2c97bc3c89646e161114abcd36a7ecdc` |
| `public.stock_adjustments` | staff_select_stock_adjustments | PERMISSIVE | {authenticated} | SELECT | `21841ecc426eebe2cec37c59bee25584` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.stock_receipt_attachments` | warehouse_staff_all_receipt_attachments | PERMISSIVE | {authenticated} | ALL | `d9ba1f3419fcdea076a8acd3d42f6cf0` | `d9ba1f3419fcdea076a8acd3d42f6cf0` |
| `public.stock_receipt_exceptions` | manage_delete_stock_receipt_exceptions | PERMISSIVE | {authenticated} | DELETE | `2c97bc3c89646e161114abcd36a7ecdc` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.stock_receipt_exceptions` | manage_insert_stock_receipt_exceptions | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `2c97bc3c89646e161114abcd36a7ecdc` |
| `public.stock_receipt_exceptions` | manage_update_stock_receipt_exceptions | PERMISSIVE | {authenticated} | UPDATE | `2c97bc3c89646e161114abcd36a7ecdc` | `2c97bc3c89646e161114abcd36a7ecdc` |
| `public.stock_receipt_exceptions` | staff_select_stock_receipt_exceptions | PERMISSIVE | {authenticated} | SELECT | `21841ecc426eebe2cec37c59bee25584` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.stock_receipt_items` | receiving_delete_stock_receipt_items | PERMISSIVE | {authenticated} | DELETE | `ad011cc5d6a745581b54666f27c00ae9` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.stock_receipt_items` | receiving_insert_stock_receipt_items | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `469c919fda1e6bf010f234cf4200241f` |
| `public.stock_receipt_items` | receiving_select_stock_receipt_items | PERMISSIVE | {authenticated} | SELECT | `a9aac1d26d86686881eb3b94bc859cba` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.stock_receipt_items` | receiving_update_stock_receipt_items | PERMISSIVE | {authenticated} | UPDATE | `b9540b083a6ea085cccc74f5defd95de` | `b9540b083a6ea085cccc74f5defd95de` |
| `public.stock_receipt_raw_lines` | manage_delete_stock_receipt_raw_lines | PERMISSIVE | {authenticated} | DELETE | `2c97bc3c89646e161114abcd36a7ecdc` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.stock_receipt_raw_lines` | manage_insert_stock_receipt_raw_lines | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `2c97bc3c89646e161114abcd36a7ecdc` |
| `public.stock_receipt_raw_lines` | manage_update_stock_receipt_raw_lines | PERMISSIVE | {authenticated} | UPDATE | `2c97bc3c89646e161114abcd36a7ecdc` | `2c97bc3c89646e161114abcd36a7ecdc` |
| `public.stock_receipt_raw_lines` | staff_select_stock_receipt_raw_lines | PERMISSIVE | {authenticated} | SELECT | `21841ecc426eebe2cec37c59bee25584` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.stock_receipts` | receiving_delete_stock_receipts | PERMISSIVE | {authenticated} | DELETE | `a9666f5b465942a8d5d1750a49002eca` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.stock_receipts` | receiving_insert_stock_receipts | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `bff87a7e61fe3b7c41f441dcbcaa6c1d` |
| `public.stock_receipts` | receiving_select_stock_receipts | PERMISSIVE | {authenticated} | SELECT | `0fecf2db97f4bb6a0e7708242cfe7fe1` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.stock_receipts` | receiving_update_stock_receipts | PERMISSIVE | {authenticated} | UPDATE | `0432244b41251e62e5ba3681b3e80b71` | `0432244b41251e62e5ba3681b3e80b71` |
| `public.stock_reservations` | stock_reservations_customer_or_staff_select | PERMISSIVE | {authenticated} | SELECT | `c772e6d0f18c874ddc74aa28eeed73a9` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.suppliers` | manage_delete_suppliers | PERMISSIVE | {authenticated} | DELETE | `440eaa1f9b2d310132b1ff8e41ae52ad` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.suppliers` | manage_insert_suppliers | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `440eaa1f9b2d310132b1ff8e41ae52ad` |
| `public.suppliers` | manage_update_suppliers | PERMISSIVE | {authenticated} | UPDATE | `440eaa1f9b2d310132b1ff8e41ae52ad` | `440eaa1f9b2d310132b1ff8e41ae52ad` |
| `public.suppliers` | organization_isolation_suppliers | RESTRICTIVE | {authenticated} | ALL | `3b7f0a98d2ad20f8f082b9a4d404f3c5` | `3b7f0a98d2ad20f8f082b9a4d404f3c5` |
| `public.suppliers` | staff_select_suppliers | PERMISSIVE | {authenticated} | SELECT | `21841ecc426eebe2cec37c59bee25584` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.user_category_scopes` | user_category_scopes_self_or_admin | PERMISSIVE | {authenticated} | SELECT | `4cefeac59da226d91a11316c62257901` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.user_permissions` | user_permissions_self_or_admin | PERMISSIVE | {authenticated} | SELECT | `4cefeac59da226d91a11316c62257901` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.user_roles` | owner_user_roles | PERMISSIVE | {authenticated} | ALL | `ab1881c9a11f2319217182bcf01a3273` | `ab1881c9a11f2319217182bcf01a3273` |
| `public.user_warehouses` | user_warehouses_delete_admin | PERMISSIVE | {authenticated} | DELETE | `9616cb2d514e22987aa3f791b24bab98` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.user_warehouses` | user_warehouses_insert_admin | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `4a444cb0f7dfecad91100b16e596d75f` |
| `public.user_warehouses` | user_warehouses_select_self | PERMISSIVE | {authenticated} | SELECT | `df3d8b740b1b1866037d0a6b6831e792` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.user_warehouses` | user_warehouses_update_admin | PERMISSIVE | {authenticated} | UPDATE | `e722715e6ce607d73e7fe48c004b4812` | `4a444cb0f7dfecad91100b16e596d75f` |
| `public.warehouses` | rbac_warehouses_delete | PERMISSIVE | {authenticated} | DELETE | `398b4aaa3c2c86ccfcc95e96e804b320` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.warehouses` | rbac_warehouses_insert | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `398b4aaa3c2c86ccfcc95e96e804b320` |
| `public.warehouses` | rbac_warehouses_select | PERMISSIVE | {authenticated} | SELECT | `6bbc4ad25e3067a5341e19052e90d553` | `d41d8cd98f00b204e9800998ecf8427e` |
| `public.warehouses` | rbac_warehouses_update | PERMISSIVE | {authenticated} | UPDATE | `398b4aaa3c2c86ccfcc95e96e804b320` | `398b4aaa3c2c86ccfcc95e96e804b320` |
| `storage.objects` | product_media_member_read | PERMISSIVE | {authenticated} | SELECT | `e859f96daf18fb37ed49cedc3a41e759` | `d41d8cd98f00b204e9800998ecf8427e` |
| `storage.objects` | product_media_operator_delete | PERMISSIVE | {authenticated} | DELETE | `e9e745a077b6709ebe6415a3db49e14b` | `d41d8cd98f00b204e9800998ecf8427e` |
| `storage.objects` | product_media_operator_insert | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `2541e0118edd5538cfb2e1fb4597afe8` |
| `storage.objects` | product_media_operator_update | PERMISSIVE | {authenticated} | UPDATE | `e9e745a077b6709ebe6415a3db49e14b` | `e9e745a077b6709ebe6415a3db49e14b` |
| `storage.objects` | receipt_scans_staff_delete | PERMISSIVE | {authenticated} | DELETE | `84ad4b9155b700d4e27c25a3e1c1ff0d` | `d41d8cd98f00b204e9800998ecf8427e` |
| `storage.objects` | receipt_scans_staff_insert | PERMISSIVE | {authenticated} | INSERT | `d41d8cd98f00b204e9800998ecf8427e` | `84ad4b9155b700d4e27c25a3e1c1ff0d` |
| `storage.objects` | receipt_scans_staff_select | PERMISSIVE | {authenticated} | SELECT | `84ad4b9155b700d4e27c25a3e1c1ff0d` | `d41d8cd98f00b204e9800998ecf8427e` |
| `storage.objects` | receipt_scans_staff_update | PERMISSIVE | {authenticated} | UPDATE | `84ad4b9155b700d4e27c25a3e1c1ff0d` | `84ad4b9155b700d4e27c25a3e1c1ff0d` |

## Indexes

| Object | Index | Definition signature |
|---|---|---|
| `public.audit_logs` | audit_logs_organization_id_idx | `8752f555f44fa33d1fc13b2feab02f05` |
| `public.audit_logs` | audit_logs_pkey | `317c79cee841cd6d7153250cf6d9e107` |
| `public.audit_logs` | audit_logs_user_id_idx | `77a8ba74d13c6b4489162fb8dd26cb2a` |
| `public.brands` | brands_active_sort_idx | `7f42a60f6df37accd75f4c1b56d7efa5` |
| `public.brands` | brands_name_key | `b102d3dcac4e87f122c9becce841ee06` |
| `public.brands` | brands_org_slug_unique_idx | `16d4aa6348c35989ed2e55ee732ec512` |
| `public.brands` | brands_organization_id_idx | `27bd4b10b0ccded5266d0f71a688616d` |
| `public.brands` | brands_pkey | `ae45118b61ff0fa6dbd210a794b75402` |
| `public.cash_movements` | cash_movements_created_by_idx | `daf74e127b6324679cbcca6aec724e5a` |
| `public.cash_movements` | cash_movements_organization_idx | `98fd325e04c7a3d4a0a02f76ddad23b5` |
| `public.cash_movements` | cash_movements_pkey | `bf99cf7c4a95deff274225d6f9ee5e72` |
| `public.cash_movements` | cash_movements_session_idx | `96c586311a431adef2dd0c0073bddc64` |
| `public.categories` | categories_organization_id_idx | `b57b7145f712cbc93388f9846e0fa6a3` |
| `public.categories` | categories_parent_id_idx | `a0129257ae2ce4b807ced62ed5e8a2b9` |
| `public.categories` | categories_parent_sort_idx | `03f020ffab16c0a01389eca2f632a61c` |
| `public.categories` | categories_pkey | `030682f495d43219c9b4afe62dc802ff` |
| `public.categories` | categories_slug_key | `7334e94fd7d18c40bc180aec483e20b2` |
| `public.channels` | channels_created_by_idx | `a8e7bd22ca29cfeb197953c29943b5ce` |
| `public.channels` | channels_organization_id_code_key | `fee2f1b6d3d0304141ada3a8cc116782` |
| `public.channels` | channels_pkey | `441a83f223fd955c85a650f8f95a8160` |
| `public.channels` | channels_updated_by_idx | `0564390b585d7c328da8c7fac40d160b` |
| `public.colors` | colors_active_sort_idx | `fa432d90d8481f06a1bf6e64369bae9f` |
| `public.colors` | colors_code_unique_idx | `c33b9bb347753bf6b8b7055585312839` |
| `public.colors` | colors_name_key | `09990865e3e58f991bdce2bff4416319` |
| `public.colors` | colors_normalized_name_key | `84b656c6a476560898bc6c2d73460315` |
| `public.colors` | colors_organization_id_idx | `80a52c6dbaaf8c08db680441e279ce74` |
| `public.colors` | colors_pkey | `238d8563defc20059655ba6509cc91fe` |
| `public.customer_addresses` | customer_addresses_customer_id_idx | `0318620c56599d3919e04b6358655d85` |
| `public.customer_addresses` | customer_addresses_one_default_idx | `d98b756e84d8e66301a77eaa621e5c39` |
| `public.customer_addresses` | customer_addresses_pkey | `35e422050aeab4dc9ff93478a6055995` |
| `public.customers` | customers_pkey | `b2df34d35701c38489542666b6769f13` |
| `public.employee_invitations` | employee_invitations_invited_by_idx | `6a5dc9ae0c1bad9501531d69290fbada` |
| `public.employee_invitations` | employee_invitations_org_email_idx | `a1464b15771607594e85756ba67a4fcc` |
| `public.employee_invitations` | employee_invitations_pending_idx | `b558b3f7115b7de27d9bbe37a85a6e3e` |
| `public.employee_invitations` | employee_invitations_pkey | `967a276b9dbd965bb42504bcfeaa1e43` |
| `public.employee_invitations` | employee_invitations_role_idx | `efc4f80d512415657dcd168f9ce020ee` |
| `public.employee_invitations` | employee_invitations_token_hash_key | `9928dc5793b1cd88af3a0c04779bca4b` |
| `public.employee_invitations` | employee_invitations_token_key | `c383643af5a0724aa925658c5870603d` |
| `public.employee_invitations` | employee_invitations_used_by_idx | `4f2396606e64537d778a662e724a2daf` |
| `public.employee_invitations` | employee_invitations_warehouse_idx | `6d9bd6c03af34f516d7dbbc9d9953738` |
| `public.employees` | employees_invited_by_idx | `2ef31a0deec911b63b6af63e9b7d4d5e` |
| `public.employees` | employees_org_idx | `4263a8e4d657e5498c5a6a6fcb28ed04` |
| `public.employees` | employees_organization_id_email_key | `2856832d7ae9af936e52b3fb7a590b3f` |
| `public.employees` | employees_pkey | `84caceb6cb43171486307084f0060ea0` |
| `public.expenses` | expenses_approved_by_idx | `b7ce5ae5f8097604fc689436ebf8e876` |
| `public.expenses` | expenses_created_by_idx | `252b05084f36627b429ce2f8e49af3b6` |
| `public.expenses` | expenses_organization_id_expense_no_key | `800fb4a84525e3179ea480a01b10580a` |
| `public.expenses` | expenses_pkey | `c978673d4363333f5b742bb30036098d` |
| `public.expenses` | expenses_status_date_idx | `1d7d32fdf0d4042e6858bfa4d2b8874d` |
| `public.expenses` | expenses_supplier_idx | `12f3e5f4cc64cc1cb5e7ff161c343158` |
| `public.expenses` | expenses_updated_by_idx | `c4bfc2297113e44dd6d46e473af89ace` |
| `public.financial_entries` | financial_entries_actor_idx | `f64b6ac0f9462a723a4e128714798437` |
| `public.financial_entries` | financial_entries_channel_idx | `4c01d763ec3176172163b7f050a01862` |
| `public.financial_entries` | financial_entries_location_idx | `0175e2b21aad62d4896f741c93dbb8b6` |
| `public.financial_entries` | financial_entries_organization_id_idempotency_key_key | `e85f551167c87cbeda4db6e6046f02cf` |
| `public.financial_entries` | financial_entries_period_idx | `98d4220d9deb82380c410b416cb4ffbc` |
| `public.financial_entries` | financial_entries_pkey | `047201260176ef9254c01e6571384034` |
| `public.financial_entries` | financial_entries_reversal_idx | `c480358de87aadbb6b157f214b11df74` |
| `public.financial_entries` | financial_entries_source_idx | `195e0201041ce4311f926f082a0da422` |
| `public.fulfillment_exceptions` | fulfillment_exceptions_created_by_idx | `0f7d2f886b9e3199881a41f5fb85315a` |
| `public.fulfillment_exceptions` | fulfillment_exceptions_order_idx | `c79302ae5eda18668ba98c58d0e9e088` |
| `public.fulfillment_exceptions` | fulfillment_exceptions_order_item_idx | `f04cbd544b8ed92a209fa5bdd56aca8a` |
| `public.fulfillment_exceptions` | fulfillment_exceptions_organization_idx | `23dfbe690b0a953eca9bf1ead4bbacb4` |
| `public.fulfillment_exceptions` | fulfillment_exceptions_pkey | `19cdbbf667ba75ee969ead2a59173aa8` |
| `public.fulfillment_exceptions` | fulfillment_exceptions_queue_idx | `27ae209a0e7730cc8b7ce56f4ef26d19` |
| `public.fulfillment_exceptions` | fulfillment_exceptions_resolved_by_idx | `9e6a4dbd47af88f9c019a9ef9e027128` |
| `public.fulfillment_exceptions` | fulfillment_exceptions_shipment_idx | `1606a4d0f8026220e39f198004f4a9b7` |
| `public.inbound_order_items` | inbound_order_items_color_idx | `88e5c337cbbcb8496aa4446c20a69964` |
| `public.inbound_order_items` | inbound_order_items_inbound_order_id_variant_id_key | `2a7bbfa2859c5e5cc2f2e8895136e5a5` |
| `public.inbound_order_items` | inbound_order_items_order_idx | `65158f051facd143e39101e141ca1303` |
| `public.inbound_order_items` | inbound_order_items_organization_id_idx | `57de1c0520c72ccaf73d107514183058` |
| `public.inbound_order_items` | inbound_order_items_pkey | `789bae10ea4bf42947cb69c120e5d6e8` |
| `public.inbound_order_items` | inbound_order_items_product_idx | `a8e0d2c7e76f1f217b5e71bd223dbf49` |
| `public.inbound_order_items` | inbound_order_items_size_id_idx | `2f6add5fcc43505e8212f89c2ee8524f` |
| `public.inbound_order_items` | inbound_order_items_variant_idx | `ebd9878950cd5b4be1738f5fac85f8e0` |
| `public.inbound_orders` | inbound_orders_confirmed_by_idx | `8522854bcd9d99a23e2253761dbbf694` |
| `public.inbound_orders` | inbound_orders_created_by_created_at_idx | `276927452275be8689eef38d2b844cee` |
| `public.inbound_orders` | inbound_orders_creator_idempotency_idx | `687c7c18880732e5b7243b42ebde3345` |
| `public.inbound_orders` | inbound_orders_inbound_number_key | `133f4aa1eee596b2e40c13ffe85482b2` |
| `public.inbound_orders` | inbound_orders_organization_id_idx | `52bdd5f19ee04f104c1b76dea2978ad2` |
| `public.inbound_orders` | inbound_orders_pkey | `240c393c982c66e1fc6f992cc5706d9f` |
| `public.inbound_orders` | inbound_orders_status_created_at_idx | `a4fb650222672e47a43dd10a11768bbc` |
| `public.inbound_orders` | inbound_orders_supplier_id_idx | `b89d2977d78d32646f15bd8ef9197565` |
| `public.inbound_orders` | inbound_orders_warehouse_id_idx | `86479371acde947522e990c0d97f439b` |
| `public.inventory` | inventory_organization_id_idx | `cbb530329a38ec90605215a5b627b389` |
| `public.inventory` | inventory_pkey | `ae3ceaae4990da10910a383d2a63d6a7` |
| `public.inventory` | inventory_variant_id_warehouse_id_key | `d36d0e77cf844cff5b7488254fea2ddf` |
| `public.inventory` | inventory_warehouse_id_idx | `fc44d5cd0101b0aa9e16bacc535fc5ce` |
| `public.inventory_movements` | inventory_movements_created_by_idx | `950687fb952ff72eff4423af1a6c7b4a` |
| `public.inventory_movements` | inventory_movements_inventory_item_created_idx | `00cd7008407bfa487310beeac6b48997` |
| `public.inventory_movements` | inventory_movements_organization_id_idx | `41bcfddc098a2711e9b8c54fa6dfed70` |
| `public.inventory_movements` | inventory_movements_pkey | `bcd8fd818f9b2d5f061de3017d8f4657` |
| `public.inventory_movements` | inventory_movements_reference_idx | `e65a46da7106e1a91960ba63dba41a22` |
| `public.inventory_movements` | inventory_movements_request_reference_unique_idx | `4ce93b33fe5d222a59159182d74e9b1d` |
| `public.inventory_movements` | inventory_movements_variant_created_idx | `87799360b445a597042472c1b83650f2` |
| `public.inventory_movements` | inventory_movements_warehouse_id_idx | `588387e14dba9ae0fd2be78c2cf3e9b6` |
| `public.notifications` | notifications_pkey | `3435fbb51aa7e7d2ac858b253960952b` |
| `public.notifications` | notifications_user_id_idx | `50059c8c63e36de9415b8c0858fed8d3` |
| `public.online_listings` | online_listings_pkey | `2420c423bfcf220b797330cb7ffc80b2` |
| `public.online_listings` | online_listings_product_id_key | `3c7b75d2ea8257be30c8e1fd43fec237` |
| `public.online_listings` | online_listings_published_at_idx | `6c5fe77578ec90f2a094594848f782ca` |
| `public.online_listings` | online_listings_slug_key | `34311857200590dad343a030ab376fd1` |
| `public.order_events` | order_events_actor_idx | `24c89f05c9c949da4d86ad86f9b3344d` |
| `public.order_events` | order_events_organization_idx | `63c4c12196eaf8c6734738037b3beeba` |
| `public.order_events` | order_events_pkey | `ec632be20444db9748e1a59738de86ed` |
| `public.order_events` | order_events_request_type_unique_idx | `fde75d40ffebce207ffd69e923fdd681` |
| `public.order_events` | order_events_timeline_idx | `0e89f8566ef2dcca43fd28022b68ccd6` |
| `public.order_items` | order_items_image_media_idx | `c4c2614e82ec14688c3a45c3c6f13a7e` |
| `public.order_items` | order_items_order_id_idx | `d3a81e32455dc93b3f747b05523ea57a` |
| `public.order_items` | order_items_pkey | `51a09886298025fcd36679c401c34777` |
| `public.order_items` | order_items_product_idx | `cb3073a451b4311856bec104fe93dd52` |
| `public.order_items` | order_items_variant_id_idx | `38ceb5a8351402c32e2810613e4813d3` |
| `public.order_items` | order_items_warehouse_id_idx | `91eefe5b91f678cefbd1019773516032` |
| `public.order_notes` | order_notes_created_by_idx | `a319e29a9286bd7ec4df51be60ec8015` |
| `public.order_notes` | order_notes_order_idx | `d81e6f0ba02376c1ed2377b60779e9db` |
| `public.order_notes` | order_notes_organization_idx | `739c14a442a4453382cbd63f74449ff0` |
| `public.order_notes` | order_notes_pkey | `b785e563b1380261602b69884a478ad1` |
| `public.orders` | orders_channel_created_idx | `8a1f5632850e5cf0b55b202c274b1857` |
| `public.orders` | orders_customer_email_created_idx | `c7e324d031def51c3780951aad624c41` |
| `public.orders` | orders_customer_id_created_idx | `d642a9653948cc250b803f8197c0c491` |
| `public.orders` | orders_idempotency_key_key | `d0ddc240c4a39236d7c8f737feae108b` |
| `public.orders` | orders_open_status_idx | `687908fee4dda8f2b9827ee47dcc39ab` |
| `public.orders` | orders_operations_queue_idx | `06f4c5c5cbc77f68e5667865f70ff428` |
| `public.orders` | orders_order_no_key | `35ccd857db75ce9585139b96164c4671` |
| `public.orders` | orders_organization_created_idx | `11cdef0e49eaff2b15ff451b7376a18c` |
| `public.orders` | orders_payment_queue_idx | `d1fd6783ca7a69505de9170552fdb028` |
| `public.orders` | orders_pending_expiry_idx | `8c485445da655b35c99c12bf9ed724c9` |
| `public.orders` | orders_pkey | `1e861b2316e46c7c69d0d3b4f87ca0f0` |
| `public.orders` | orders_pos_session_idx | `0bff57f87458a85790284d795b745fc7` |
| `public.orders` | orders_request_id_unique_idx | `94cc02f249cc1c928d0209589378a9ae` |
| `public.orders` | orders_updated_by_idx | `f6321ccd52d115d8e20c3f4354f8802f` |
| `public.organizations` | organizations_code_key | `0159422672f966b06689cc49950c502c` |
| `public.organizations` | organizations_created_by_idx | `cd7a3fb906a0780230fb1e5d23acc122` |
| `public.organizations` | organizations_pkey | `f45c1aefdc5c9e573ccc52f6cb1e62d3` |
| `public.organizations` | organizations_updated_by_idx | `8210480b3da59f489a2ca1b457d8cc3a` |
| `public.outbox_events` | outbox_events_delivery_idx | `5c6bdeff80cbd7f18550a5bd371c27be` |
| `public.outbox_events` | outbox_events_organization_id_idempotency_key_key | `fede48be6fa63c7995f7fcd6ab91f821` |
| `public.outbox_events` | outbox_events_organization_idx | `10c4304fc6724856a03045118b94e12f` |
| `public.outbox_events` | outbox_events_pkey | `0540c662077a30e520f0a178ede63a8b` |
| `public.payments` | payments_idempotency_unique_idx | `d5b11bc23f4235c84c5f5173be698e44` |
| `public.payments` | payments_order_id_idx | `ef9570982d75bbec4829d881c94d04a5` |
| `public.payments` | payments_organization_order_idx | `ed0dcfb19c6ca7a21789f56860f7e764` |
| `public.payments` | payments_pkey | `20860a170aa0e56c48e7b4d3c96c692b` |
| `public.payments` | payments_provider_reference_unique_idx | `422efe3937edee6ce32ffd208e68df32` |
| `public.payments` | payments_verified_by_idx | `f02576e0fdc4ffd988a2e751ca5aa27c` |
| `public.permissions` | permissions_code_key | `71a78138b6ce4c02687722719c47bee5` |
| `public.permissions` | permissions_pkey | `33775b2ecb07621d0fd9aee8248736da` |
| `public.pos_sessions` | pos_sessions_closed_by_idx | `d2c2b64715158452ce645f1fa8b7313c` |
| `public.pos_sessions` | pos_sessions_one_open_per_user | `d6d52d3505af1cd94688c4b049955fda` |
| `public.pos_sessions` | pos_sessions_opened_by_idx | `fa4204df5c34705a7d24201ea9b06ead` |
| `public.pos_sessions` | pos_sessions_organization_id_session_no_key | `b8a6a84999f4d43ab3663040eb59a978` |
| `public.pos_sessions` | pos_sessions_pkey | `8459c502237e8389bc26649dc09b777b` |
| `public.pos_sessions` | pos_sessions_warehouse_idx | `33d2c74ab3e9791a8abbb30e4aab85f2` |
| `public.price_book_items` | price_book_items_active_lookup_idx | `7982184a5e7c51005f235b4002b82ff5` |
| `public.price_book_items` | price_book_items_created_by_idx | `69f65d6875eee9048e242c35ad650e39` |
| `public.price_book_items` | price_book_items_pkey | `78adea964f167d89d5e83834a607cbda` |
| `public.price_book_items` | price_book_items_product_id_idx | `1a8c7856fb66e093c38844d944b2f65a` |
| `public.price_book_items` | price_book_items_product_unique_idx | `39039fb8b483a50fbecf1a1d512432a1` |
| `public.price_book_items` | price_book_items_updated_by_idx | `3fa9a579c51399921c8c8b19f21df750` |
| `public.price_book_items` | price_book_items_variant_id_idx | `7dab277d414340df2b6903027a40efd1` |
| `public.price_book_items` | price_book_items_variant_unique_idx | `80307d95a42c5aa6239bc880ba455f55` |
| `public.price_books` | price_books_channel_id_idx | `4ca38d4487c418772a5ef2ac4f441569` |
| `public.price_books` | price_books_created_by_idx | `cc7c82f36a7ab98d9c514f6603951025` |
| `public.price_books` | price_books_default_channel_idx | `054d80a07af77776d39b70de9270f413` |
| `public.price_books` | price_books_organization_id_code_key | `83cb7690808ff17286b1f7dac7d34f06` |
| `public.price_books` | price_books_pkey | `13593ca3948a322e9f70dd7f8e05bd5e` |
| `public.price_books` | price_books_updated_by_idx | `4936308e99b42351c4b9b4fed817acd6` |
| `public.product_images` | product_images_active_sort_idx | `7367956c7df309e1ec15caa11967b729` |
| `public.product_images` | product_images_created_by_idx | `bd21564bb3ec97fc2d6e8d5db8acf9fe` |
| `public.product_images` | product_images_file_path_key | `ef8cfc3e3fd4ec476363177d5e5f801f` |
| `public.product_images` | product_images_organization_id_idx | `6d6d6f25ac8183cb0c871def74dd2e4a` |
| `public.product_images` | product_images_pkey | `6acb11a59f3aaa7e6d8771c9507073cc` |
| `public.product_images` | product_images_updated_by_idx | `0e0c8d1269e607bebcd656b96c095a38` |
| `public.product_images` | product_images_variant_id_idx | `f9e2e5d46675daca6c9ed5011d70cd38` |
| `public.product_images` | product_single_primary_image | `0566ef27b2024151c3d9f3b8849b4d22` |
| `public.product_publications` | product_publications_channel_id_idx | `d0512da20f5eb7dbcd1ffd837a40f3f6` |
| `public.product_publications` | product_publications_created_by_idx | `75cab133840fa12ffcd8303a7c008acb` |
| `public.product_publications` | product_publications_organization_id_channel_id_slug_key | `f429b7e906add13c38cb74725c70bfb3` |
| `public.product_publications` | product_publications_organization_id_product_id_channel_id_key | `824c9bd98c24d994ac23db215c0389a5` |
| `public.product_publications` | product_publications_pkey | `cd23045370be7a99cfed0688243c4e4a` |
| `public.product_publications` | product_publications_product_id_idx | `054898147a2d987fa144617b63252fa7` |
| `public.product_publications` | product_publications_public_lookup_idx | `c4255fab94ddb7511c748dd632579067` |
| `public.product_publications` | product_publications_queue_idx | `008fe06a7c5a1b86823d24f2081710f9` |
| `public.product_publications` | product_publications_updated_by_idx | `eb20d6e183b45c6f34beae1aa80f06f9` |
| `public.product_tag_relations` | product_tag_relations_pkey | `6a98beae7f7c9e49b6803f4b9204ee7c` |
| `public.product_tag_relations` | product_tag_relations_tag_id_idx | `169855eaa9cd4c256fe0c7c3c53160ab` |
| `public.product_tags` | product_tags_name_key | `9732fd369c260fb057876cfdcd2381e7` |
| `public.product_tags` | product_tags_pkey | `ec3a842bc68cd79870d956ffde25abd8` |
| `public.product_variants` | product_variants_barcode_key | `368f6907e7973473af1af987f220bc81` |
| `public.product_variants` | product_variants_color_id_idx | `6d9cc00fc01da1b2b6bb57d260556654` |
| `public.product_variants` | product_variants_organization_id_idx | `7e968f55e8bc5c58e335cd1ab40c4a8d` |
| `public.product_variants` | product_variants_pkey | `4a0179f98b06534702cee6140db96a09` |
| `public.product_variants` | product_variants_product_id_color_id_size_id_key | `15a09c046339059e472c83bc93d8f851` |
| `public.product_variants` | product_variants_size_id_idx | `26051c688d583048b928706686ad3024` |
| `public.product_variants` | product_variants_sku_key | `d5163b7af96cc3bbc297ec5fbf0e5e91` |
| `public.product_variants` | product_variants_updated_by_idx | `b1e52da031954a9ae5b5212c8152dbbb` |
| `public.products` | products_brand_id_idx | `b221ceb12dd777abbb572d26d0e16fd2` |
| `public.products` | products_category_id_idx | `a5653e8931f6aa2c8f45764af99af1d2` |
| `public.products` | products_category_status_idx | `ae70f85922f7254b3f64bc5f877500df` |
| `public.products` | products_created_by_idx | `036476d140c9bb513609db28c0dd4690` |
| `public.products` | products_model_number_key | `1744335bd3c72bacadb8a47875792910` |
| `public.products` | products_organization_id_idx | `219187ed3a4914b9b5f6dbc71489f5e2` |
| `public.products` | products_pkey | `365d71f4c98da1d65f9d0171c912d0d0` |
| `public.products` | products_slug_key | `9ac078b1f1ef799ae3643bcbb0ac6c5b` |
| `public.products` | products_status_created_at_idx | `04bace0fc812d077bbea70c65aa9fad8` |
| `public.products` | products_storefront_style_trgm_idx | `184fb064ccb2bb2c9c2297c4b1eee332` |
| `public.products` | products_storefront_title_trgm_idx | `afc14bae2c9256d9866ab51a21527b59` |
| `public.products` | products_style_no_key | `e1d9528163e5f3f856cf325b1b921367` |
| `public.products` | products_subcategory_id_idx | `cbc368b41527417e94276b18ad6204a3` |
| `public.products` | products_supplier_id_idx | `c6add697dc6f1730142f7d2aa11f0023` |
| `public.products` | products_updated_by_idx | `0e10f180c51463392451dd4d850cbe64` |
| `public.products` | products_workflow_updated_idx | `812b918750628dff3e14dacceb51e00e` |
| `public.profiles` | profiles_internal_role_idx | `8592de1aae26a1a5e01f3d2a2c0d04e9` |
| `public.profiles` | profiles_organization_id_idx | `c3d92084c091480ae71657b8eb19093f` |
| `public.profiles` | profiles_pkey | `b7142bbffc23de763c1bd9f00489ec05` |
| `public.purchase_order_items` | purchase_order_items_created_by_idx | `09f97563ca3b19643dae224620fd17e6` |
| `public.purchase_order_items` | purchase_order_items_organization_idx | `f7b1a1e27bab9e9ce3686b0663ec8540` |
| `public.purchase_order_items` | purchase_order_items_pkey | `c7f1dabc0b93aefd388aaae27faed701` |
| `public.purchase_order_items` | purchase_order_items_purchase_order_id_variant_id_key | `4b43f1d2c685ad3030bfb2663417e058` |
| `public.purchase_order_items` | purchase_order_items_variant_idx | `7bbe622c2339a58360d6a9affbc21689` |
| `public.purchase_orders` | purchase_orders_approved_by_idx | `036cf9b6a11d95b02c7fa6a45bdd5292` |
| `public.purchase_orders` | purchase_orders_created_by_idx | `73dc03d40122756a6929c20c8c1e7cef` |
| `public.purchase_orders` | purchase_orders_organization_id_purchase_order_no_key | `bec2fede700daa768af24d5a9a5c729c` |
| `public.purchase_orders` | purchase_orders_pkey | `15d20ab45c936b85b9c5f30fefa82004` |
| `public.purchase_orders` | purchase_orders_status_date_idx | `0da03bd4f986146c8de59d5daf2d5f0a` |
| `public.purchase_orders` | purchase_orders_supplier_idx | `f3168a2455c6320c0725a7e9a50789da` |
| `public.purchase_orders` | purchase_orders_updated_by_idx | `0ea694e06042fab19595990abd98049f` |
| `public.purchase_orders` | purchase_orders_warehouse_idx | `146737f32b8ad0cbb7cadcd3c1f4865d` |
| `public.purchase_payments` | purchase_payments_created_by_idx | `ac2fdcb49e9db2fb5605a4608a0ffadb` |
| `public.purchase_payments` | purchase_payments_organization_id_idempotency_key_key | `dff0e9434dc7442393b66d5103239218` |
| `public.purchase_payments` | purchase_payments_pkey | `f7b5153c8b195cfda4484197e56650a8` |
| `public.purchase_payments` | purchase_payments_purchase_idx | `2024237d5588dcec14ec203cdd50bb81` |
| `public.refunds` | refunds_order_idx | `754362f49201aa1f3e5744f8f60fa0ba` |
| `public.refunds` | refunds_organization_id_idempotency_key_key | `c1f19ae7c1c36e624257d6e874a59552` |
| `public.refunds` | refunds_organization_idx | `60d37164c5679a9050463f8ebaa44dd3` |
| `public.refunds` | refunds_payment_idx | `4d530986ced3ec92c9f328f9c0d61cd1` |
| `public.refunds` | refunds_pkey | `017112592dfb1955fdd3c99ab269ef85` |
| `public.refunds` | refunds_processed_by_idx | `b5d8f6bd8f6065ba19e36864a07a9835` |
| `public.refunds` | refunds_provider_reference_unique_idx | `b3616a5dc11f4a402235a97c2312cab1` |
| `public.refunds` | refunds_requested_by_idx | `ebaf72ff678212a56a4d493b3002b91d` |
| `public.refunds` | refunds_return_idx | `7251b25a8411a423bcd49d5c487ede10` |
| `public.return_items` | return_items_order_item_idx | `7883a3a298fe7181af52b24244510b14` |
| `public.return_items` | return_items_organization_idx | `5a3d1e01d4d746f8934a9bc2300796ac` |
| `public.return_items` | return_items_pkey | `93f3b8ed8feff849ebc22c364aba9215` |
| `public.return_items` | return_items_return_id_order_item_id_key | `19b65dc9708509e257e13586abb1e64c` |
| `public.return_items` | return_items_variant_idx | `351aefaf36e6face4a9c6a09ee56cf3a` |
| `public.return_items` | return_items_warehouse_idx | `5e48dbfd405572c73756187b7a154813` |
| `public.returns` | returns_approved_by_idx | `4eda5953618f47f41f4d9033c5e7fabc` |
| `public.returns` | returns_created_by_idx | `30c12e9914baae77984ee80b16685fca` |
| `public.returns` | returns_idempotency_unique_idx | `de8f81e8d10b652425f7ff9a1516276f` |
| `public.returns` | returns_inspected_by_idx | `71703ddeb50aad255d07ea88a6d7e63e` |
| `public.returns` | returns_operations_queue_idx | `2e265242121fe9ab81f8c642522c4a22` |
| `public.returns` | returns_order_id_idx | `5018372d822088ef71a28242c76890bf` |
| `public.returns` | returns_organization_idx | `615b1f7840cc9e5b9e9f1026705541b2` |
| `public.returns` | returns_pkey | `1d2842430a1f0f42622456b0875c4b0c` |
| `public.returns` | returns_received_by_idx | `7fa83337c36c42b0cc760b5201a955b8` |
| `public.returns` | returns_request_id_unique_idx | `fb6d2b9401260433d4de2f04abb75348` |
| `public.returns` | returns_return_no_unique_idx | `f7ea220f680a121e696f4fa719322a7c` |
| `public.role_permissions` | role_permissions_permission_id_idx | `4a68722687be57cc80560dbcee08233a` |
| `public.role_permissions` | role_permissions_pkey | `414708c5a309db0703f2c715684cb475` |
| `public.roles` | roles_organization_code_key | `74c715689fb8f106d2bb25f054f00489` |
| `public.roles` | roles_organization_id_idx | `0167dd8a6bd44f921e80f233b1f2f139` |
| `public.roles` | roles_pkey | `e90bda3bdd3b7548539cb38fa805b347` |
| `public.settings` | settings_pkey | `64500b841ae51399a6c37af8fdc071da` |
| `public.settings` | settings_updated_by_idx | `a4468568f34ece9cf7971a43a1c0b4a5` |
| `public.shipment_items` | shipment_items_order_item_idx | `b43bd49feb68c2e17f26a791a47dd6ea` |
| `public.shipment_items` | shipment_items_organization_idx | `5afaa24ebda5f4eb8888b8eb7f0b6c70` |
| `public.shipment_items` | shipment_items_picked_by_idx | `5a054c542f0f8f41e2df5ebf8ae1642f` |
| `public.shipment_items` | shipment_items_pkey | `976e8e93537a2d34f035b10c412afa97` |
| `public.shipment_items` | shipment_items_shipment_id_order_item_id_key | `d10cff82613fc5a25d7000b6dece96c4` |
| `public.shipment_items` | shipment_items_verified_by_idx | `042260047b577b74e98dd44dc1d1977d` |
| `public.shipments` | shipments_completed_by_idx | `ceb40508e1e20121dece8f13855fbb79` |
| `public.shipments` | shipments_fulfillment_queue_idx | `e2fc3e51e4f8d24572f7a3f8095cd393` |
| `public.shipments` | shipments_idempotency_unique_idx | `1f07f9417b07c457a57fd916810edb6d` |
| `public.shipments` | shipments_order_active_unique_idx | `d34f5c4f9ad61491bbc06b0e74284a98` |
| `public.shipments` | shipments_organization_idx | `6508ee193b1c90d8ace40720458836b7` |
| `public.shipments` | shipments_packed_by_idx | `dd492dc5901e6fc982d5fe0c3c17dd70` |
| `public.shipments` | shipments_pkey | `8a1289c2e12f234b81b78a544f415978` |
| `public.shipments` | shipments_shipped_by_idx | `65999075515c902af7dbc884046ad968` |
| `public.shipments` | shipments_warehouse_idx | `4bba57b683a8017e101cdee4030ffb09` |
| `public.shopping_cart_items` | shopping_cart_items_cart_id_variant_id_key | `ef222c5b08ee9167f6e84339cb3775c9` |
| `public.shopping_cart_items` | shopping_cart_items_pkey | `6ed02d22c6e22ed90da32769706ee511` |
| `public.shopping_cart_items` | shopping_cart_items_variant_id_idx | `221b55152ca7eaf08baeb7156114de72` |
| `public.shopping_carts` | shopping_carts_customer_id_status_key | `b8bed72beece0d1a6ac70ea0acb3fe50` |
| `public.shopping_carts` | shopping_carts_pkey | `862f85c9fdd8549212b889725b2449d6` |
| `public.sizes` | sizes_name_key | `1bb888dd15c4758e15d5c867d620e7de` |
| `public.sizes` | sizes_normalized_name_key | `a4135f2ed23f8c5a327df184a56321c7` |
| `public.sizes` | sizes_org_code_unique_idx | `a87b80146e3e60a596432efe562f18c5` |
| `public.sizes` | sizes_organization_id_idx | `c6494c1b4aeffb2c85f12ee809274bde` |
| `public.sizes` | sizes_pkey | `f71d6bedfbdcf977a40832d36ea9f07b` |
| `public.staff_invitations` | staff_invitations_created_by_idx | `0d5e04c3bc54afd351714d5a37935163` |
| `public.staff_invitations` | staff_invitations_email_idx | `74ee99537f5cc0007479e53ca3b74149` |
| `public.staff_invitations` | staff_invitations_pending_idx | `60834284de47198249a6f3238d1dfbdb` |
| `public.staff_invitations` | staff_invitations_pkey | `27ab67c96e287227103186ea553c7201` |
| `public.staff_invitations` | staff_invitations_role_id_idx | `4891ff9c29aa82b16a875e9158c5777e` |
| `public.staff_invitations` | staff_invitations_token_hash_key | `38870edfc9f25e80b0cf54731b355ba3` |
| `public.staff_invitations` | staff_invitations_used_by_idx | `bf1ecbb00042a745cb3e5b4aaf121735` |
| `public.stock_adjustments` | stock_adjustments_approved_by_idx | `790b8530844f1b306b984ba6fb2df008` |
| `public.stock_adjustments` | stock_adjustments_created_by_idx | `fb3b1c24b639705bc808a9a389c47f4a` |
| `public.stock_adjustments` | stock_adjustments_pkey | `7d64b88990f6490d06adc18c6724a27a` |
| `public.stock_adjustments` | stock_adjustments_variant_id_idx | `9443bb447227e7e9cf997083c6917e68` |
| `public.stock_adjustments` | stock_adjustments_warehouse_id_idx | `17e2e5aee88893e0c14406ced7e44bc1` |
| `public.stock_receipt_attachments` | stock_receipt_attachments_created_by_idx | `ccd4d4d75a893371080f9c0917e4e4d7` |
| `public.stock_receipt_attachments` | stock_receipt_attachments_file_path_key | `4cca8cb4f7d30d6304db7a7ef680048b` |
| `public.stock_receipt_attachments` | stock_receipt_attachments_pkey | `d16851ffedead433a8a42ac56af523f0` |
| `public.stock_receipt_attachments` | stock_receipt_attachments_receipt_id_idx | `0ffe13ac1103441615b37b2244d9cbeb` |
| `public.stock_receipt_exceptions` | stock_receipt_exceptions_item_id_idx | `cc6489c15ec4d602862a324552588bcb` |
| `public.stock_receipt_exceptions` | stock_receipt_exceptions_pkey | `e95b03b9e10c12dbf4d73e32466851e7` |
| `public.stock_receipt_exceptions` | stock_receipt_exceptions_receipt_id_idx | `76ef7a3c1996ac8de74f12687837feed` |
| `public.stock_receipt_exceptions` | stock_receipt_exceptions_resolved_by_idx | `0e2ddb045e8cc5c888a7971f9d81c74a` |
| `public.stock_receipt_items` | stock_receipt_items_organization_id_idx | `b605accb9cbfb8306e02280aaf7cd5dd` |
| `public.stock_receipt_items` | stock_receipt_items_pkey | `f66bdbfa14290d4c54fa10537b1403a4` |
| `public.stock_receipt_items` | stock_receipt_items_product_id_idx | `c4632e6158a49a9c46cfabb2bff60032` |
| `public.stock_receipt_items` | stock_receipt_items_purchase_item_idx | `8f3462148116ca0729ab1f66748f000f` |
| `public.stock_receipt_items` | stock_receipt_items_receipt_idx | `ae02d2849319ca1886693a098c1e2648` |
| `public.stock_receipt_items` | stock_receipt_items_variant_id_idx | `96b0b4d89034edc59ac5bafe112bc39e` |
| `public.stock_receipt_raw_lines` | stock_receipt_raw_lines_pkey | `4f9c88e31bb00bc8e9173aaddd0a99b2` |
| `public.stock_receipt_raw_lines` | stock_receipt_raw_lines_receipt_id_line_number_key | `540f4e1cb5bc850972c49b20489b5fa2` |
| `public.stock_receipts` | stock_receipts_confirmed_by_idx | `af45bf06cb1e30563c365cf552b17dac` |
| `public.stock_receipts` | stock_receipts_created_by_idx | `9259fec2b6f4a30be79e70f47c24d234` |
| `public.stock_receipts` | stock_receipts_creator_idempotency_key | `666be7bfe32182f0e5dc4831338b6b47` |
| `public.stock_receipts` | stock_receipts_organization_id_idx | `e4044a6e0ab1f0e16cce861338415287` |
| `public.stock_receipts` | stock_receipts_pkey | `4ea689929f626382a8c91063add85eca` |
| `public.stock_receipts` | stock_receipts_purchase_order_idx | `7f14032d2ac8a6f0469bd345fce31433` |
| `public.stock_receipts` | stock_receipts_receipt_no_key | `38a546714a6a70b34ac2b13a922c76d0` |
| `public.stock_receipts` | stock_receipts_supplier_id_idx | `cb117679b0c15e32d85b1ac421328d05` |
| `public.stock_receipts` | stock_receipts_updated_by_idx | `9b91b392f56d51ee75e120e829ad41e6` |
| `public.stock_receipts` | stock_receipts_warehouse_id_idx | `424774a8b899bc4dc28b3d8ec6389b25` |
| `public.stock_reservations` | stock_reservations_created_by_idx | `b0b56c42303740a052b1e5dbeab341be` |
| `public.stock_reservations` | stock_reservations_expiry_idx | `aba410e3ad777b20d11ad9096be72b31` |
| `public.stock_reservations` | stock_reservations_inventory_active_idx | `4f6730b675d796b9079038b2a18b44eb` |
| `public.stock_reservations` | stock_reservations_order_idx | `304a7f9a1f85341cb41d09a3f8637335` |
| `public.stock_reservations` | stock_reservations_order_item_id_key | `d059120eb4a917768ddf55dcb5dc0dd4` |
| `public.stock_reservations` | stock_reservations_organization_id_idempotency_key_order_it_key | `58dca1202abcaf50b77f3946d70646d5` |
| `public.stock_reservations` | stock_reservations_pkey | `7e6be2ac3b9e65afd5faff67b300d647` |
| `public.stock_reservations` | stock_reservations_variant_idx | `804e2a654afe711e772e1ff94930268f` |
| `public.stock_reservations` | stock_reservations_warehouse_idx | `fe02d991e5b9a3ec45741596c438a6a1` |
| `public.suppliers` | suppliers_code_unique_idx | `19aefef559a439c0149ca72f0a74a2da` |
| `public.suppliers` | suppliers_name_key | `981262b42eb85fb0b676493a6782e8c3` |
| `public.suppliers` | suppliers_organization_id_idx | `e7934e1b056844c9411e1b1e073b2fdb` |
| `public.suppliers` | suppliers_pkey | `5d193796e1f6f4c45c6d76eac83bb193` |
| `public.suppliers` | suppliers_updated_by_idx | `c66a37e771ac9d24119de25cd6cb55f7` |
| `public.user_category_scopes` | user_category_scopes_assigned_by_idx | `9eae83b05121f1747db0d512fd68131c` |
| `public.user_category_scopes` | user_category_scopes_category_idx | `d662ca9d1e28275c7c1b6d1082ba2ff8` |
| `public.user_category_scopes` | user_category_scopes_org_category_idx | `0217e2177ed45eaf345e09825196d133` |
| `public.user_category_scopes` | user_category_scopes_pkey | `831da976d2b9c272d7ae21e85ef3f947` |
| `public.user_permissions` | user_permissions_assigned_by_idx | `bae20f8efec3ffb5b433c113f99cbc55` |
| `public.user_permissions` | user_permissions_permission_idx | `ea56182ee332c05f8c7a367744fc01cc` |
| `public.user_permissions` | user_permissions_pkey | `49d257dcdfb31f91fcda4897424111d7` |
| `public.user_roles` | user_roles_assigned_by_idx | `e892878147049e4ca8447d65f126a23d` |
| `public.user_roles` | user_roles_pkey | `a7f15dbae02f76ae0f096702ecbc92f1` |
| `public.user_roles` | user_roles_role_id_idx | `b9a724d89268be954374c10e89cb0de7` |
| `public.user_warehouses` | user_warehouses_assigned_by_idx | `e183c7070fae4f8a5753a59dca449b9d` |
| `public.user_warehouses` | user_warehouses_organization_idx | `f107a9d1446ea0d316e3017b9ca34968` |
| `public.user_warehouses` | user_warehouses_pkey | `b9c550e4f0615f929d51511167d51bf9` |
| `public.user_warehouses` | user_warehouses_warehouse_idx | `ce284606a943651324464c115a3f4539` |
| `public.warehouses` | warehouses_code_key | `ba61dd6990b1b5ddb5cbbc61b991e4ee` |
| `public.warehouses` | warehouses_organization_id_idx | `58a5150013ce5283b2d359e5c2c80a2a` |
| `public.warehouses` | warehouses_pkey | `ff8a22883f1b2fea3b9e2182a1f01d54` |
| `storage.buckets` | bname | `edb8be523c6e3c1ed9e7bd0eb32213af` |
| `storage.buckets` | buckets_pkey | `ff95cddc14c418511f2faaf69e4fe6b1` |
| `storage.buckets_analytics` | buckets_analytics_pkey | `5faafdbaaf23fb01463574b2f9d093d3` |
| `storage.buckets_analytics` | buckets_analytics_unique_name_idx | `c04dcbc3e058e7be512a0af226a83443` |
| `storage.buckets_vectors` | buckets_vectors_pkey | `50a8be61a88b2ea09eed1b6497bddf51` |
| `storage.migrations` | migrations_name_key | `bff6fa1f83cacf3970401c52c08db11c` |
| `storage.migrations` | migrations_pkey | `0b7efb4a3feab972e1da5ad75b523221` |
| `storage.objects` | bucketid_objname | `dd7a5d804ea7282307bc654339b6e9ce` |
| `storage.objects` | idx_objects_bucket_id_name | `28cc0d373399f6286fcc084d53ac1a9b` |
| `storage.objects` | idx_objects_bucket_id_name_lower | `7011cc4c480885d4ad90a454ba646e00` |
| `storage.objects` | name_prefix_search | `723adc11317cf50c0b081f17b15306eb` |
| `storage.objects` | objects_pkey | `554c83fddeb715d0c8ab40f49647bbf4` |
| `storage.s3_multipart_uploads` | idx_multipart_uploads_list | `90fb4b2091d10452dcd11f661d9cc533` |
| `storage.s3_multipart_uploads` | s3_multipart_uploads_pkey | `c46135605d6e820073e2778c240ceb64` |
| `storage.s3_multipart_uploads_parts` | s3_multipart_uploads_parts_pkey | `6b54fd822b51110fb8f5cc41f3e3114d` |
| `storage.vector_indexes` | vector_indexes_name_bucket_id_idx | `8328b4a594fa6b91d45ab4544c853b8f` |
| `storage.vector_indexes` | vector_indexes_pkey | `84c07398a69ca4bfe5ad07e3848f2818` |

## Grants

| Object | Grantee | Privileges |
|---|---|---|
| `public.audit_logs` | authenticated | SELECT |
| `public.audit_logs` | service_role | INSERT,REFERENCES,SELECT,TRIGGER |
| `public.brands` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `public.brands` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.cash_movements` | authenticated | SELECT |
| `public.cash_movements` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.categories` | anon | SELECT |
| `public.categories` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `public.categories` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.channels` | authenticated | REFERENCES,SELECT,TRIGGER |
| `public.channels` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.colors` | anon | SELECT |
| `public.colors` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `public.colors` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.customer_addresses` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `public.customer_addresses` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.customers` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `public.customers` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.employee_invitations` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.employees` | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.employees` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.expenses` | authenticated | SELECT |
| `public.expenses` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.financial_entries` | authenticated | SELECT |
| `public.financial_entries` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.fulfillment_exceptions` | anon | REFERENCES,SELECT,TRIGGER |
| `public.fulfillment_exceptions` | authenticated | REFERENCES,SELECT,TRIGGER |
| `public.fulfillment_exceptions` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.fulfillment_queue` | authenticated | SELECT |
| `public.fulfillment_queue` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.inbound_order_items` | authenticated | INSERT,SELECT,UPDATE |
| `public.inbound_order_items` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.inbound_orders` | authenticated | INSERT,SELECT,UPDATE |
| `public.inbound_orders` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.inbound_receipt_lines` | authenticated | SELECT |
| `public.inbound_receipt_lines` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.inbound_receipts` | authenticated | SELECT |
| `public.inbound_receipts` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.inventory` | authenticated | SELECT |
| `public.inventory` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.inventory_balances` | authenticated | SELECT |
| `public.inventory_balances` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.inventory_movements` | authenticated | SELECT |
| `public.inventory_movements` | service_role | INSERT,REFERENCES,SELECT,TRIGGER |
| `public.locations` | authenticated | SELECT |
| `public.locations` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.notifications` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `public.notifications` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.online_listings` | anon | SELECT |
| `public.online_listings` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `public.online_listings` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.order_events` | anon | REFERENCES,SELECT,TRIGGER |
| `public.order_events` | authenticated | REFERENCES,SELECT,TRIGGER |
| `public.order_events` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.order_items` | authenticated | SELECT |
| `public.order_items` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.order_notes` | anon | REFERENCES,SELECT,TRIGGER |
| `public.order_notes` | authenticated | REFERENCES,SELECT,TRIGGER |
| `public.order_notes` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.order_operations_summary` | authenticated | SELECT |
| `public.order_operations_summary` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.orders` | authenticated | SELECT |
| `public.orders` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.organizations` | authenticated | SELECT |
| `public.organizations` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.outbox_events` | anon | REFERENCES,SELECT,TRIGGER |
| `public.outbox_events` | authenticated | REFERENCES,SELECT,TRIGGER |
| `public.outbox_events` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.payments` | authenticated | SELECT |
| `public.payments` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.permissions` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `public.permissions` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.pos_sessions` | authenticated | SELECT |
| `public.pos_sessions` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.price_book_items` | authenticated | REFERENCES,SELECT,TRIGGER |
| `public.price_book_items` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.price_books` | authenticated | REFERENCES,SELECT,TRIGGER |
| `public.price_books` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.product_images` | authenticated | SELECT |
| `public.product_images` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.product_media` | authenticated | SELECT |
| `public.product_media` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.product_publications` | authenticated | REFERENCES,SELECT,TRIGGER |
| `public.product_publications` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.product_tag_relations` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `public.product_tag_relations` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.product_tags` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `public.product_tags` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.product_variants` | authenticated | SELECT |
| `public.product_variants` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.products` | authenticated | SELECT |
| `public.products` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.profiles` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `public.profiles` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.purchase_order_items` | authenticated | SELECT |
| `public.purchase_order_items` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.purchase_orders` | authenticated | SELECT |
| `public.purchase_orders` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.purchase_payments` | authenticated | SELECT |
| `public.purchase_payments` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.refunds` | anon | REFERENCES,SELECT,TRIGGER |
| `public.refunds` | authenticated | REFERENCES,SELECT,TRIGGER |
| `public.refunds` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.return_items` | anon | REFERENCES,SELECT,TRIGGER |
| `public.return_items` | authenticated | REFERENCES,SELECT,TRIGGER |
| `public.return_items` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.returns` | authenticated | SELECT |
| `public.returns` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.role_permissions` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `public.role_permissions` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.roles` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `public.roles` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.settings` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `public.settings` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.shipment_items` | anon | REFERENCES,SELECT,TRIGGER |
| `public.shipment_items` | authenticated | REFERENCES,SELECT,TRIGGER |
| `public.shipment_items` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.shipments` | authenticated | SELECT |
| `public.shipments` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.shopping_cart_items` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `public.shopping_cart_items` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.shopping_carts` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `public.shopping_carts` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.sizes` | anon | SELECT |
| `public.sizes` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `public.sizes` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.staff_invitations` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.stock_adjustments` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `public.stock_adjustments` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.stock_receipt_attachments` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `public.stock_receipt_attachments` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.stock_receipt_exceptions` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `public.stock_receipt_exceptions` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.stock_receipt_items` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `public.stock_receipt_items` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.stock_receipt_raw_lines` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `public.stock_receipt_raw_lines` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.stock_receipts` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `public.stock_receipts` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.stock_reservations` | authenticated | SELECT |
| `public.stock_reservations` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.storefront_catalog_media` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.storefront_catalog_products` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.storefront_catalog_variants` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.storefront_product_media` | anon | SELECT |
| `public.storefront_product_media` | authenticated | SELECT |
| `public.storefront_product_media` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.storefront_product_variants` | anon | SELECT |
| `public.storefront_product_variants` | authenticated | SELECT |
| `public.storefront_product_variants` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.storefront_products` | anon | SELECT |
| `public.storefront_products` | authenticated | SELECT |
| `public.storefront_products` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.suppliers` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `public.suppliers` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.user_category_scopes` | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.user_category_scopes` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.user_permissions` | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.user_permissions` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.user_roles` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `public.user_roles` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.user_warehouses` | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.user_warehouses` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `public.warehouses` | authenticated | DELETE,INSERT,SELECT,UPDATE |
| `public.warehouses` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `storage.buckets` | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `storage.buckets` | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `storage.buckets` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `storage.buckets_analytics` | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `storage.buckets_analytics` | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `storage.buckets_analytics` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `storage.buckets_vectors` | anon | SELECT |
| `storage.buckets_vectors` | authenticated | SELECT |
| `storage.buckets_vectors` | service_role | SELECT |
| `storage.objects` | anon | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `storage.objects` | authenticated | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `storage.objects` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `storage.s3_multipart_uploads` | anon | SELECT |
| `storage.s3_multipart_uploads` | authenticated | SELECT |
| `storage.s3_multipart_uploads` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `storage.s3_multipart_uploads_parts` | anon | SELECT |
| `storage.s3_multipart_uploads_parts` | authenticated | SELECT |
| `storage.s3_multipart_uploads_parts` | service_role | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |
| `storage.vector_indexes` | anon | SELECT |
| `storage.vector_indexes` | authenticated | SELECT |
| `storage.vector_indexes` | service_role | SELECT |

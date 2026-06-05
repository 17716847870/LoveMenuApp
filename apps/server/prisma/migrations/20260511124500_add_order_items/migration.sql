CREATE TABLE "order_items" (
    "id" BIGSERIAL NOT NULL,
    "order_id" BIGINT NOT NULL,
    "menu_id" BIGINT NOT NULL,
    "title_snapshot" VARCHAR(128) NOT NULL,
    "cover_image_url_snapshot" VARCHAR(512),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "deducted_count" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");
CREATE INDEX "order_items_menu_id_idx" ON "order_items"("menu_id");

ALTER TABLE "order_items"
ADD CONSTRAINT "order_items_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "orders"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "order_items" (
    "order_id",
    "menu_id",
    "title_snapshot",
    "cover_image_url_snapshot",
    "quantity",
    "deducted_count",
    "sort_order",
    "created_at"
)
SELECT
    "orders"."id",
    "orders"."menu_id",
    "menus"."title",
    "menus"."cover_image_url",
    1,
    "orders"."deducted_count",
    0,
    "orders"."created_at"
FROM "orders"
JOIN "menus" ON "menus"."id" = "orders"."menu_id"
WHERE NOT EXISTS (
    SELECT 1 FROM "order_items" WHERE "order_items"."order_id" = "orders"."id"
);

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "phone" VARCHAR(32),
    "email" VARCHAR(128),
    "nickname" VARCHAR(64) NOT NULL,
    "avatar_url" VARCHAR(512),
    "gender" VARCHAR(16),
    "birthday" DATE,
    "status" VARCHAR(16) NOT NULL DEFAULT 'active',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "couple_relationships" (
    "id" BIGSERIAL NOT NULL,
    "user_a_id" BIGINT NOT NULL,
    "user_b_id" BIGINT NOT NULL,
    "publisher_user_id" BIGINT NOT NULL,
    "consumer_user_id" BIGINT NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'active',
    "together_since" DATE,
    "bound_at" TIMESTAMP(3) NOT NULL,
    "unbound_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "couple_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "couple_invites" (
    "id" BIGSERIAL NOT NULL,
    "inviter_user_id" BIGINT NOT NULL,
    "invite_code" VARCHAR(64) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'pending',
    "expired_at" TIMESTAMP(3),
    "used_by_user_id" BIGINT,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "couple_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_categories" (
    "id" BIGSERIAL NOT NULL,
    "relationship_id" BIGINT NOT NULL,
    "publisher_user_id" BIGINT NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(16) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menus" (
    "id" BIGSERIAL NOT NULL,
    "relationship_id" BIGINT NOT NULL,
    "publisher_user_id" BIGINT NOT NULL,
    "category_id" BIGINT,
    "title" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "cover_image_url" VARCHAR(512),
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "is_limited" BOOLEAN NOT NULL DEFAULT false,
    "available_count" INTEGER NOT NULL DEFAULT 0,
    "heat_score" INTEGER NOT NULL DEFAULT 0,
    "completed_order_count" INTEGER NOT NULL DEFAULT 0,
    "remark" TEXT,
    "status" VARCHAR(16) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" BIGSERIAL NOT NULL,
    "relationship_id" BIGINT NOT NULL,
    "menu_id" BIGINT NOT NULL,
    "publisher_user_id" BIGINT NOT NULL,
    "consumer_user_id" BIGINT NOT NULL,
    "order_no" VARCHAR(64) NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "user_remark" TEXT,
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "completed_by_user_id" BIGINT,
    "deducted_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_logs" (
    "id" BIGSERIAL NOT NULL,
    "order_id" BIGINT NOT NULL,
    "from_status" VARCHAR(16),
    "to_status" VARCHAR(16) NOT NULL,
    "operator_user_id" BIGINT NOT NULL,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_feedbacks" (
    "id" BIGSERIAL NOT NULL,
    "order_id" BIGINT NOT NULL,
    "relationship_id" BIGINT NOT NULL,
    "consumer_user_id" BIGINT NOT NULL,
    "content_text" TEXT,
    "status" VARCHAR(16) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_feedback_images" (
    "id" BIGSERIAL NOT NULL,
    "feedback_id" BIGINT NOT NULL,
    "image_url" VARCHAR(512) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_feedback_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_requests" (
    "id" BIGSERIAL NOT NULL,
    "relationship_id" BIGINT NOT NULL,
    "consumer_user_id" BIGINT NOT NULL,
    "publisher_user_id" BIGINT NOT NULL,
    "title" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "suggested_category_name" VARCHAR(64),
    "remark" TEXT,
    "status" VARCHAR(16) NOT NULL DEFAULT 'pending',
    "handled_by_user_id" BIGINT,
    "handled_at" TIMESTAMP(3),
    "converted_menu_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_conversations" (
    "id" BIGSERIAL NOT NULL,
    "relationship_id" BIGINT NOT NULL,
    "user_a_id" BIGINT NOT NULL,
    "user_b_id" BIGINT NOT NULL,
    "last_message_id" BIGINT,
    "last_message_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" BIGSERIAL NOT NULL,
    "conversation_id" BIGINT NOT NULL,
    "relationship_id" BIGINT NOT NULL,
    "sender_user_id" BIGINT NOT NULL,
    "receiver_user_id" BIGINT NOT NULL,
    "message_type" VARCHAR(16) NOT NULL,
    "text_content" TEXT,
    "reply_to_message_id" BIGINT,
    "recalled_at" TIMESTAMP(3),
    "status" VARCHAR(16) NOT NULL DEFAULT 'sent',
    "sent_at" TIMESTAMP(3) NOT NULL,
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_message_assets" (
    "id" BIGSERIAL NOT NULL,
    "message_id" BIGINT NOT NULL,
    "asset_type" VARCHAR(16) NOT NULL,
    "asset_url" VARCHAR(512) NOT NULL,
    "duration_seconds" INTEGER,
    "file_size" BIGINT,
    "width" INTEGER,
    "height" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_message_mentions" (
    "id" BIGSERIAL NOT NULL,
    "message_id" BIGINT NOT NULL,
    "ref_type" VARCHAR(16) NOT NULL,
    "ref_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_mentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_notification_receipts" (
    "id" BIGSERIAL NOT NULL,
    "message_id" BIGINT NOT NULL,
    "receiver_user_id" BIGINT NOT NULL,
    "notify_status" VARCHAR(16) NOT NULL,
    "notified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_notification_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" BIGSERIAL NOT NULL,
    "relationship_id" BIGINT NOT NULL,
    "creator_user_id" BIGINT NOT NULL,
    "title" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "target_date" TIMESTAMP(3) NOT NULL,
    "first_remind_at" TIMESTAMP(3) NOT NULL,
    "remind_type" VARCHAR(16) NOT NULL,
    "period_type" VARCHAR(16),
    "custom_days" INTEGER,
    "repeat_times" INTEGER,
    "completed_times" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(16) NOT NULL DEFAULT 'active',
    "next_trigger_at" TIMESTAMP(3),
    "last_trigger_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminder_trigger_logs" (
    "id" BIGSERIAL NOT NULL,
    "reminder_id" BIGINT NOT NULL,
    "triggered_at" TIMESTAMP(3) NOT NULL,
    "trigger_status" VARCHAR(16) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminder_trigger_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_posts" (
    "id" BIGSERIAL NOT NULL,
    "relationship_id" BIGINT NOT NULL,
    "creator_user_id" BIGINT NOT NULL,
    "post_type" VARCHAR(16) NOT NULL,
    "source_order_id" BIGINT,
    "source_feedback_id" BIGINT,
    "title" VARCHAR(128),
    "content_text" TEXT,
    "status" VARCHAR(16) NOT NULL DEFAULT 'active',
    "posted_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "space_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_post_images" (
    "id" BIGSERIAL NOT NULL,
    "post_id" BIGINT NOT NULL,
    "image_url" VARCHAR(512) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "space_post_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menstrual_profiles" (
    "id" BIGSERIAL NOT NULL,
    "relationship_id" BIGINT NOT NULL,
    "female_user_id" BIGINT NOT NULL,
    "male_user_id" BIGINT,
    "male_access_granted" BOOLEAN NOT NULL DEFAULT false,
    "male_view_enabled" BOOLEAN NOT NULL DEFAULT false,
    "male_edit_enabled" BOOLEAN NOT NULL DEFAULT false,
    "granted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "current_phase" VARCHAR(16),
    "current_cycle_day" INTEGER,
    "next_predicted_period_start" DATE,
    "next_predicted_period_end" DATE,
    "next_predicted_ovulation_date" DATE,
    "confidence_level" VARCHAR(16),
    "reference_only_flag" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menstrual_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menstrual_cycles" (
    "id" BIGSERIAL NOT NULL,
    "profile_id" BIGINT NOT NULL,
    "relationship_id" BIGINT NOT NULL,
    "female_user_id" BIGINT NOT NULL,
    "started_on" DATE NOT NULL,
    "ended_on" DATE,
    "period_length_days" INTEGER,
    "cycle_length_days" INTEGER,
    "status" VARCHAR(16) NOT NULL DEFAULT 'in_progress',
    "created_by_user_id" BIGINT NOT NULL,
    "updated_by_user_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menstrual_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menstrual_daily_logs" (
    "id" BIGSERIAL NOT NULL,
    "profile_id" BIGINT NOT NULL,
    "cycle_id" BIGINT,
    "relationship_id" BIGINT NOT NULL,
    "record_date" DATE NOT NULL,
    "mood_state" VARCHAR(32),
    "pain_level" INTEGER,
    "flow_level" VARCHAR(32),
    "blood_color" VARCHAR(32),
    "blood_clot_flag" BOOLEAN,
    "discharge_type" VARCHAR(32),
    "abdomen_pain_area" VARCHAR(64),
    "back_pain_level" INTEGER,
    "breast_tenderness_level" INTEGER,
    "skin_status" VARCHAR(64),
    "sleep_quality" VARCHAR(32),
    "stress_level" INTEGER,
    "diet_status" VARCHAR(64),
    "exercise_level" VARCHAR(32),
    "body_temperature" DECIMAL(4,2),
    "weight_change_value" DECIMAL(5,2),
    "abnormal_event_text" TEXT,
    "note_text" TEXT,
    "created_by_user_id" BIGINT NOT NULL,
    "updated_by_user_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menstrual_daily_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menstrual_daily_log_images" (
    "id" BIGSERIAL NOT NULL,
    "daily_log_id" BIGINT NOT NULL,
    "image_url" VARCHAR(512) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menstrual_daily_log_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menstrual_prediction_results" (
    "id" BIGSERIAL NOT NULL,
    "profile_id" BIGINT NOT NULL,
    "relationship_id" BIGINT NOT NULL,
    "base_cycle_length_days" INTEGER,
    "base_period_length_days" INTEGER,
    "base_predicted_period_start_date" DATE,
    "base_predicted_period_end_date" DATE,
    "base_predicted_ovulation_date" DATE,
    "base_predicted_ovulation_window_start" DATE,
    "base_predicted_ovulation_window_end" DATE,
    "base_current_cycle_phase" VARCHAR(16),
    "ai_adjusted_period_start_date" DATE,
    "ai_adjusted_period_end_date" DATE,
    "ai_adjusted_ovulation_date" DATE,
    "ai_adjusted_ovulation_window_start" DATE,
    "ai_adjusted_ovulation_window_end" DATE,
    "ai_adjusted_current_cycle_phase" VARCHAR(16),
    "adjustment_days_for_period_start" INTEGER,
    "adjustment_days_for_period_end" INTEGER,
    "adjustment_days_for_ovulation" INTEGER,
    "confidence_score" DECIMAL(4,3),
    "confidence_level" VARCHAR(16),
    "adjustment_reason_summary" TEXT,
    "reference_only_flag" BOOLEAN NOT NULL DEFAULT false,
    "ai_available_flag" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menstrual_prediction_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menstrual_permission_logs" (
    "id" BIGSERIAL NOT NULL,
    "profile_id" BIGINT NOT NULL,
    "operator_user_id" BIGINT NOT NULL,
    "action_type" VARCHAR(16) NOT NULL,
    "old_view_enabled" BOOLEAN,
    "new_view_enabled" BOOLEAN,
    "old_edit_enabled" BOOLEAN,
    "new_edit_enabled" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menstrual_permission_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menstrual_operation_logs" (
    "id" BIGSERIAL NOT NULL,
    "profile_id" BIGINT NOT NULL,
    "operator_user_id" BIGINT NOT NULL,
    "operation_type" VARCHAR(32) NOT NULL,
    "target_type" VARCHAR(32) NOT NULL,
    "target_id" BIGINT,
    "detail_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menstrual_operation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "relationship_id" BIGINT,
    "notification_type" VARCHAR(32) NOT NULL,
    "title" VARCHAR(128) NOT NULL,
    "content" TEXT,
    "target_type" VARCHAR(32),
    "target_id" BIGINT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "couple_relationships_user_a_id_idx" ON "couple_relationships"("user_a_id");

-- CreateIndex
CREATE INDEX "couple_relationships_user_b_id_idx" ON "couple_relationships"("user_b_id");

-- CreateIndex
CREATE INDEX "couple_relationships_publisher_user_id_idx" ON "couple_relationships"("publisher_user_id");

-- CreateIndex
CREATE INDEX "couple_relationships_consumer_user_id_idx" ON "couple_relationships"("consumer_user_id");

-- CreateIndex
CREATE INDEX "couple_relationships_status_idx" ON "couple_relationships"("status");

-- CreateIndex
CREATE UNIQUE INDEX "couple_invites_invite_code_key" ON "couple_invites"("invite_code");

-- CreateIndex
CREATE INDEX "menu_categories_relationship_id_idx" ON "menu_categories"("relationship_id");

-- CreateIndex
CREATE INDEX "menu_categories_publisher_user_id_idx" ON "menu_categories"("publisher_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_categories_relationship_id_publisher_user_id_name_key" ON "menu_categories"("relationship_id", "publisher_user_id", "name");

-- CreateIndex
CREATE INDEX "menus_relationship_id_idx" ON "menus"("relationship_id");

-- CreateIndex
CREATE INDEX "menus_publisher_user_id_idx" ON "menus"("publisher_user_id");

-- CreateIndex
CREATE INDEX "menus_category_id_idx" ON "menus"("category_id");

-- CreateIndex
CREATE INDEX "menus_is_published_idx" ON "menus"("is_published");

-- CreateIndex
CREATE INDEX "menus_heat_score_idx" ON "menus"("heat_score");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_no_key" ON "orders"("order_no");

-- CreateIndex
CREATE INDEX "orders_relationship_id_idx" ON "orders"("relationship_id");

-- CreateIndex
CREATE INDEX "orders_menu_id_idx" ON "orders"("menu_id");

-- CreateIndex
CREATE INDEX "orders_publisher_user_id_idx" ON "orders"("publisher_user_id");

-- CreateIndex
CREATE INDEX "orders_consumer_user_id_idx" ON "orders"("consumer_user_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");

-- CreateIndex
CREATE INDEX "order_status_logs_order_id_idx" ON "order_status_logs"("order_id");

-- CreateIndex
CREATE INDEX "order_feedbacks_order_id_idx" ON "order_feedbacks"("order_id");

-- CreateIndex
CREATE INDEX "order_feedbacks_relationship_id_idx" ON "order_feedbacks"("relationship_id");

-- CreateIndex
CREATE INDEX "order_feedback_images_feedback_id_idx" ON "order_feedback_images"("feedback_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_conversations_relationship_id_key" ON "chat_conversations"("relationship_id");

-- CreateIndex
CREATE INDEX "chat_messages_conversation_id_idx" ON "chat_messages"("conversation_id");

-- CreateIndex
CREATE INDEX "chat_messages_sender_user_id_idx" ON "chat_messages"("sender_user_id");

-- CreateIndex
CREATE INDEX "chat_messages_receiver_user_id_idx" ON "chat_messages"("receiver_user_id");

-- CreateIndex
CREATE INDEX "chat_messages_sent_at_idx" ON "chat_messages"("sent_at");

-- CreateIndex
CREATE INDEX "chat_message_assets_message_id_idx" ON "chat_message_assets"("message_id");

-- CreateIndex
CREATE INDEX "chat_message_mentions_message_id_idx" ON "chat_message_mentions"("message_id");

-- CreateIndex
CREATE INDEX "chat_notification_receipts_message_id_idx" ON "chat_notification_receipts"("message_id");

-- CreateIndex
CREATE INDEX "reminder_trigger_logs_reminder_id_idx" ON "reminder_trigger_logs"("reminder_id");

-- CreateIndex
CREATE INDEX "space_post_images_post_id_idx" ON "space_post_images"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "menstrual_profiles_relationship_id_key" ON "menstrual_profiles"("relationship_id");

-- CreateIndex
CREATE INDEX "menstrual_cycles_profile_id_idx" ON "menstrual_cycles"("profile_id");

-- CreateIndex
CREATE INDEX "menstrual_cycles_relationship_id_idx" ON "menstrual_cycles"("relationship_id");

-- CreateIndex
CREATE INDEX "menstrual_cycles_started_on_idx" ON "menstrual_cycles"("started_on");

-- CreateIndex
CREATE UNIQUE INDEX "menstrual_daily_logs_profile_id_record_date_key" ON "menstrual_daily_logs"("profile_id", "record_date");

-- CreateIndex
CREATE INDEX "menstrual_daily_log_images_daily_log_id_idx" ON "menstrual_daily_log_images"("daily_log_id");

-- CreateIndex
CREATE INDEX "menstrual_permission_logs_profile_id_idx" ON "menstrual_permission_logs"("profile_id");

-- CreateIndex
CREATE INDEX "menstrual_operation_logs_profile_id_idx" ON "menstrual_operation_logs"("profile_id");

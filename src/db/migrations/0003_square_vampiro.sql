CREATE TABLE "comfyui_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"base_url" text NOT NULL,
	"workflow_json" jsonb NOT NULL,
	"img2img_workflow_json" jsonb,
	"output_node_id" text DEFAULT '9' NOT NULL,
	"placeholders" jsonb NOT NULL,
	"enhance_system_prompt" text,
	"enhance_img2img_system_prompt" text,
	"enhance_model" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "comfyui_profiles_user_id_name_unique" UNIQUE("user_id","name")
);
--> statement-breakpoint
ALTER TABLE "comfyui_profiles" ADD CONSTRAINT "comfyui_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
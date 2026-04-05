CREATE TABLE "installed_plugins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plugin_id" text NOT NULL,
	"name" text NOT NULL,
	"version" text NOT NULL,
	"github_url" text,
	"directory_name" text NOT NULL,
	"kind" text DEFAULT 'enhance' NOT NULL,
	"is_built_in" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"installed_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "installed_plugins_plugin_id_unique" UNIQUE("plugin_id")
);

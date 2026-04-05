import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  pgEnum,
  primaryKey,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);
export const providerTypeEnum = pgEnum("provider_type", ["local", "external"]);
export const authProviderEnum = pgEnum("auth_provider", ["local", "google"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash"),
  authProvider: authProviderEnum("auth_provider").notNull().default("local"),
  googleSub: text("google_sub").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  preview: text("preview").notNull().default(""),
  model: text("model").notNull(),
  provider: text("provider").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  model: text("model"),
  type: text("type").default("text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const providers = pgTable("providers", {
  id: text("id").primaryKey(), // e.g. "ollama"
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: providerTypeEnum("type").notNull(),
  baseUrl: text("base_url"),
  isActive: boolean("is_active").notNull().default(false),
  defaultModel: text("default_model"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const settings = pgTable(
  "settings",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: text("value").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.key] })]
);

export const comfyuiProfiles = pgTable(
  "comfyui_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    baseUrl: text("base_url").notNull(),
    workflowJson: jsonb("workflow_json").notNull(),
    img2imgWorkflowJson: jsonb("img2img_workflow_json"),
    outputNodeId: text("output_node_id").notNull().default("9"),
    placeholders: jsonb("placeholders").notNull(),
    img2imgPlaceholders: jsonb("img2img_placeholders"),
    enhanceSystemPrompt: text("enhance_system_prompt"),
    enhanceImg2ImgSystemPrompt: text("enhance_img2img_system_prompt"),
    enhanceModel: text("enhance_model"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.userId, t.name)]
);

// Relations (for Drizzle query builder)
export const usersRelations = relations(users, ({ many }) => ({
  conversations: many(conversations),
  providers: many(providers),
  settings: many(settings),
  comfyuiProfiles: many(comfyuiProfiles),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const providersRelations = relations(providers, ({ one }) => ({
  user: one(users, { fields: [providers.userId], references: [users.id] }),
}));

export const settingsRelations = relations(settings, ({ one }) => ({
  user: one(users, { fields: [settings.userId], references: [users.id] }),
}));

export const comfyuiProfilesRelations = relations(comfyuiProfiles, ({ one }) => ({
  user: one(users, { fields: [comfyuiProfiles.userId], references: [users.id] }),
}));

export const installedPlugins = pgTable("installed_plugins", {
  id: uuid("id").defaultRandom().primaryKey(),
  pluginId: text("plugin_id").notNull().unique(),
  name: text("name").notNull(),
  version: text("version").notNull(),
  githubUrl: text("github_url"),
  directoryName: text("directory_name").notNull(),
  kind: text("kind").notNull().default("enhance"),
  isBuiltIn: boolean("is_built_in").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  installedAt: timestamp("installed_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

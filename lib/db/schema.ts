import { relations } from "drizzle-orm";
import {
  boolean,
  double,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const CONTINENTS = [
  "Africa",
  "Antarctica",
  "Asia",
  "Europe",
  "North America",
  "Oceania",
  "South America",
] as const;

export type Continent = (typeof CONTINENTS)[number];

export const TRIP_PRIVACY = ["private", "family", "friends", "public"] as const;
export type TripPrivacy = (typeof TRIP_PRIVACY)[number];

export const PLACE_TYPES = ["city", "place", "landmark"] as const;
export type PlaceType = (typeof PLACE_TYPES)[number];

/* ── Better Auth tables ─────────────────────────────────────────── */

export const user = mysqlTable("user", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const session = mysqlTable("session", {
  id: varchar("id", { length: 36 }).primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = mysqlTable("account", {
  id: varchar("id", { length: 36 }).primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = mysqlTable("verification", {
  id: varchar("id", { length: 36 }).primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

/* ── App tables ─────────────────────────────────────────────────── */

export const countries = mysqlTable("countries", {
  code: varchar("code", { length: 8 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  nativeName: varchar("native_name", { length: 255 }),
  continent: varchar("continent", { length: 64 }).notNull(),
  region: varchar("region", { length: 128 }),
  latitude: double("latitude"),
  longitude: double("longitude"),
  flagEmoji: varchar("flag_emoji", { length: 16 }),
});

export const families = mysqlTable("families", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull(),
});

export const familyMembers = mysqlTable("family_members", {
  id: varchar("id", { length: 36 }).primaryKey(),
  familyId: varchar("family_id", { length: 36 })
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 36 }).references(() => user.id, {
    onDelete: "set null",
  }),
  role: mysqlEnum("role", ["owner", "member"]).notNull().default("member"),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  color: varchar("color", { length: 32 }).notNull(),
  inviteEmail: varchar("invite_email", { length: 255 }),
  createdAt: timestamp("created_at").notNull(),
});

export const trips = mysqlTable("trips", {
  id: varchar("id", { length: 36 }).primaryKey(),
  familyId: varchar("family_id", { length: 36 })
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  countryCode: varchar("country_code", { length: 8 })
    .notNull()
    .references(() => countries.code),
  title: varchar("title", { length: 255 }),
  startDate: varchar("start_date", { length: 32 }).notNull(),
  endDate: varchar("end_date", { length: 32 }).notNull(),
  notes: text("notes"),
  privacy: mysqlEnum("privacy", [...TRIP_PRIVACY]).notNull().default("family"),
  createdByUserId: varchar("created_by_user_id", { length: 36 })
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const tripParticipants = mysqlTable(
  "trip_participants",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    tripId: varchar("trip_id", { length: 36 })
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    familyMemberId: varchar("family_member_id", { length: 36 })
      .notNull()
      .references(() => familyMembers.id, { onDelete: "cascade" }),
  },
  (table) => ({
    uniqueParticipant: uniqueIndex("trip_participant_unique").on(
      table.tripId,
      table.familyMemberId,
    ),
  }),
);

export const tripPlaces = mysqlTable("trip_places", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tripId: varchar("trip_id", { length: 36 })
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", [...PLACE_TYPES]).notNull().default("city"),
  notes: text("notes"),
  latitude: double("latitude"),
  longitude: double("longitude"),
  countryCode: varchar("country_code", { length: 8 }).references(
    () => countries.code,
  ),
});

/** Extra countries on a trip (primary stays on trips.countryCode). */
export const tripCountries = mysqlTable(
  "trip_countries",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    tripId: varchar("trip_id", { length: 36 })
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    countryCode: varchar("country_code", { length: 8 })
      .notNull()
      .references(() => countries.code),
  },
  (table) => ({
    uniqueTripCountry: uniqueIndex("trip_country_unique").on(
      table.tripId,
      table.countryCode,
    ),
  }),
);

/** Family wishlist / want-to-go countries. */
export const wishlistItems = mysqlTable(
  "wishlist_items",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    familyId: varchar("family_id", { length: 36 })
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    countryCode: varchar("country_code", { length: 8 })
      .notNull()
      .references(() => countries.code),
    note: text("note"),
    createdByUserId: varchar("created_by_user_id", { length: 36 }).references(
      () => user.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => ({
    uniqueWishlistCountry: uniqueIndex("wishlist_country_unique").on(
      table.familyId,
      table.countryCode,
    ),
  }),
);

/** Public read-only share link for a family atlas. */
export const familyShares = mysqlTable("family_shares", {
  id: varchar("id", { length: 36 }).primaryKey(),
  familyId: varchar("family_id", { length: 36 })
    .notNull()
    .references(() => families.id, { onDelete: "cascade" })
    .unique(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const familiesRelations = relations(families, ({ many, one }) => ({
  members: many(familyMembers),
  trips: many(trips),
  wishlistItems: many(wishlistItems),
  share: one(familyShares, {
    fields: [families.id],
    references: [familyShares.familyId],
  }),
}));

export const familyMembersRelations = relations(
  familyMembers,
  ({ one, many }) => ({
    family: one(families, {
      fields: [familyMembers.familyId],
      references: [families.id],
    }),
    user: one(user, {
      fields: [familyMembers.userId],
      references: [user.id],
    }),
    tripParticipations: many(tripParticipants),
  }),
);

export const countriesRelations = relations(countries, ({ many }) => ({
  trips: many(trips),
  tripCountries: many(tripCountries),
  wishlistItems: many(wishlistItems),
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
  family: one(families, {
    fields: [trips.familyId],
    references: [families.id],
  }),
  country: one(countries, {
    fields: [trips.countryCode],
    references: [countries.code],
  }),
  createdBy: one(user, {
    fields: [trips.createdByUserId],
    references: [user.id],
  }),
  participants: many(tripParticipants),
  places: many(tripPlaces),
  countries: many(tripCountries),
}));

export const tripParticipantsRelations = relations(
  tripParticipants,
  ({ one }) => ({
    trip: one(trips, {
      fields: [tripParticipants.tripId],
      references: [trips.id],
    }),
    member: one(familyMembers, {
      fields: [tripParticipants.familyMemberId],
      references: [familyMembers.id],
    }),
  }),
);

export const tripPlacesRelations = relations(tripPlaces, ({ one }) => ({
  trip: one(trips, {
    fields: [tripPlaces.tripId],
    references: [trips.id],
  }),
  country: one(countries, {
    fields: [tripPlaces.countryCode],
    references: [countries.code],
  }),
}));

export const tripCountriesRelations = relations(tripCountries, ({ one }) => ({
  trip: one(trips, {
    fields: [tripCountries.tripId],
    references: [trips.id],
  }),
  country: one(countries, {
    fields: [tripCountries.countryCode],
    references: [countries.code],
  }),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  family: one(families, {
    fields: [wishlistItems.familyId],
    references: [families.id],
  }),
  country: one(countries, {
    fields: [wishlistItems.countryCode],
    references: [countries.code],
  }),
}));

export const familySharesRelations = relations(familyShares, ({ one }) => ({
  family: one(families, {
    fields: [familyShares.familyId],
    references: [families.id],
  }),
}));

export type Country = typeof countries.$inferSelect;
export type Family = typeof families.$inferSelect;
export type FamilyMember = typeof familyMembers.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type TripParticipant = typeof tripParticipants.$inferSelect;
export type TripPlace = typeof tripPlaces.$inferSelect;
export type TripCountry = typeof tripCountries.$inferSelect;
export type WishlistItem = typeof wishlistItems.$inferSelect;
export type FamilyShare = typeof familyShares.$inferSelect;

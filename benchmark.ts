// Change to ES module imports at top of file
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

import { bench, run } from "mitata";
import { Client } from "pg";
import { PrismaClient } from "@prisma/client";

// DB connection config
const DB_CONFIG = {
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "yourpassword",
  database: "orm_benchmark",
};

// Initialize all ORM connections
async function setup() {
  const client = new Client(DB_CONFIG);
  await client.connect();
  await client.query("DELETE FROM users");
  await client.end();
}

// 1. Drizzle ORM Implementation
async function drizzleTest() {
  const { drizzle } = require("drizzle-orm/node-postgres");
  const {
    pgTable,
    serial,
    varchar,
    timestamp,
  } = require("drizzle-orm/pg-core");
  const { Client } = require("pg");

  const client = new Client(DB_CONFIG);
  await client.connect();

  const users = pgTable("users", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    email: varchar("email", { length: 100 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  });

  const db = drizzle(client);

  // Clear table first
  await db.delete(users);

  // Then insert
  await db.insert(users).values({
    name: "Test User",
    email: `test-${Math.random()}@example.com`, // Unique email
  });

  // Query
  const result = await db.select().from(users);

  await client.end();
  return result;
}

// 2. Prisma Implementation
async function prismaTest() {
  // Use dynamic import to ensure proper initialization
  const prisma = new PrismaClient();

  try {
    // Clear table first
    await prisma.user.deleteMany();

    // Insert with unique email
    await prisma.user.create({
      data: {
        name: "Test User",
        email: `test-${Math.random().toString(36).substring(7)}@example.com`,
      },
    });

    // Query
    return await prisma.user.findMany();
  } finally {
    await prisma.$disconnect();
  }
}

// 3. Sequelize Implementation
async function sequelizeTest() {
  const { Sequelize, DataTypes } = await import("sequelize");

  const sequelize = new Sequelize({
    database: DB_CONFIG.database,
    username: DB_CONFIG.user, // Use 'username' instead of 'user'
    password: DB_CONFIG.password,
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    dialect: "postgres",
    logging: false,
  });

  const User = sequelize.define("User", {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
  });

  try {
    // Sync and clear table
    await User.sync({ force: true });

    // Insert
    await User.create({
      name: "Test User",
      email: `test-${Math.random().toString(36).substring(7)}@example.com`,
    });

    // Query
    return await User.findAll();
  } finally {
    await sequelize.close();
  }
}

// 4. KyselyTest Implementation
async function kyselyTest() {
  // Then use the interface directly
  interface Database {
    users: {
      id: number;
      name: string;
      email: string;
      created_at: Date;
    };
  }

  const db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool(DB_CONFIG),
    }),
  });

  // Clear table
  await db.deleteFrom("users").execute();

  // Insert with unique email
  await db
    .insertInto("users")
    .values({
      name: "Test User",
      email: `test-${Math.random()}@example.com`,
      created_at: new Date(),
      id: 1,
    })
    .execute();

  // Query
  const result = await db.selectFrom("users").selectAll().execute();

  await db.destroy();
  return result;
}

// Benchmark
bench("Drizzle ORM", async () => await drizzleTest());
bench("Prisma", async () => await prismaTest());
bench("Sequelize", async () => await sequelizeTest());
bench("Kysely", async () => await kyselyTest());

(async () => {
  await setup();
  await run();
})();

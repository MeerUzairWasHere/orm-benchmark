"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// Change to ES module imports at top of file
const kysely_1 = require("kysely");
const pg_1 = require("pg");
const mitata_1 = require("mitata");
const pg_2 = require("pg");
const client_1 = require("@prisma/client");
// DB connection config
const DB_CONFIG = {
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "yourpassword",
    database: "orm_benchmark",
};
// Initialize all ORM connections
function setup() {
    return __awaiter(this, void 0, void 0, function* () {
        const client = new pg_2.Client(DB_CONFIG);
        yield client.connect();
        yield client.query("DELETE FROM users");
        yield client.end();
    });
}
// 1. Drizzle ORM Implementation
function drizzleTest() {
    return __awaiter(this, void 0, void 0, function* () {
        const { drizzle } = require("drizzle-orm/node-postgres");
        const { pgTable, serial, varchar, timestamp, } = require("drizzle-orm/pg-core");
        const { Client } = require("pg");
        const client = new Client(DB_CONFIG);
        yield client.connect();
        const users = pgTable("users", {
            id: serial("id").primaryKey(),
            name: varchar("name", { length: 100 }).notNull(),
            email: varchar("email", { length: 100 }).notNull(),
            createdAt: timestamp("created_at").defaultNow(),
        });
        const db = drizzle(client);
        // Clear table first
        yield db.delete(users);
        // Then insert
        yield db.insert(users).values({
            name: "Test User",
            email: `test-${Math.random()}@example.com`, // Unique email
        });
        // Query
        const result = yield db.select().from(users);
        yield client.end();
        return result;
    });
}
// 2. Prisma Implementation
function prismaTest() {
    return __awaiter(this, void 0, void 0, function* () {
        // Use dynamic import to ensure proper initialization
        const prisma = new client_1.PrismaClient();
        try {
            // Clear table first
            yield prisma.user.deleteMany();
            // Insert with unique email
            yield prisma.user.create({
                data: {
                    name: "Test User",
                    email: `test-${Math.random().toString(36).substring(7)}@example.com`,
                },
            });
            // Query
            return yield prisma.user.findMany();
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
// 3. Sequelize Implementation
function sequelizeTest() {
    return __awaiter(this, void 0, void 0, function* () {
        const { Sequelize, DataTypes } = yield Promise.resolve().then(() => __importStar(require("sequelize")));
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
            yield User.sync({ force: true });
            // Insert
            yield User.create({
                name: "Test User",
                email: `test-${Math.random().toString(36).substring(7)}@example.com`,
            });
            // Query
            return yield User.findAll();
        }
        finally {
            yield sequelize.close();
        }
    });
}
// 4. KyselyTest Implementation
function kyselyTest() {
    return __awaiter(this, void 0, void 0, function* () {
        const db = new kysely_1.Kysely({
            dialect: new kysely_1.PostgresDialect({
                pool: new pg_1.Pool(DB_CONFIG),
            }),
        });
        // Clear table
        yield db.deleteFrom("users").execute();
        // Insert with unique email
        yield db
            .insertInto("users")
            .values({
            name: "Test User",
            email: `test-${Math.random()}@example.com`,
            created_at: new Date(),
            id: 1,
        })
            .execute();
        // Query
        const result = yield db.selectFrom("users").selectAll().execute();
        yield db.destroy();
        return result;
    });
}
// Benchmark
(0, mitata_1.bench)("Drizzle ORM", () => __awaiter(void 0, void 0, void 0, function* () { return yield drizzleTest(); }));
(0, mitata_1.bench)("Prisma", () => __awaiter(void 0, void 0, void 0, function* () { return yield prismaTest(); }));
(0, mitata_1.bench)("Sequelize", () => __awaiter(void 0, void 0, void 0, function* () { return yield sequelizeTest(); }));
(0, mitata_1.bench)("Kysely", () => __awaiter(void 0, void 0, void 0, function* () { return yield kyselyTest(); }));
(() => __awaiter(void 0, void 0, void 0, function* () {
    yield setup();
    yield (0, mitata_1.run)();
}))();

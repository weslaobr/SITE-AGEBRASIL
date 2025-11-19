import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false  // Forçar sem SSL
});

pool.on("connect", () => console.log("📡 Conectado ao PostgreSQL"));
pool.on("error", (err) => console.error("❌ Erro de conexão com PostgreSQL:", err));

export default pool;
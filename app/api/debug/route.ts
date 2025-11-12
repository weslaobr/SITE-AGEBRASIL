import { NextResponse } from "next/server";
import { database } from "@/lib/database";

export async function GET() {
  try {
    // Testa conexão executando uma query simples no PostgreSQL
    const result = await database["pool"].query("SELECT NOW() as now");

    return NextResponse.json({
      status: "✅ Banco de dados conectado com sucesso!",
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error("❌ Erro ao testar conexão com PostgreSQL:", error);
    return NextResponse.json(
      {
        status: "❌ Falha ao conectar ao banco de dados",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

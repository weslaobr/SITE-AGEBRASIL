// app/api/seasons/route.ts
import { NextResponse } from "next/server";

// cache por 1h
export const revalidate = 3600;

export async function GET() {
  try {
    const seasons = [
      { id: 12, name: "Season 12", start_date: "2024-08-01", end_date: "2024-11-01", is_current: true },
      { id: 11, name: "Season 11", start_date: "2024-05-01", end_date: "2024-08-01", is_current: false },
      { id: 10, name: "Season 10", start_date: "2024-02-01", end_date: "2024-05-01", is_current: false },
    ];

    return NextResponse.json({ success: true, data: seasons });
  } catch (err: any) {
    console.error("❌ Erro ao carregar seasons:", err);
    return NextResponse.json(
      { success: false, error: "Erro ao carregar temporadas" },
      { status: 500 }
    );
  }
}

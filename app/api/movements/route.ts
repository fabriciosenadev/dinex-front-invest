import { NextResponse } from "next/server";

const apiBaseUrl = process.env.DINEX_API_URL ?? "http://localhost:5254";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const authHeader = request.headers.get("authorization") ?? "";

    const response = await fetch(`${apiBaseUrl}/api/movements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader
      },
      body: JSON.stringify(payload),
      cache: "no-store"
    });

    const text = await response.text();

    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" }
    });
  } catch {
    return NextResponse.json(
      { message: `Nao foi possivel conectar na API em ${apiBaseUrl}. Verifique se ela esta rodando.` },
      { status: 502 }
    );
  }
}

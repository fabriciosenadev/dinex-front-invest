import { NextResponse } from "next/server";

const apiBaseUrl = process.env.DINEX_API_URL ?? process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5254";

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const response = await fetch(`${apiBaseUrl}/api/users/authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      { errors: [`Nao foi possivel conectar na API em ${apiBaseUrl}. Verifique se ela esta rodando.`] },
      { status: 502 }
    );
  }
}

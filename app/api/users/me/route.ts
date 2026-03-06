import { NextResponse } from "next/server";

const apiBaseUrl = process.env.DINEX_API_URL ?? "http://localhost:5254";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";

    const response = await fetch(`${apiBaseUrl}/api/users/me`, {
      method: "GET",
      headers: {
        Authorization: authHeader
      },
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

import { NextResponse } from "next/server";

const apiBaseUrl = process.env.DINEX_API_URL ?? process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5254";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const url = new URL(request.url);
    const query = url.searchParams.toString();
    const target = query ? `${apiBaseUrl}/api/movements/portfolio?${query}` : `${apiBaseUrl}/api/movements/portfolio`;

    const response = await fetch(target, {
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
      { message: `Nao foi possivel conectar na API em ${apiBaseUrl}. Verifique se ela esta rodando.` },
      { status: 502 }
    );
  }
}

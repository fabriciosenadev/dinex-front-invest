import { NextResponse } from "next/server";

const apiBaseUrl = process.env.DINEX_API_URL ?? process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5254";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const payload = await request.json();
    const { id } = await context.params;

    const response = await fetch(`${apiBaseUrl}/api/corporateevents/${id}`, {
      method: "PUT",
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
      { errors: [`Nao foi possivel conectar na API em ${apiBaseUrl}. Verifique se ela esta rodando.`] },
      { status: 502 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const { id } = await context.params;

    const response = await fetch(`${apiBaseUrl}/api/corporateevents/${id}`, {
      method: "DELETE",
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

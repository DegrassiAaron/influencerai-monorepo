import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "");
    const password = String(body?.password || "");
    const magic = String(body?.magic || "");

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, magic }),
    });

    if (!res.ok) {
      const text = await res.text();
      return new NextResponse(text || "Unauthorized", { status: res.status });
    }

    const data = (await res.json()) as { access_token?: string };
    if (!data?.access_token) {
      return NextResponse.json({ error: "No token returned" }, { status: 500 });
    }

    const response = NextResponse.json({ ok: true });
    const prod = process.env.NODE_ENV === "production";
    response.cookies.set("auth_token", data.access_token, {
      httpOnly: true,
      secure: prod,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 hours
    });
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Login failed" }, { status: 500 });
  }
}


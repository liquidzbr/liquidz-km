import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return Response.json({ error: "Parâmetros lat e lon obrigatórios" }, { status: 400 });
  }

  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "API key não configurada" }, { status: 500 });
  }

  const url = `https://api.openrouteservice.org/geocode/reverse?api_key=${apiKey}&point.lon=${lon}&point.lat=${lat}&size=1`;
  const res = await fetch(url);

  if (!res.ok) {
    return Response.json({ endereco: null }, { status: 200 });
  }

  const data = await res.json();
  const label: string | null = data.features?.[0]?.properties?.label ?? null;

  return Response.json({ endereco: label });
}

import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { latInicio, lonInicio, latFim, lonFim } = await request.json();

  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "API key não configurada" }, { status: 500 });
  }

  const res = await fetch("https://api.openrouteservice.org/v2/directions/driving-car", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({
      coordinates: [
        [lonInicio, latInicio],
        [lonFim, latFim],
      ],
    }),
  });

  if (!res.ok) {
    return Response.json({ error: "Erro ao calcular rota" }, { status: 502 });
  }

  const data = await res.json();
  const distanciaMetros: number = data.routes?.[0]?.summary?.distance ?? 0;
  const kmRodados = distanciaMetros / 1000;

  return Response.json({ kmRodados: Math.round(kmRodados * 10) / 10 });
}

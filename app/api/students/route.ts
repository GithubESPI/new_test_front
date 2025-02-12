import { NextResponse } from "next/server";

export async function GET() {
  try {
    const baseUrl = process.env.YPAERO_BASE_URL;
    const apiToken = process.env.YPAERO_API_TOKEN;

    if (!baseUrl || !apiToken) {
      throw new Error("Variables d'environnement manquantes");
    }

    const url = `${baseUrl}/r/v1/formation-longue/apprenants?codesPeriode=4`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Auth-Token": apiToken,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données", details: (error as Error).message },
      { status: 500 }
    );
  }
}

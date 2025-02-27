import { NextResponse } from "next/server";

const token =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3MjA0NzYwMDAsImNsdCI6IjNFREI0QUU3LTlGNDEtNDM4QS1CRDE1LTQ1Rjk3MEVEQ0VCOSJ9.q8i-pDiwdf4Zlja-bd9keZTD0IIeJOrKDl8PGai9mPE";
const url = "https://groupe-espi.ymag.cloud/index.php/r/v1/sql/requeteur";

export async function GET() {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-Auth-Token": token,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sql: "SELECT * FROM PERIODE_EVALUATION ORDER BY NOM_PERIODE_EVALUATION",
      }),
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const responseData = await response.json();

    // S'assurer que les données sont un tableau
    const periodsArray = Array.isArray(responseData) ? responseData : Object.values(responseData);

    return NextResponse.json({
      success: true,
      data: periodsArray,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des périodes:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la récupération des périodes d'évaluation",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

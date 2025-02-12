/* eslint-disable @typescript-eslint/no-explicit-any */
import { writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import { join } from "path";

interface FormattedData {
  timestamp: string;
  campus: string;
  group: string;
  semester: string;
  queries: {
    [key: string]: {
      query: string;
      results: any[];
      error?: string;
    };
  };
}

async function executeQuery(query: string, token: string): Promise<any> {
  try {
    const url = "https://groupe-espi.ymag.cloud/index.php/r/v1/sql/requeteur";
    console.log("Exécution de la requête:", query);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-Auth-Token": token,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ sql: query }),
    });

    const text = await response.text();
    console.log("Réponse brute:", text);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${text}`);
    }

    try {
      const data = JSON.parse(text);
      return Array.isArray(data) ? data : Object.values(data);
    } catch (parseError) {
      console.error("Erreur de parsing JSON:", parseError);
      throw new Error(`Erreur de parsing JSON: ${text}`);
    }
  } catch (error) {
    console.error("Erreur lors de la requête SQL:", error);
    throw error;
  }
}

async function saveDataToJson(data: FormattedData) {
  try {
    await writeFile(join(process.cwd(), "data.json"), JSON.stringify(data, null, 2));
    console.log("📁 Données sauvegardées dans data.json");
  } catch (error) {
    console.error("Erreur lors de la sauvegarde:", error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { campus, group } = body;

    if (!campus || !group) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    console.log("Paramètres reçus:", { campus, group });

    const token =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3MjA0NzYwMDAsImNsdCI6IjNFREI0QUU3LTlGNDEtNDM4QS1CRDE1LTQ1Rjk3MEVEQ0VCOSJ9.q8i-pDiwdf4Zlja-bd9keZTD0IIeJOrKDl8PGai9mPE";

    // Requêtes SQL décomposées
    const queries = {
      GROUPE: `SELECT * FROM GROUPE WHERE CODE_GROUPE = ${group}`,
      INSCRIPTIONS: `SELECT CODE_APPRENANT FROM INSCRIPTION WHERE CODE_GROUPE = ${group}`,
      APPRENANT: `SELECT CODE_APPRENANT, NOM_APPRENANT, PRENOM_APPRENANT, DATE_NAISSANCE FROM APPRENANT WHERE CODE_APPRENANT IN (SELECT CODE_APPRENANT FROM INSCRIPTION WHERE CODE_GROUPE = ${group})`,
      MATIERES_CODES: `SELECT DISTINCT CODE_MATIERE FROM EVALUATION WHERE CODE_GROUPE = ${group}`,
      MATIERE: `SELECT CODE_MATIERE, NOM_MATIERE FROM MATIERE WHERE CODE_MATIERE IN (SELECT DISTINCT CODE_MATIERE FROM EVALUATION WHERE CODE_GROUPE = ${group})`,
      EVALUATIONS: `SELECT CODE_EVALUATION FROM EVALUATION WHERE CODE_GROUPE = ${group}`,
      NOTES_SIMPLES: `SELECT n.CODE_NOTE, n.VALEUR_NOTE, n.CODE_APPRENANT FROM NOTE n WHERE n.CODE_EVALUATION IN (SELECT CODE_EVALUATION FROM EVALUATION WHERE CODE_GROUPE = ${group})`,
      NOTE: `SELECT n.CODE_NOTE, n.VALEUR_NOTE, a.NOM_APPRENANT, a.PRENOM_APPRENANT, m.NOM_MATIERE FROM NOTE n INNER JOIN EVALUATION e ON n.CODE_EVALUATION = e.CODE_EVALUATION INNER JOIN APPRENANT a ON n.CODE_APPRENANT = a.CODE_APPRENANT INNER JOIN MATIERE m ON e.CODE_MATIERE = m.CODE_MATIERE WHERE e.CODE_GROUPE = ${group}`,
    };

    const results: Record<string, any[]> = {};
    const formattedData: FormattedData = {
      timestamp: new Date().toISOString(),
      campus: campus.toString(),
      group: group.toString(),
      semester: "s1", // Valeur par défaut
      queries: {},
    };

    // Exécuter chaque requête séparément
    for (const [key, query] of Object.entries(queries)) {
      try {
        console.log(`\n📊 Exécution de la requête ${key}`);
        const queryResults = await executeQuery(query, token);
        results[key] = queryResults;
        formattedData.queries[key] = {
          query,
          results: queryResults,
        };
      } catch (error: any) {
        console.error(`Erreur pour ${key}:`, error);
        formattedData.queries[key] = {
          query,
          results: [],
          error: error.message,
        };
      }
    }

    // Sauvegarder les données brutes
    await saveDataToJson(formattedData);

    return NextResponse.json({
      success: true,
      data: results,
      timestamp: formattedData.timestamp,
    });
  } catch (error: any) {
    console.error("Erreur générale:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la récupération des données",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

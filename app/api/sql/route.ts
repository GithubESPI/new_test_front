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

interface QueryResults {
  GROUPE: any[];
  SITE: any[];
  APPRENANT: any[];
  ABSENCE: any[];
  STATISTIQUES: any[];
  MATIERE: any[];
  MOYENNES_UE: any[];
  MOYENNE_GENERALE: any[];
  ECTS_PAR_MATIERE: any[];
}

async function executeQuery(query: string, token: string): Promise<any[]> {
  try {
    const url = "https://groupe-espi.ymag.cloud/index.php/r/v1/sql/requeteur";
    console.log("URL de l'API:", url);
    console.log("Requête SQL:", query);

    const requestBody = { sql: query };
    console.log("Corps de la requête:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-Auth-Token": token,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("Statut de la réponse:", response.status);
    const responseText = await response.text();
    console.log("Réponse brute:", responseText);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${responseText}`);
    }

    try {
      const data = JSON.parse(responseText);
      const results = Array.isArray(data) ? data : Object.values(data);
      console.log("Résultats parsés:", results);
      return results;
    } catch (parseError) {
      console.error("Erreur de parsing JSON:", parseError);
      throw new Error(`Erreur de parsing JSON: ${responseText}`);
    }
  } catch (error) {
    console.error("Erreur lors de la requête SQL:", error);
    throw error;
  }
}

async function saveDataToJson(data: FormattedData) {
  try {
    const filePath = join(process.cwd(), "data.json");
    await writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`📁 Données sauvegardées dans ${filePath}`);
  } catch (error) {
    console.error("Erreur lors de la sauvegarde:", error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Corps de la requête reçue:", body);

    const campus = body.campus;
    const group = body.group;
    const periodeEvaluation = body.periodeEvaluation;
    const semester = body.semester?.toString() || "s1";

    console.log("Paramètres extraits:", { campus, group, semester });

    if (!campus || !group || !periodeEvaluation) {
      console.error("Paramètres manquants:", { campus, group, periodeEvaluation });
      return NextResponse.json(
        {
          error: "Paramètres manquants",
          details: "Le campus et le groupe sont requis",
        },
        { status: 400 }
      );
    }

    const token =
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3MjA0NzYwMDAsImNsdCI6IjNFREI0QUU3LTlGNDEtNDM4QS1CRDE1LTQ1Rjk3MEVEQ0VCOSJ9.q8i-pDiwdf4Zlja-bd9keZTD0IIeJOrKDl8PGai9mPE";

    // Étape 1️⃣ : Récupérer le NOM_GROUPE à partir du CODE_GROUPE
    const groupQuery = `SELECT NOM_GROUPE FROM GROUPE WHERE CODE_GROUPE = ${group}`;
    const groupResults = await executeQuery(groupQuery, token);

    if (!groupResults.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Aucun groupe trouvé",
          details: "Le CODE_GROUPE fourni ne correspond à aucun NOM_GROUPE.",
        },
        { status: 404 }
      );
    }

    const nomGroupe = groupResults[0].NOM_GROUPE; // Extraction du NOM_GROUPE

    console.log("✅ NOM_GROUPE récupéré:", nomGroupe);

    const queries: Record<keyof QueryResults, string> = {
      GROUPE: `
        SELECT DISTINCT 
          g.NOM_GROUPE, 
          g.ETENDU_GROUPE, 
          f.NOM_FORMATION
      FROM GROUPE g
      INNER JOIN FORMATION f 
          ON g.CODE_FORMATION = f.CODE_FORMATION
      INNER JOIN INSCRIPTION i 
          ON g.CODE_PERSONNEL = i.CODE_PERSONNEL
          AND i.CODE_FORMATION = f.CODE_FORMATION
      INNER JOIN SESSION s 
          ON i.CODE_SESSION = s.CODE_SESSION
      WHERE g.CODE_GROUPE = ${group}
      AND s.CODE_SESSION = 4;
      `,

      SITE: `
        SELECT DISTINCT s.*
        FROM SITE s
        WHERE s.CODE_SITE = ${campus}
      `,

      APPRENANT: `
        SELECT DISTINCT 
          a.CODE_APPRENANT, 
          a.NOM_APPRENANT, 
          a.PRENOM_APPRENANT, 
          a.DATE_NAISSANCE
      FROM APPRENANT a
      INNER JOIN INSCRIPTION i 
          ON a.CODE_APPRENANT = i.CODE_APPRENANT
      INNER JOIN GROUPE g 
          ON i.CODE_PERSONNEL = g.CODE_PERSONNEL
      INNER JOIN SESSION s 
          ON i.CODE_SESSION = s.CODE_SESSION
      WHERE g.CODE_GROUPE = ${group}
      AND s.CODE_SESSION = 4
      ORDER BY a.NOM_APPRENANT, a.PRENOM_APPRENANT;
      `,

      ABSENCE: `
        SELECT 
          a.MINUTE_DEB, 
          a.MINUTE_FIN, 
          a.IS_RETARD,
          a.CODE_APPRENANT,
          a.DATE_DEB,
          ap.NOM_APPRENANT,
          ap.PRENOM_APPRENANT
      FROM ABSENCE a
      INNER JOIN APPRENANT ap 
          ON a.CODE_APPRENANT = ap.CODE_APPRENANT
      INNER JOIN INSCRIPTION i 
          ON ap.CODE_APPRENANT = i.CODE_APPRENANT
      INNER JOIN GROUPE g 
          ON i.CODE_PERSONNEL = g.CODE_PERSONNEL
      INNER JOIN SESSION s 
          ON i.CODE_SESSION = s.CODE_SESSION
      WHERE g.CODE_GROUPE = ${group}
      AND s.CODE_SESSION = 4
      ORDER BY a.DATE_DEB DESC, ap.NOM_APPRENANT;
      `,

      STATISTIQUES: `
      SELECT 
        (SELECT COUNT(DISTINCT a.CODE_APPRENANT) 
         FROM APPRENANT a
         INNER JOIN INSCRIPTION i ON a.CODE_APPRENANT = i.CODE_APPRENANT
         INNER JOIN GROUPE g ON i.CODE_PERSONNEL = g.CODE_PERSONNEL
         WHERE g.CODE_GROUPE = ${group}) as total_apprenants,
        
        (SELECT COUNT(DISTINCT a.CODE_APPRENANT)
         FROM ABSENCE abs
         INNER JOIN APPRENANT a ON abs.CODE_APPRENANT = a.CODE_APPRENANT
         INNER JOIN INSCRIPTION i ON a.CODE_APPRENANT = i.CODE_APPRENANT
         INNER JOIN GROUPE g ON i.CODE_PERSONNEL = g.CODE_PERSONNEL
         WHERE g.CODE_GROUPE = ${group}) as apprenants_avec_absences,
        
        (SELECT COUNT(*)
         FROM ABSENCE abs
         INNER JOIN APPRENANT a ON abs.CODE_APPRENANT = a.CODE_APPRENANT
         INNER JOIN INSCRIPTION i ON a.CODE_APPRENANT = i.CODE_APPRENANT
         INNER JOIN GROUPE g ON i.CODE_PERSONNEL = g.CODE_PERSONNEL
         WHERE g.CODE_GROUPE = ${group}) as total_absences
    `,

      MATIERE: `
    SELECT DISTINCT 
      g.NOM_GROUPE, 
      pe.NOM_PERIODE_EVALUATION, 
      m.CODE_MATIERE, 
      m.NOM_MATIERE, 
      rd.NUM_ORDRE
    FROM SESSION s
    JOIN INSCRIPTION i 
      ON s.CODE_SESSION = i.CODE_SESSION
    JOIN GROUPE g 
      ON i.CODE_PERSONNEL = g.CODE_PERSONNEL
    JOIN MOYENNE_PERIODE mp 
      ON s.CODE_SESSION = mp.CODE_SESSION 
      AND i.CODE_APPRENANT = mp.CODE_APPRENANT
    JOIN REFERENTIEL r 
      ON mp.CODE_REFERENTIEL = r.CODE_REFERENTIEL
    JOIN REFERENTIEL_DETAIL rd 
      ON r.CODE_REFERENTIEL = rd.CODE_REFERENTIEL
    JOIN MATIERE m 
      ON rd.CODE_MATIERE = m.CODE_MATIERE
    JOIN PERIODICITE_EVALUATION peval 
      ON s.CODE_SESSION = peval.CODE_SESSION
    JOIN PERIODE_EVALUATION pe 
      ON peval.CODE_PERIODICITE_EVALUATION = pe.CODE_PERIODICITE_EVALUATION
    JOIN GROUPE_PERIODE_EVALUATION gpe 
      ON pe.CODE_PERIODE_EVALUATION = gpe.CODE_PERIODE_EVALUATION
    WHERE s.CODE_SESSION = 4
    AND g.NOM_GROUPE = '${nomGroupe}'
    AND pe.NOM_PERIODE_EVALUATION = '${periodeEvaluation}'
    ORDER BY rd.NUM_ORDRE ASC, pe.NOM_PERIODE_EVALUATION, m.CODE_MATIERE;
  `,
      MOYENNES_UE: `
        SELECT 
            g.NOM_GROUPE,
            ap.NOM_APPRENANT,
            ap.PRENOM_APPRENANT,
            m.NOM_MATIERE,
            mm.MOYENNE
        FROM MOYENNE_MATIERE_PERIODE mm
        INNER JOIN APPRENANT ap 
            ON mm.CODE_APPRENANT = ap.CODE_APPRENANT
        INNER JOIN INSCRIPTION i 
            ON ap.CODE_APPRENANT = i.CODE_APPRENANT
        INNER JOIN GROUPE g 
            ON mm.CODE_GROUPE = g.CODE_GROUPE
        INNER JOIN MATIERE m 
            ON mm.CODE_MATIERE = m.CODE_MATIERE
        INNER JOIN SESSION s 
            ON i.CODE_SESSION = s.CODE_SESSION
        WHERE g.NOM_GROUPE = '${nomGroupe}'
        AND s.CODE_SESSION = 4
        ORDER BY ap.NOM_APPRENANT, ap.PRENOM_APPRENANT, m.NOM_MATIERE;
    `,

      MOYENNE_GENERALE: `
      SELECT 
          g.NOM_GROUPE,
          ap.NOM_APPRENANT,
          ap.PRENOM_APPRENANT,
          AVG(mp.MOYENNE) AS MOYENNE_GENERALE
      FROM MOYENNE_PERIODE mp
      INNER JOIN APPRENANT ap 
          ON mp.CODE_APPRENANT = ap.CODE_APPRENANT
      INNER JOIN INSCRIPTION i 
          ON ap.CODE_APPRENANT = i.CODE_APPRENANT
      INNER JOIN GROUPE g 
          ON mp.CODE_GROUPE = g.CODE_GROUPE
      INNER JOIN SESSION s 
          ON i.CODE_SESSION = s.CODE_SESSION
      WHERE g.NOM_GROUPE = '${nomGroupe}'
      AND s.CODE_SESSION = 4
      GROUP BY g.NOM_GROUPE, ap.NOM_APPRENANT, ap.PRENOM_APPRENANT
      ORDER BY ap.NOM_APPRENANT, ap.PRENOM_APPRENANT;
  `,
      ECTS_PAR_MATIERE: `
  SELECT 
      g.NOM_GROUPE,
      ap.CODE_APPRENANT,
      ap.NOM_APPRENANT,
      ap.PRENOM_APPRENANT,
      m.NOM_MATIERE,
      COALESCE(rd.CREDIT_ECTS, 0) AS CREDIT_ECTS
  FROM SESSION s
  INNER JOIN INSCRIPTION i 
      ON s.CODE_SESSION = i.CODE_SESSION
  INNER JOIN GROUPE g 
      ON i.CODE_PERSONNEL = g.CODE_PERSONNEL
  INNER JOIN APPRENANT ap 
      ON i.CODE_APPRENANT = ap.CODE_APPRENANT
  LEFT JOIN MOYENNE_PERIODE mp
      ON ap.CODE_APPRENANT = mp.CODE_APPRENANT
      AND g.CODE_GROUPE = mp.CODE_GROUPE
  LEFT JOIN REFERENTIEL_DETAIL rd 
      ON mp.CODE_REFERENTIEL = rd.CODE_REFERENTIEL
  LEFT JOIN MATIERE m 
      ON rd.CODE_MATIERE = m.CODE_MATIERE
  WHERE g.NOM_GROUPE = '${nomGroupe}'
  AND s.CODE_SESSION = 4
  ORDER BY ap.NOM_APPRENANT, ap.PRENOM_APPRENANT, m.NOM_MATIERE;
`,
    };

    const results: Partial<QueryResults> = {};
    const formattedData: FormattedData = {
      timestamp: new Date().toISOString(),
      campus: campus.toString(),
      group: group.toString(),
      semester: semester,
      queries: {},
    };

    let hasSuccessfulQuery = false;
    let totalResults = 0;

    for (const [key, query] of Object.entries(queries)) {
      try {
        console.log(`\n📊 Exécution de la requête ${key}`);
        const queryResults = await executeQuery(query, token);

        if (queryResults && queryResults.length > 0) {
          hasSuccessfulQuery = true;
          totalResults += queryResults.length;
        }

        results[key as keyof QueryResults] = queryResults;
        formattedData.queries[key] = {
          query,
          results: queryResults,
        };

        console.log(`✅ Requête ${key} terminée:`, {
          résultats: queryResults.length,
          premierRésultat: queryResults[0],
        });
      } catch (error: any) {
        console.error(`❌ Erreur pour ${key}:`, error);
        formattedData.queries[key] = {
          query,
          results: [],
          error: error.message,
        };
      }
    }

    await saveDataToJson(formattedData);

    if (!hasSuccessfulQuery) {
      console.log("❌ Aucune donnée n'a été récupérée pour toutes les requêtes");
      return NextResponse.json(
        {
          success: false,
          error: "Aucune donnée n'a été récupérée",
          details: "Toutes les requêtes ont échoué ou n'ont retourné aucun résultat",
        },
        { status: 404 }
      );
    }

    console.log(`✅ Données récupérées avec succès (${totalResults} résultats au total)`);
    return NextResponse.json({
      success: true,
      data: results,
      timestamp: formattedData.timestamp,
      totalResults,
    });
  } catch (error: any) {
    console.error("❌ Erreur générale:", error);
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

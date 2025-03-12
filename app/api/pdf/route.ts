/* eslint-disable @typescript-eslint/no-explicit-any */
import { fileStorage } from "@/lib/fileStorage"; // Utiliser fileStorage au lieu de tempFileStorage
import JSZip from "jszip";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// Type definitions for the student data
interface StudentData {
  CODE_APPRENANT: string;
  NOM_APPRENANT: string;
  PRENOM_APPRENANT: string;
  DATE_NAISSANCE?: string;
  [key: string]: any;
}

interface StudentGrade {
  CODE_APPRENANT: string;
  NOM_APPRENANT: string;
  PRENOM_APPRENANT: string;
  CODE_MATIERE: string;
  NOM_MATIERE: string;
  MOYENNE: number;
  [key: string]: any;
}

interface StudentAverage {
  CODE_APPRENANT: string;
  NOM_APPRENANT: string;
  PRENOM_APPRENANT: string;
  MOYENNE_GENERALE: number;
  [key: string]: any;
}

interface Observation {
  CODE_APPRENANT: string;
  NOM_APPRENANT: string;
  PRENOM_APPRENANT: string;
  MEMO_OBSERVATION: string;
  [key: string]: any;
}

interface SubjectECTS {
  CODE_APPRENANT: string;
  NOM_APPRENANT: string;
  PRENOM_APPRENANT: string;
  CODE_MATIERE: string;
  NOM_MATIERE: string;
  CREDIT_ECTS: number;
  [key: string]: any;
}

interface GroupInfo {
  NOM_GROUPE: string;
  ETENDU_GROUPE?: string;
  NOM_FORMATION?: string;
  [key: string]: any;
}

interface CampusInfo {
  CODE_SITE: number;
  NOM_SITE: string;
  [key: string]: any;
}

// Function to create a PDF for a student
async function createStudentPDF(
  student: StudentData,
  grades: StudentGrade[],
  averages: StudentAverage[],
  observations: Observation[],
  subjects: SubjectECTS[],
  groupInfo: GroupInfo[],
  campusInfo: CampusInfo[],
  period: string
): Promise<Uint8Array> {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595.28, 841.89]);

    // Load fonts
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    // Get student's grades, average and observation
    const studentGrades = grades.filter((grade) => grade.CODE_APPRENANT === student.CODE_APPRENANT);
    const studentAverage = averages.find((avg) => avg.CODE_APPRENANT === student.CODE_APPRENANT);
    const studentObservation = observations.find(
      (obs) => obs.CODE_APPRENANT === student.CODE_APPRENANT
    );
    const studentECTS = subjects.filter((subj) => subj.CODE_APPRENANT === student.CODE_APPRENANT);

    // Get group and campus info
    const group = groupInfo.length > 0 ? groupInfo[0] : null;
    const campus = campusInfo.length > 0 ? campusInfo[0] : null;

    // Set up margins and positions
    const margin = 50;
    let currentY = page.getHeight() - margin;
    const lineHeight = 20;

    // Draw school header
    page.drawText("ÉCOLE SUPÉRIEURE DE L'IMMOBILIER", {
      x: margin,
      y: currentY,
      size: 16,
      font: timesBoldFont,
      color: rgb(0.04, 0.36, 0.51), // #0A5D81 in RGB
    });

    currentY -= lineHeight * 1.5;

    // Draw bulletin title
    page.drawText(`BULLETIN DE NOTES - ${period}`, {
      x: margin,
      y: currentY,
      size: 14,
      font: timesBoldFont,
      color: rgb(0, 0, 0),
    });

    currentY -= lineHeight * 2;

    // Draw student info
    page.drawText(`Étudiant: ${student.NOM_APPRENANT} ${student.PRENOM_APPRENANT}`, {
      x: margin,
      y: currentY,
      size: 12,
      font: timesBoldFont,
    });

    currentY -= lineHeight;

    if (student.DATE_NAISSANCE) {
      page.drawText(
        `Date de naissance: ${new Date(student.DATE_NAISSANCE).toLocaleDateString("fr-FR")}`,
        {
          x: margin,
          y: currentY,
          size: 10,
          font: timesRomanFont,
        }
      );

      currentY -= lineHeight;
    }

    page.drawText(`Code étudiant: ${student.CODE_APPRENANT}`, {
      x: margin,
      y: currentY,
      size: 10,
      font: timesRomanFont,
    });

    currentY -= lineHeight;

    if (group) {
      page.drawText(
        `Groupe: ${group.NOM_GROUPE}${group.ETENDU_GROUPE ? ` - ${group.ETENDU_GROUPE}` : ""}`,
        {
          x: margin,
          y: currentY,
          size: 10,
          font: timesRomanFont,
        }
      );

      currentY -= lineHeight;
    }

    if (campus) {
      page.drawText(`Campus: ${campus.NOM_SITE}`, {
        x: margin,
        y: currentY,
        size: 10,
        font: timesRomanFont,
      });

      currentY -= lineHeight;
    }

    if (group && group.NOM_FORMATION) {
      page.drawText(`Formation: ${group.NOM_FORMATION}`, {
        x: margin,
        y: currentY,
        size: 10,
        font: timesRomanFont,
      });

      currentY -= lineHeight * 2;
    } else {
      currentY -= lineHeight;
    }

    // Draw grades table header
    const tableStartY = currentY;
    const col1X = margin;
    const col2X = margin + 250;
    const col3X = margin + 325;

    page.drawText("Matière", {
      x: col1X,
      y: currentY,
      size: 12,
      font: timesBoldFont,
    });

    page.drawText("Note", {
      x: col2X,
      y: currentY,
      size: 12,
      font: timesBoldFont,
    });

    page.drawText("ECTS", {
      x: col3X,
      y: currentY,
      size: 12,
      font: timesBoldFont,
    });

    currentY -= lineHeight;

    // Draw horizontal line
    page.drawLine({
      start: { x: margin, y: currentY + 5 },
      end: { x: page.getWidth() - margin, y: currentY + 5 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    currentY -= lineHeight / 2;

    // Draw grades
    for (const grade of studentGrades) {
      // Find corresponding ECTS credits
      const subjectECTS = studentECTS.find((ects) => ects.CODE_MATIERE === grade.CODE_MATIERE);
      const ectsValue = subjectECTS ? subjectECTS.CREDIT_ECTS : 0;

      page.drawText(grade.NOM_MATIERE, {
        x: col1X,
        y: currentY,
        size: 10,
        font: timesRomanFont,
      });

      // Conversion robuste de la moyenne en affichage
      let moyenne = "N/A";
      try {
        const moyenneRaw = grade.MOYENNE as any;
        const moyenneValue =
          typeof moyenneRaw === "string" ? parseFloat(moyenneRaw.replace(",", ".")) : moyenneRaw;

        if (moyenneValue !== null && !isNaN(moyenneValue)) {
          moyenne =
            typeof moyenneValue.toFixed === "function"
              ? moyenneValue.toFixed(2)
              : moyenneValue.toString();
        }
      } catch (error) {
        console.log(`Erreur lors du formatage de la moyenne pour ${grade.NOM_MATIERE}:`, error);
      }

      page.drawText(moyenne, {
        x: col2X,
        y: currentY,
        size: 10,
        font: timesRomanFont,
      });

      // Conversion robuste des ECTS
      let ectsText = "0";
      try {
        ectsText = ectsValue !== null && ectsValue !== undefined ? ectsValue.toString() : "0";
      } catch (error) {
        console.log(`Erreur lors du formatage des ECTS pour ${grade.NOM_MATIERE}:`, error);
      }

      page.drawText(ectsText, {
        x: col3X,
        y: currentY,
        size: 10,
        font: timesRomanFont,
      });

      currentY -= lineHeight;

      // Add a new page if needed
      if (currentY < margin) {
        page.drawLine({
          start: { x: margin, y: tableStartY + 5 },
          end: { x: margin, y: currentY + lineHeight },
          thickness: 1,
          color: rgb(0, 0, 0),
        });

        page.drawLine({
          start: { x: page.getWidth() - margin, y: tableStartY + 5 },
          end: { x: page.getWidth() - margin, y: currentY + lineHeight },
          thickness: 1,
          color: rgb(0, 0, 0),
        });

        page = pdfDoc.addPage([595.28, 841.89]);
        currentY = page.getHeight() - margin;
      }
    }

    // Pour la moyenne générale
    // Draw average
    let moyenneGeneraleText = "Moyenne générale: N/A";
    if (studentAverage) {
      try {
        // Cast explicite pour éviter l'erreur 'never'
        const moyenneGeneraleRaw = studentAverage.MOYENNE_GENERALE as any;
        const moyenneGenerale =
          typeof moyenneGeneraleRaw === "string"
            ? parseFloat(moyenneGeneraleRaw.replace(",", "."))
            : moyenneGeneraleRaw;

        if (moyenneGenerale !== null && !isNaN(moyenneGenerale)) {
          const formattedMoyenne =
            typeof moyenneGenerale.toFixed === "function"
              ? moyenneGenerale.toFixed(2)
              : moyenneGenerale.toString();
          moyenneGeneraleText = `Moyenne générale: ${formattedMoyenne}/20`;
        }
      } catch (error) {
        console.log("Erreur lors du formatage de la moyenne générale:", error);
      }
    }

    page.drawText(moyenneGeneraleText, {
      x: margin,
      y: currentY,
      size: 12,
      font: timesBoldFont,
    });

    currentY -= lineHeight * 2;

    // Draw observation
    // Draw observation
    if (studentObservation) {
      page.drawText("Observations:", {
        x: margin,
        y: currentY,
        size: 12,
        font: timesBoldFont,
      });

      currentY -= lineHeight;

      // Nettoyer et normaliser le texte d'observation
      let observationText = "";
      try {
        // Nettoyer le texte pour supprimer les caractères problématiques
        observationText = studentObservation.MEMO_OBSERVATION || "";

        // Supprimer les retours à la ligne (carriage return - 0x000d) qui causent des problèmes
        observationText = observationText.replace(/\r/g, " ");

        // Supprimer d'autres caractères potentiellement problématiques
        observationText = observationText.replace(/[^\x20-\x7E\xA0-\xFF]/g, " ");
      } catch (error) {
        console.log("Erreur lors du nettoyage du texte d'observation:", error);
        observationText = "Observations non disponibles en raison d'un problème d'encodage.";
      }

      // Split observation text into lines to fit within the page
      const maxWidth = page.getWidth() - 2 * margin;

      try {
        // Découpage sécurisé du texte en lignes
        const words = observationText.split(" ");
        let line = "";

        for (const word of words) {
          try {
            const testLine = line + (line ? " " : "") + word;
            let textWidth = 0;

            try {
              textWidth = timesRomanFont.widthOfTextAtSize(testLine, 10);
            } catch (e) {
              // Notez le underscore avant le e
              // Si un caractère pose problème, on saute ce mot
              console.log(`Problème de mesure de largeur avec le mot: ${word}`, e);
              continue;
            }

            if (textWidth > maxWidth) {
              // Dessiner la ligne actuelle si elle existe
              if (line) {
                page.drawText(line, {
                  x: margin,
                  y: currentY,
                  size: 10,
                  font: timesRomanFont,
                });
              }

              line = word;
              currentY -= lineHeight;

              // Add a new page if needed
              if (currentY < margin) {
                page = pdfDoc.addPage([595.28, 841.89]);
                currentY = page.getHeight() - margin;
              }
            } else {
              line = testLine;
            }
          } catch (error) {
            console.log(`Erreur lors du traitement du mot "${word}":`, error);
            // Continuer avec le mot suivant
            continue;
          }
        }

        // Draw the last line
        if (line) {
          try {
            page.drawText(line, {
              x: margin,
              y: currentY,
              size: 10,
              font: timesRomanFont,
            });
          } catch (error) {
            console.log("Erreur lors du dessin de la dernière ligne:", error);
          }
        }
      } catch (error) {
        console.log("Erreur générale lors du traitement du texte d'observation:", error);

        // Fallback - afficher un message simple en cas d'erreur
        try {
          page.drawText("Observations non disponibles (problème d'encodage).", {
            x: margin,
            y: currentY,
            size: 10,
            font: timesRomanFont,
          });
        } catch (_e) {
          // Notez le underscore avant le e
          // Si même cela échoue, on abandonne l'affichage des observations
          console.log("Impossible d'afficher même le message d'erreur:", _e);
        }
      }
    }

    // Serialize the PDF document
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  } catch (error) {
    console.error("Erreur lors de la création du PDF:", error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    console.log("Génération de PDF - Corps de la requête reçue:", body);

    if (body.data) {
      console.log("Structure des données:");
      console.log("APPRENANT:", body.data.APPRENANT?.length || 0);
      console.log("MOYENNES_UE:", body.data.MOYENNES_UE?.length || 0);
      console.log("MOYENNE_GENERALE:", body.data.MOYENNE_GENERALE?.length || 0);
      console.log("OBSERVATIONS:", body.data.OBSERVATIONS?.length || 0);
      console.log("ECTS_PAR_MATIERE:", body.data.ECTS_PAR_MATIERE?.length || 0);
      console.log("GROUPE:", body.data.GROUPE?.length || 0);
      console.log("SITE:", body.data.SITE?.length || 0);
    } else {
      console.log("Aucune donnée reçue!");
    }

    // Extract data from the request
    if (!body.data) {
      return NextResponse.json(
        {
          success: false,
          error: "Aucune donnée fournie",
        },
        { status: 400 }
      );
    }

    const data = body.data;
    const period = body.periodeEvaluation || "Période non spécifiée";
    const groupName = body.groupName || "Groupe non spécifié";

    // Check if we have student data
    // Examiner la structure des données
    if (data.APPRENANT && data.APPRENANT.length > 0) {
      console.log("Structure détaillée du premier étudiant:");
      console.log(JSON.stringify(data.APPRENANT[0], null, 2));
    }

    if (data.MOYENNES_UE && data.MOYENNES_UE.length > 0) {
      console.log("Structure détaillée de la première moyenne UE:");
      console.log(JSON.stringify(data.MOYENNES_UE[0], null, 2));
      console.log("Type de MOYENNE:", typeof data.MOYENNES_UE[0].MOYENNE);
      console.log("Valeur de MOYENNE:", data.MOYENNES_UE[0].MOYENNE);
    }

    if (data.MOYENNE_GENERALE && data.MOYENNE_GENERALE.length > 0) {
      console.log("Structure détaillée de la première moyenne générale:");
      console.log(JSON.stringify(data.MOYENNE_GENERALE[0], null, 2));
      console.log("Type de MOYENNE_GENERALE:", typeof data.MOYENNE_GENERALE[0].MOYENNE_GENERALE);
      console.log("Valeur de MOYENNE_GENERALE:", data.MOYENNE_GENERALE[0].MOYENNE_GENERALE);
    }

    // Initialize ZIP archive in memory
    const zip = new JSZip();

    // Track failures
    let successCount = 0;
    let failureCount = 0;

    // Générer PDFs pour chaque étudiant
    for (const studentObj of data.APPRENANT) {
      try {
        // Extraire les données nécessaires de l'objet étudiant
        const student = {
          CODE_APPRENANT: studentObj.CODE_APPRENANT || "",
          NOM_APPRENANT: studentObj.NOM_APPRENANT || "",
          PRENOM_APPRENANT: studentObj.PRENOM_APPRENANT || "",
          DATE_NAISSANCE: studentObj.DATE_NAISSANCE || null,
        };

        console.log(`Création du PDF pour ${student.NOM_APPRENANT} ${student.PRENOM_APPRENANT}`);

        const pdfBytes = await createStudentPDF(
          student,
          data.MOYENNES_UE || [],
          data.MOYENNE_GENERALE || [],
          data.OBSERVATIONS || [],
          data.ECTS_PAR_MATIERE || [],
          data.GROUPE || [],
          data.SITE || [],
          period
        );

        const filename = `${student.NOM_APPRENANT}_${student.PRENOM_APPRENANT}_${student.CODE_APPRENANT}.pdf`;

        // Add PDF to the zip file (in memory)
        zip.file(filename, pdfBytes);
        console.log(`Fichier ${filename} ajouté au ZIP`);

        successCount++;
        console.log(`📄 PDF généré pour ${student.NOM_APPRENANT} ${student.PRENOM_APPRENANT}`);
      } catch (error) {
        failureCount++;
        console.error(`❌ Erreur lors de la génération du PDF pour l'étudiant:`, error);
      }
    }

    if (successCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Aucun PDF n'a pu être généré",
          details: `${failureCount} bulletins ont échoué`,
        },
        { status: 500 }
      );
    }

    // Generate ZIP in memory
    console.log(`Génération du ZIP pour ${successCount} PDFs`);
    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });
    console.log("ZIP généré avec succès");

    // Créer un ID unique pour le fichier
    const sanitizedGroupName = groupName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
    const timestamp = Date.now();
    const zipId = `bulletins_${sanitizedGroupName}_${timestamp}.zip`;

    console.log(`ID du fichier ZIP généré: ${zipId}`);

    // Stocker le contenu dans notre système de stockage sur disque
    fileStorage.storeFile(zipId, Buffer.from(zipBuffer), "application/zip");
    console.log(`Fichier temporaire stocké: ${zipId}, taille: ${zipBuffer.byteLength} octets`);

    // Vérifier que le fichier est bien dans le store
    if (fileStorage.hasFile(zipId)) {
      console.log(`✅ Confirmation: le fichier ${zipId} existe dans le fileStorage`);
    } else {
      console.log(`❌ Erreur: le fichier ${zipId} n'existe PAS dans le fileStorage`);
      return NextResponse.json(
        {
          success: false,
          error: "Erreur lors du stockage du fichier ZIP",
        },
        { status: 500 }
      );
    }

    // Afficher tous les fichiers disponibles
    console.log(`Fichiers disponibles dans le store: ${fileStorage.getAllFileIds().join(", ")}`);

    // Renvoyer un JSON avec le chemin vers l'API de téléchargement
    return NextResponse.json({
      success: true,
      path: `/api/download?id=${zipId}`,
      studentCount: successCount,
    });
  } catch (error: any) {
    console.error("❌ Erreur générale lors de la génération des PDFs:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de la génération des PDFs",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { fileStorage } from "@/lib/fileStorage"; // Utiliser fileStorage au lieu de tempFileStorage
import fs from "fs";
import JSZip from "jszip";
import { NextResponse } from "next/server";
import path from "path";
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
    let page = pdfDoc.addPage([595.28, 841.89]); // Format A4

    // Load fonts
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Set up margins
    const margin = 50;
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    let currentY = pageHeight - margin;

    // ESPI Logo and header section
    // Logo ESPI (text en lieu de logo)
    try {
      const logoPath = path.join(process.cwd(), "public", "logo", "espi.jpg");
      const logoBytes = fs.readFileSync(logoPath);
      const logoImage = await pdfDoc.embedJpg(logoBytes);

      // Obtenir les dimensions de l'image
      const logoDims = logoImage.scale(0.5); // Ajustez l'échelle selon vos besoins

      // Dessiner le logo ESPI
      page.drawImage(logoImage, {
        x: margin,
        y: currentY - logoDims.height,
        width: logoDims.width,
        height: logoDims.height,
      });

      // Ajuster currentY pour compenser la hauteur du logo
      currentY -= logoDims.height;
    } catch (error) {
      console.error("Erreur lors du chargement du logo ESPI:", error);
      // Fallback au texte si l'image ne peut pas être chargée
      page.drawText("ESPI", {
        x: margin,
        y: currentY,
        size: 24,
        font: helveticaBoldFont,
        color: rgb(0.2, 0.6, 0.6),
      });
    }

    // Identifiant de l'étudiant
    currentY -= 30;
    page.drawText(`Identifiant : ${student.CODE_APPRENANT}`, {
      x: pageWidth - margin - 150,
      y: currentY,
      size: 10,
      font: helveticaFont,
    });

    // Titre du bulletin
    currentY -= 20;
    page.drawText("Bulletin de notes 2024-2025", {
      x: pageWidth / 2 - 90,
      y: currentY,
      size: 14,
      font: helveticaBoldFont,
    });

    // Semestre
    currentY -= 20;
    page.drawText(`${period}`, {
      x: pageWidth / 2 - 60,
      y: currentY,
      size: 12,
      font: helveticaFont,
    });

    currentY -= 30;

    // Cadre d'informations étudiant et groupe
    const boxWidth = pageWidth - 2 * margin;
    const boxHeight = 40;

    // Dessiner le rectangle
    page.drawRectangle({
      x: margin,
      y: currentY - boxHeight,
      width: boxWidth,
      height: boxHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    // Ligne verticale au milieu
    page.drawLine({
      start: { x: margin + boxWidth / 2, y: currentY },
      end: { x: margin + boxWidth / 2, y: currentY - boxHeight },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Informations étudiant côté gauche
    page.drawText(`Apprenant: ${student.NOM_APPRENANT} ${student.PRENOM_APPRENANT}`, {
      x: margin + 5,
      y: currentY - 15,
      size: 10,
      font: helveticaFont,
    });

    if (student.DATE_NAISSANCE) {
      page.drawText(
        `Date de naissance: ${new Date(student.DATE_NAISSANCE).toLocaleDateString("fr-FR")}`,
        {
          x: margin + 5,
          y: currentY - 30,
          size: 10,
          font: helveticaFont,
        }
      );
    }

    // Groupe et campus côté droit
    const group = groupInfo.length > 0 ? groupInfo[0] : null;
    const campus = campusInfo.length > 0 ? campusInfo[0] : null;

    page.drawText(`Groupe: ${group ? group.NOM_GROUPE : "Non spécifié"}`, {
      x: margin + boxWidth / 2 + 5,
      y: currentY - 15,
      size: 10,
      font: helveticaFont,
    });

    page.drawText(`Campus: ${campus ? campus.NOM_SITE : "Non spécifié"}`, {
      x: margin + boxWidth / 2 + 5,
      y: currentY - 30,
      size: 10,
      font: helveticaFont,
    });

    currentY -= boxHeight + 20;

    // Tableau des notes
    // En-têtes
    const tableWidth = boxWidth;
    const col1Width = tableWidth * 0.4; // 40% pour les matières
    const col2Width = tableWidth * 0.2; // 20% pour la moyenne
    const col3Width = tableWidth * 0.2; // 20% pour les ECTS

    const col1X = margin;
    const col2X = col1X + col1Width;
    const col3X = col2X + col2Width;
    const col4X = col3X + col3Width;
    const rowHeight = 20;

    // Dessiner l'en-tête du tableau
    page.drawRectangle({
      x: col1X,
      y: currentY - rowHeight,
      width: tableWidth,
      height: rowHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
      color: rgb(0.05, 0.4, 0.6), // Bleu pour l'en-tête
    });

    // Colonnes de l'en-tête
    page.drawLine({
      start: { x: col2X, y: currentY },
      end: { x: col2X, y: currentY - rowHeight },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    page.drawLine({
      start: { x: col3X, y: currentY },
      end: { x: col3X, y: currentY - rowHeight },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    page.drawLine({
      start: { x: col4X, y: currentY },
      end: { x: col4X, y: currentY - rowHeight },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Texte de l'en-tête
    page.drawText("Enseignements", {
      x: col1X + 5,
      y: currentY - 15,
      size: 10,
      font: helveticaBoldFont,
      color: rgb(1, 1, 1), // Texte blanc
    });

    page.drawText("Moyenne", {
      x: col2X + 5,
      y: currentY - 15,
      size: 10,
      font: helveticaBoldFont,
      color: rgb(1, 1, 1),
    });

    page.drawText("Total ECTS", {
      x: col3X + 5,
      y: currentY - 15,
      size: 10,
      font: helveticaBoldFont,
      color: rgb(1, 1, 1),
    });

    page.drawText("État", {
      x: col4X + 5,
      y: currentY - 15,
      size: 10,
      font: helveticaBoldFont,
      color: rgb(1, 1, 1),
    });

    currentY -= rowHeight;

    // Lignes pour chaque matière
    for (const grade of grades.filter((g) => g.CODE_APPRENANT === student.CODE_APPRENANT)) {
      // Find corresponding ECTS credits
      const subjectECTS = subjects.find(
        (ects) =>
          ects.CODE_APPRENANT === student.CODE_APPRENANT && ects.CODE_MATIERE === grade.CODE_MATIERE
      );
      const ectsValue = subjectECTS ? subjectECTS.CREDIT_ECTS : 0;

      // Dessiner le rectangle de la ligne
      page.drawRectangle({
        x: col1X,
        y: currentY - rowHeight,
        width: tableWidth,
        height: rowHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });

      // Lignes verticales
      page.drawLine({
        start: { x: col2X, y: currentY },
        end: { x: col2X, y: currentY - rowHeight },
        thickness: 1,
        color: rgb(0, 0, 0),
      });

      page.drawLine({
        start: { x: col3X, y: currentY },
        end: { x: col3X, y: currentY - rowHeight },
        thickness: 1,
        color: rgb(0, 0, 0),
      });

      page.drawLine({
        start: { x: col4X, y: currentY },
        end: { x: col4X, y: currentY - rowHeight },
        thickness: 1,
        color: rgb(0, 0, 0),
      });

      // Nom de la matière
      page.drawText(grade.NOM_MATIERE, {
        x: col1X + 5,
        y: currentY - 15,
        size: 9,
        font: helveticaFont,
      });

      // Moyenne
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
        x: col2X + 5,
        y: currentY - 15,
        size: 9,
        font: helveticaFont,
      });

      // ECTS
      let ectsText = "0";
      try {
        ectsText = ectsValue !== null && ectsValue !== undefined ? ectsValue.toString() : "0";
      } catch (error) {
        console.log(`Erreur lors du formatage des ECTS pour ${grade.NOM_MATIERE}:`, error);
      }

      page.drawText(ectsText, {
        x: col3X + 5,
        y: currentY - 15,
        size: 9,
        font: helveticaFont,
      });

      // État (validé ou non)
      const etat = parseFloat(moyenne.replace(",", ".")) >= 10 ? "VA" : "NV";
      page.drawText(etat, {
        x: col4X + 5,
        y: currentY - 15,
        size: 9,
        font: helveticaFont,
      });

      currentY -= rowHeight;

      // Vérifier si une nouvelle page est nécessaire
      if (currentY < margin + 100) {
        // Ajouter une nouvelle page - CORRIGÉ
        page = pdfDoc.addPage([595.28, 841.89]);
        currentY = pageHeight - margin;
      }
    }

    // Ligne pour la moyenne générale
    page.drawRectangle({
      x: col1X,
      y: currentY - rowHeight,
      width: tableWidth,
      height: rowHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
      color: rgb(0.05, 0.4, 0.6), // Même couleur que l'en-tête
    });

    // Lignes verticales
    page.drawLine({
      start: { x: col2X, y: currentY },
      end: { x: col2X, y: currentY - rowHeight },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    page.drawLine({
      start: { x: col3X, y: currentY },
      end: { x: col3X, y: currentY - rowHeight },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    page.drawLine({
      start: { x: col4X, y: currentY },
      end: { x: col4X, y: currentY - rowHeight },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Texte "Moyenne générale"
    page.drawText("Moyenne générale", {
      x: col1X + 5,
      y: currentY - 15,
      size: 10,
      font: helveticaBoldFont,
      color: rgb(1, 1, 1),
    });

    // Valeur de la moyenne générale
    const studentAverage = averages.find((avg) => avg.CODE_APPRENANT === student.CODE_APPRENANT);
    let moyenneGenerale = "N/A";

    if (studentAverage) {
      try {
        const moyenneGeneraleRaw = studentAverage.MOYENNE_GENERALE as any;
        const moyenneGeneraleValue =
          typeof moyenneGeneraleRaw === "string"
            ? parseFloat(moyenneGeneraleRaw.replace(",", "."))
            : moyenneGeneraleRaw;

        if (moyenneGeneraleValue !== null && !isNaN(moyenneGeneraleValue)) {
          moyenneGenerale =
            typeof moyenneGeneraleValue.toFixed === "function"
              ? moyenneGeneraleValue.toFixed(2)
              : moyenneGeneraleValue.toString();
        }
      } catch (error) {
        console.log("Erreur lors du formatage de la moyenne générale:", error);
      }
    }

    page.drawText(moyenneGenerale, {
      x: col2X + 5,
      y: currentY - 15,
      size: 10,
      font: helveticaBoldFont,
      color: rgb(1, 1, 1),
    });

    // Total ECTS validés
    const totalECTS = subjects
      .filter((ects) => ects.CODE_APPRENANT === student.CODE_APPRENANT)
      .reduce((acc, curr) => acc + (curr.CREDIT_ECTS || 0), 0);

    page.drawText(totalECTS.toString(), {
      x: col3X + 5,
      y: currentY - 15,
      size: 10,
      font: helveticaBoldFont,
      color: rgb(1, 1, 1),
    });

    // État général (validé ou non)
    const etatGeneral =
      parseFloat(moyenneGenerale.replace(",", ".")) >= 10 ? "Validé" : "Non validé";
    page.drawText(etatGeneral, {
      x: col4X + 5,
      y: currentY - 15,
      size: 10,
      font: helveticaBoldFont,
      color: rgb(1, 1, 1),
    });

    currentY -= rowHeight + 20;

    // Section absences et observations
    const obsBoxHeight = 60;
    const obsColWidth = boxWidth / 3;

    // Rectangle pour les absences
    page.drawRectangle({
      x: col1X,
      y: currentY - obsBoxHeight,
      width: obsColWidth,
      height: obsBoxHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    // En-tête absences
    page.drawRectangle({
      x: col1X,
      y: currentY,
      width: obsColWidth,
      height: rowHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    page.drawText("Absences justifiées", {
      x: col1X + 5,
      y: currentY - 15,
      size: 9,
      font: helveticaFont,
    });

    // Rectangle pour les absences injustifiées
    page.drawRectangle({
      x: col1X + obsColWidth,
      y: currentY - obsBoxHeight,
      width: obsColWidth,
      height: obsBoxHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    // En-tête absences injustifiées
    page.drawRectangle({
      x: col1X + obsColWidth,
      y: currentY,
      width: obsColWidth,
      height: rowHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    page.drawText("Absences injustifiées", {
      x: col1X + obsColWidth + 5,
      y: currentY - 15,
      size: 9,
      font: helveticaFont,
    });

    // Rectangle pour les retards
    page.drawRectangle({
      x: col1X + 2 * obsColWidth,
      y: currentY - obsBoxHeight,
      width: obsColWidth,
      height: obsBoxHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    // En-tête retards
    page.drawRectangle({
      x: col1X + 2 * obsColWidth,
      y: currentY,
      width: obsColWidth,
      height: rowHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    page.drawText("Retards", {
      x: col1X + 2 * obsColWidth + 5,
      y: currentY - 15,
      size: 9,
      font: helveticaFont,
    });

    // Placer des valeurs fictives pour les absences et retards
    page.drawText("0", {
      x: col1X + obsColWidth / 2 - 5,
      y: currentY - 40,
      size: 12,
      font: helveticaBoldFont,
    });

    page.drawText("0", {
      x: col1X + obsColWidth + obsColWidth / 2 - 5,
      y: currentY - 40,
      size: 12,
      font: helveticaBoldFont,
    });

    page.drawText("0", {
      x: col1X + 2 * obsColWidth + obsColWidth / 2 - 5,
      y: currentY - 40,
      size: 12,
      font: helveticaBoldFont,
    });

    currentY -= obsBoxHeight + 20;

    // Observations
    const studentObservation = observations.find(
      (obs) => obs.CODE_APPRENANT === student.CODE_APPRENANT
    );

    if (studentObservation) {
      page.drawText("OBSERVATIONS:", {
        x: col1X,
        y: currentY,
        size: 10,
        font: helveticaBoldFont,
      });

      currentY -= 15;

      // Nettoyer et normaliser le texte d'observation
      let observationText = "";
      try {
        observationText = studentObservation.MEMO_OBSERVATION || "";
        observationText = observationText.replace(/\r/g, " ");
        observationText = observationText.replace(/[^\x20-\x7E\xA0-\xFF]/g, " ");
      } catch (error) {
        console.log("Erreur lors du nettoyage du texte d'observation:", error);
        observationText = "Observations non disponibles en raison d'un problème d'encodage.";
      }

      // Découper le texte en lignes
      const maxWidth = pageWidth - 2 * margin;
      const words = observationText.split(" ");
      let line = "";

      for (const word of words) {
        try {
          const testLine = line + (line ? " " : "") + word;
          const textWidth = helveticaFont.widthOfTextAtSize(testLine, 9);

          if (textWidth > maxWidth) {
            page.drawText(line, {
              x: col1X,
              y: currentY,
              size: 9,
              font: helveticaFont,
            });

            line = word;
            currentY -= 12;

            if (currentY < margin) {
              // Ajouter une nouvelle page - CORRIGÉ
              page = pdfDoc.addPage([595.28, 841.89]);
              currentY = pageHeight - margin;
            }
          } else {
            line = testLine;
          }
        } catch (error) {
          console.log(`Erreur lors du traitement du mot "${word}":`, error);
          continue;
        }
      }

      // Dessiner la dernière ligne
      if (line) {
        page.drawText(line, {
          x: col1X,
          y: currentY,
          size: 9,
          font: helveticaFont,
        });
      }
    }

    // Pied de page avec signature
    const signatureY = 100;

    // Texte du lieu et de la date
    page.drawText(
      `Fait à ${campus ? campus.NOM_SITE : "Paris"}, le ${new Date().toLocaleDateString("fr-FR")}`,
      {
        x: pageWidth - margin - 200,
        y: signatureY,
        size: 10,
        font: helveticaFont,
      }
    );

    // Signature
    page.drawText("Signature du responsable pédagogique", {
      x: pageWidth - margin - 200,
      y: signatureY - 20,
      size: 10,
      font: helveticaFont,
    });

    // Information sur la validité
    const validiteY = 50;
    page.drawText("VA : Validé / NV : Non Validé / C: Compensation / S: Rattrapage", {
      x: margin,
      y: validiteY,
      size: 8,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5),
    });

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

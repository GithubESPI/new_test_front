/* eslint-disable @typescript-eslint/no-explicit-any */
import { fileStorage } from "@/lib/fileStorage"; // Utiliser fileStorage au lieu de tempFileStorage
import fontkit from "@pdf-lib/fontkit";
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

interface Absence {
  CODE_APPRENANT: string;
  NOM_APPRENANT: string;
  PRENOM_APPRENANT: string;
  MINUTE_DEB: string;
  MINUTE_FIN: string;
  IS_JUSTIFIE: string;
  IS_RETARD: string;
}

interface ProcessedAbsence {
  CODE_APPRENANT: string;
  NOM_APPRENANT: string;
  PRENOM_APPRENANT: string;
  ABSENCES_JUSTIFIEES: string;
  ABSENCES_INJUSTIFIEES: string;
  RETARDS: string;
}

function processAbsences(absences: Absence[]): ProcessedAbsence[] {
  const groupedAbsences: Record<string, ProcessedAbsence> = {};

  absences.forEach((absence) => {
    const {
      CODE_APPRENANT,
      NOM_APPRENANT,
      PRENOM_APPRENANT,
      MINUTE_DEB,
      MINUTE_FIN,
      IS_JUSTIFIE,
      IS_RETARD,
    } = absence;

    // Convertir les minutes (strings) en nombres
    const minutesDeb = parseInt(MINUTE_DEB, 10) || 0;
    const minutesFin = parseInt(MINUTE_FIN, 10) || 0;
    const totalMinutes = minutesFin - minutesDeb; // Calcul correct du total

    if (!groupedAbsences[CODE_APPRENANT]) {
      groupedAbsences[CODE_APPRENANT] = {
        CODE_APPRENANT,
        NOM_APPRENANT,
        PRENOM_APPRENANT,
        ABSENCES_JUSTIFIEES: "00h00",
        ABSENCES_INJUSTIFIEES: "00h00",
        RETARDS: "00h00",
      };
    }

    if (totalMinutes > 0) {
      if (IS_JUSTIFIE === "0" && IS_RETARD === "0") {
        // Absences injustifiées
        const previousMinutes = parseTimeToMinutes(
          groupedAbsences[CODE_APPRENANT].ABSENCES_INJUSTIFIEES
        );
        groupedAbsences[CODE_APPRENANT].ABSENCES_INJUSTIFIEES = formatTime(
          previousMinutes + totalMinutes
        );
      } else if (IS_JUSTIFIE === "1" && IS_RETARD === "0") {
        // Absences justifiées
        const previousMinutes = parseTimeToMinutes(
          groupedAbsences[CODE_APPRENANT].ABSENCES_JUSTIFIEES
        );
        groupedAbsences[CODE_APPRENANT].ABSENCES_JUSTIFIEES = formatTime(
          previousMinutes + totalMinutes
        );
      } else if (
        (IS_JUSTIFIE === "0" && IS_RETARD === "1") ||
        (IS_JUSTIFIE === "1" && IS_RETARD === "1")
      ) {
        // Retards
        const previousMinutes = parseTimeToMinutes(groupedAbsences[CODE_APPRENANT].RETARDS);
        groupedAbsences[CODE_APPRENANT].RETARDS = formatTime(previousMinutes + totalMinutes);
      }
    }
  });

  return Object.values(groupedAbsences);
}

// Fonction pour convertir un texte "hhmm" en minutes
function parseTimeToMinutes(time: string): number {
  const match = time.match(/(\d{2})h(\d{2})/);
  if (!match) return 0;
  const hours = parseInt(match[1], 10) || 0;
  const minutes = parseInt(match[2], 10) || 0;
  return hours * 60 + minutes;
}

// Fonction pour formater en hh:mm
function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}h${mins.toString().padStart(2, "0")}`;
}

function updateUECredits(subjects: any[]): any[] {
  // 1. Éliminer les doublons
  const uniqueSubjectsMap = new Map<string, any>();

  subjects.forEach((subject) => {
    const key = `${subject.CODE_APPRENANT}_${subject.CODE_MATIERE}`;
    // Conversion des crédits ECTS en nombre pour assurer des calculs corrects
    if (subject.CREDIT_ECTS !== undefined) {
      subject.CREDIT_ECTS = Number(subject.CREDIT_ECTS) || 0;
    }

    // Si la clé n'existe pas encore ou si cette entrée a plus d'informations
    if (!uniqueSubjectsMap.has(key)) {
      uniqueSubjectsMap.set(key, { ...subject });
    }
  });

  // 2. Regrouper par étudiant pour traitement individuel
  const studentSubjects = new Map<string, any[]>();

  [...uniqueSubjectsMap.values()].forEach((subject) => {
    const studentId = subject.CODE_APPRENANT;
    if (!studentSubjects.has(studentId)) {
      studentSubjects.set(studentId, []);
    }
    studentSubjects.get(studentId)?.push({ ...subject });
  });

  // 3. Traiter chaque étudiant selon les règles d'agrégation spécifiées
  const result: any[] = [];

  studentSubjects.forEach((studentSubjectList, studentId) => {
    console.log(`\n🔍 Traitement des matières pour l'étudiant ${studentId}`);

    // Trier les matières par NUM_ORDRE
    const sortedSubjects = studentSubjectList.sort((a, b) => {
      const orderA = parseInt(a.NUM_ORDRE || "0", 10);
      const orderB = parseInt(b.NUM_ORDRE || "0", 10);
      return orderA - orderB;
    });

    // Vérifier que la première matière est bien une UE
    if (sortedSubjects.length > 0 && sortedSubjects[0].CODE_TYPE_MATIERE !== "2") {
      console.log(
        `⚠️ Attention: La première matière n'est pas une UE pour l'étudiant ${studentId}`
      );
    }

    // Variables pour suivre l'UE courante et accumuler les crédits
    let currentUE: any = null;
    let accumulatedCredits = 0;
    const processedSubjects: any[] = [];

    // Parcourir les matières triées
    for (let i = 0; i < sortedSubjects.length; i++) {
      const subject = sortedSubjects[i];

      if (subject.CODE_TYPE_MATIERE === "2") {
        // Si on trouve une UE

        // Si on avait déjà une UE en cours, on lui affecte les crédits accumulés
        if (currentUE) {
          currentUE.CREDIT_ECTS = accumulatedCredits;
          processedSubjects.push(currentUE);
          console.log(`✅ UE "${currentUE.NOM_MATIERE}": ${accumulatedCredits} ECTS`);
        }

        // Commencer une nouvelle UE
        currentUE = { ...subject };
        accumulatedCredits = 0;
        console.log(`🆕 Nouvelle UE: "${subject.NOM_MATIERE}"`);
      } else if (subject.CODE_TYPE_MATIERE === "3") {
        // Si c'est une matière classique, on accumule ses crédits
        // et on l'ajoute aux résultats
        processedSubjects.push(subject);

        if (currentUE) {
          const credits = Number(subject.CREDIT_ECTS) || 0;
          accumulatedCredits += credits;
          console.log(
            `➕ Ajout de ${credits} ECTS de "${subject.NOM_MATIERE}" à l'UE "${currentUE.NOM_MATIERE}"`
          );
        } else {
          console.log(`⚠️ Matière "${subject.NOM_MATIERE}" sans UE parente`);
        }
      } else {
        // Autres types de matières, on les ajoute simplement
        processedSubjects.push(subject);
      }
    }

    // Ne pas oublier la dernière UE
    if (currentUE) {
      currentUE.CREDIT_ECTS = accumulatedCredits;
      processedSubjects.push(currentUE);
      console.log(`✅ Dernière UE "${currentUE.NOM_MATIERE}": ${accumulatedCredits} ECTS`);
    }

    // Ajouter toutes les matières traitées de cet étudiant au résultat final
    result.push(...processedSubjects);
  });

  return result;
}

/**
 * Fonction pour journaliser les relations entre UE et leurs matières
 * Utile pour le débogage
 */
function logUEWithSubjects(subjects: any[]) {
  // Éliminer les doublons d'abord
  const uniqueSubjects = new Map<string, any>();

  subjects.forEach((subject) => {
    const key = `${subject.CODE_APPRENANT}_${subject.CODE_MATIERE}`;
    if (!uniqueSubjects.has(key)) {
      uniqueSubjects.set(key, subject);
    }
  });

  let currentUE: any = null;
  let ueSubjects: any[] = [];
  let currentStudent: string = "";

  console.log("📌 Début du log des matières et des UE associées.");

  // Trier par étudiant, puis par ordre
  const sortedSubjects = [...uniqueSubjects.values()].sort((a, b) => {
    if (a.CODE_APPRENANT !== b.CODE_APPRENANT) {
      return a.CODE_APPRENANT.localeCompare(b.CODE_APPRENANT);
    }
    return parseInt(a.NUM_ORDRE, 10) - parseInt(b.NUM_ORDRE, 10);
  });

  for (const subject of sortedSubjects) {
    // Si on change d'étudiant, réinitialiser
    if (subject.CODE_APPRENANT !== currentStudent) {
      // Afficher les dernières UE de l'étudiant précédent
      if (currentUE) {
        console.log(`✅ UE Trouvée : ${currentUE.NOM_MATIERE} pour ${currentStudent}`);
        console.log(
          `📌 Matières associées :`,
          ueSubjects.map((s) => s.NOM_MATIERE)
        );
      }

      currentStudent = subject.CODE_APPRENANT;
      currentUE = null;
      ueSubjects = [];
      console.log(`\n👤 Nouvel étudiant: ${subject.NOM_APPRENANT} ${subject.PRENOM_APPRENANT}`);
    }

    if (subject.CODE_TYPE_MATIERE === "2") {
      // Nouvelle UE trouvée, afficher les logs pour l'UE précédente
      if (currentUE) {
        console.log(`✅ UE Trouvée : ${currentUE.NOM_MATIERE}`);
        console.log(
          `📌 Matières associées :`,
          ueSubjects.map((s) => s.NOM_MATIERE)
        );
      }
      // Mettre à jour l'UE courante et réinitialiser les matières associées
      currentUE = subject;
      ueSubjects = [];
    } else if (currentUE && subject.CODE_TYPE_MATIERE === "3") {
      // Associer la matière courante à l'UE actuelle
      ueSubjects.push(subject);
    }
  }

  // Afficher les logs de la dernière UE trouvée
  if (currentUE) {
    console.log(`✅ UE Trouvée : ${currentUE.NOM_MATIERE} pour ${currentStudent}`);
    console.log(
      `📌 Matières associées :`,
      ueSubjects.map((s) => s.NOM_MATIERE)
    );
  }

  console.log("📌 Fin du log des matières et des UE associées.");
}

// Function to create a PDF for a student
// Function to create a PDF for a student
async function createStudentPDF(
  student: StudentData,
  grades: StudentGrade[],
  averages: StudentAverage[],
  observations: Observation[],
  subjects: SubjectECTS[], // Single subjects parameter
  groupInfo: GroupInfo[],
  campusInfo: CampusInfo[],
  period: string,
  absence: Absence[],
  processedABS: ProcessedAbsence[]
): Promise<Uint8Array> {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595.28, 841.89]); // Format A4

    // Charger les polices Poppins (s'ils sont disponibles)
    let poppinsRegular;
    let poppinsBold;

    try {
      // Chemins vers les fichiers de police (ajustez selon l'emplacement de vos fichiers)
      const poppinsRegularPath = path.join(process.cwd(), "public", "fonts", "Poppins-Regular.ttf");
      const poppinsBoldPath = path.join(process.cwd(), "public", "fonts", "Poppins-Bold.ttf");

      // Lire les fichiers de police
      const poppinsRegularBytes = fs.readFileSync(poppinsRegularPath);
      const poppinsBoldBytes = fs.readFileSync(poppinsBoldPath);

      pdfDoc.registerFontkit(fontkit);

      // Incorporer les polices dans le document PDF
      poppinsRegular = await pdfDoc.embedFont(poppinsRegularBytes);
      poppinsBold = await pdfDoc.embedFont(poppinsBoldBytes);

      console.log("✅ Polices Poppins chargées avec succès");
    } catch (error) {
      console.error("❌ Erreur lors du chargement des polices Poppins:", error);
      console.log("Utilisation des polices standard comme fallback");
    }

    // Définir les polices à utiliser (avec fallback sur des polices standard si Poppins n'est pas disponible)
    const mainFont = poppinsRegular || (await pdfDoc.embedFont(StandardFonts.Helvetica));
    const boldFont = poppinsBold || (await pdfDoc.embedFont(StandardFonts.HelveticaBold));

    // Définir une taille de police plus petite par défaut
    const fontSize = 9;
    const fontSizeBold = 9;
    const fontSizeTitle = 11;
    // const fontSizeHeader = 10;

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
      const logoDims = logoImage.scale(0.2); // Ajustez l'échelle selon vos besoins

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
        font: mainFont,
        color: rgb(0.2, 0.6, 0.6),
      });
    }

    // Couleur corporative ESPI
    const espiBlue = rgb(0.04, 0.36, 0.51);
    const espiGray = rgb(0.925, 0.925, 0.925);

    // Identifiant de l'étudiant
    currentY -= 30;
    page.drawText(`Identifiant : ${student.CODE_APPRENANT}`, {
      x: pageWidth - margin - 150,
      y: currentY,
      size: fontSize,
      font: mainFont,
      color: rgb(1, 1, 1),
    });

    // Titre du bulletin
    // Titre du bulletin
    currentY -= 20;
    const bulletinTitle = "Bulletin de notes 2024-2025";
    const bulletinTitleWidth = boldFont.widthOfTextAtSize(bulletinTitle, fontSizeTitle);
    page.drawText(bulletinTitle, {
      x: (pageWidth - bulletinTitleWidth) / 2,
      y: currentY,
      size: fontSizeTitle,
      font: boldFont,
      color: espiBlue,
    });

    const group = groupInfo.length > 0 ? groupInfo[0] : null;
    const etenduGroupe = group && group.ETENDU_GROUPE ? group.ETENDU_GROUPE : "";

    // Semestre
    currentY -= 20;
    const periodeText = `${etenduGroupe} ${period}`;
    const periodeTextWidth = boldFont.widthOfTextAtSize(periodeText, fontSizeTitle);
    page.drawText(periodeText, {
      x: (pageWidth - periodeTextWidth) / 2,
      y: currentY,
      size: fontSizeTitle,
      font: boldFont,
      color: espiBlue,
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
      borderColor: espiBlue,
      borderWidth: 1,
    });

    // Ligne verticale au milieu
    page.drawLine({
      start: { x: margin + boxWidth / 2, y: currentY },
      end: { x: margin + boxWidth / 2, y: currentY - boxHeight },
      thickness: 1,
      color: espiBlue,
    });

    // Informations étudiant côté gauche
    page.drawText(`Apprenant: ${student.NOM_APPRENANT} ${student.PRENOM_APPRENANT}`, {
      x: margin + 5,
      y: currentY - 15,
      size: fontSizeBold,
      font: mainFont,
      color: espiBlue,
    });

    if (student.DATE_NAISSANCE) {
      page.drawText(
        `Date de naissance: ${new Date(student.DATE_NAISSANCE).toLocaleDateString("fr-FR")}`,
        {
          x: margin + 5,
          y: currentY - 30,
          size: fontSize,
          font: mainFont,
          color: espiBlue,
        }
      );
    }

    // Groupe et campus côté droit
    const campus = campusInfo.length > 0 ? campusInfo[0] : null;

    page.drawText(`Groupe: ${group ? group.NOM_GROUPE : "Non spécifié"}`, {
      x: margin + boxWidth / 2 + 5,
      y: currentY - 15,
      size: fontSize,
      font: mainFont,
      color: espiBlue,
    });

    page.drawText(`Campus: ${campus ? campus.NOM_SITE : "Non spécifié"}`, {
      x: margin + boxWidth / 2 + 5,
      y: currentY - 30,
      size: fontSize,
      font: mainFont,
      color: espiBlue,
    });

    currentY -= boxHeight + 20;

    // Tableau des notes
    // En-têtes
    const rowHeight = 20;
    // 1. Calculate the center of the page

    // 2. Define the table width - make it slightly narrower than the full width
    const tableWidth = boxWidth; // 90% of the available width between margins

    // 3. Calculate table position to center it
    const tableLeftMargin = margin + (boxWidth - tableWidth) / 2;

    // 4. Update column positions based on the centered table
    const col1Width = tableWidth * 0.55; // 55% for the subjects (increased for better text display)
    const col2Width = tableWidth * 0.15; // 15% for the average
    const col3Width = tableWidth * 0.15; // 15% for the ECTS
    const col4Width = tableWidth * 0.15; // 15% for the status

    const col1X = tableLeftMargin;
    const col2X = col1X + col1Width;
    const col3X = col2X + col2Width;
    const col4X = col3X + col3Width;

    // Dessiner l'en-tête du tableau
    page.drawRectangle({
      x: col1X,
      y: currentY - rowHeight,
      width: tableWidth,
      height: rowHeight,
      borderColor: espiGray,
      borderWidth: 1,
      color: espiBlue, // Blue for header
    });

    // Colonnes de l'en-tête
    // Update the column dividers
    page.drawLine({
      start: { x: col2X, y: currentY },
      end: { x: col2X, y: currentY - rowHeight },
      thickness: 1,
      color: espiGray,
    });

    page.drawLine({
      start: { x: col3X, y: currentY },
      end: { x: col3X, y: currentY - rowHeight },
      thickness: 1,
      color: espiGray,
    });

    page.drawLine({
      start: { x: col4X, y: currentY },
      end: { x: col4X, y: currentY - rowHeight },
      thickness: 1,
      color: espiGray,
    });

    // Texte de l'en-tête
    const enseignementsText = "Enseignements";
    const enseignementsWidth = boldFont.widthOfTextAtSize(enseignementsText, fontSize);
    const col1Center = col1X + col1Width / 2 - enseignementsWidth / 2;

    page.drawText(enseignementsText, {
      x: col1Center,
      y: currentY - 15,
      size: fontSize,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    const moyenneText = "Moyenne";
    const moyenneWidth = boldFont.widthOfTextAtSize(moyenneText, fontSize);
    const col2Center = col2X + col2Width / 2 - moyenneWidth / 2;

    page.drawText(moyenneText, {
      x: col2Center,
      y: currentY - 15,
      size: fontSize,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    const ectsText = "Total ECTS";
    const ectsWidth = boldFont.widthOfTextAtSize(ectsText, fontSize);
    const col3Center = col3X + col3Width / 2 - ectsWidth / 2;

    page.drawText(ectsText, {
      x: col3Center,
      y: currentY - 15,
      size: fontSize,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    const etatText = "État";
    const etatWidth = boldFont.widthOfTextAtSize(etatText, fontSize);
    const col4Center = col4X + col4Width / 2 - etatWidth / 2;

    page.drawText(etatText, {
      x: col4Center,
      y: currentY - 15,
      size: fontSize,
      font: boldFont,
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

      const borderColor = rgb(0.925, 0.925, 0.925);

      // Vérifier si le NOM_MATIERE commence par "UE"
      const isUE = grade.NOM_MATIERE.startsWith("UE");

      // Couleur de fond de la ligne (gris clair si UE, sinon transparent)
      const backgroundColor = isUE ? rgb(0.925, 0.925, 0.925) : undefined;

      // Dessiner le rectangle de la ligne
      page.drawRectangle({
        x: col1X,
        y: currentY - rowHeight,
        width: tableWidth,
        height: rowHeight,
        borderColor,
        borderWidth: 1,
        color: backgroundColor, // Appliquer la nouvelle couleur
      });

      // Séparations des colonnes
      page.drawLine({
        start: { x: col2X, y: currentY },
        end: { x: col2X, y: currentY - rowHeight },
        thickness: 1,
        color: borderColor,
      });
      page.drawLine({
        start: { x: col3X, y: currentY },
        end: { x: col3X, y: currentY - rowHeight },
        thickness: 1,
        color: borderColor,
      });
      page.drawLine({
        start: { x: col4X, y: currentY },
        end: { x: col4X, y: currentY - rowHeight },
        thickness: 1,
        color: borderColor,
      });

      // Définir la police : en gras si UE, sinon normale
      const textFont = isUE ? boldFont : mainFont;

      // Nom de la matière (gras si UE)
      page.drawText(grade.NOM_MATIERE, {
        x: col1X + 5,
        y: currentY - 15,
        size: 9,
        font: textFont, // Appliquer la bonne police
        color: rgb(0, 0, 0), // Texte noir
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

      const moyenneFont = isUE ? boldFont : mainFont;
      const moyenneTextWidth = moyenneFont.widthOfTextAtSize(moyenne, 9);
      const moyenneCenterX = col2X + col2Width / 2 - moyenneTextWidth / 2;

      page.drawText(moyenne, {
        x: moyenneCenterX,
        y: currentY - 15,
        size: 9,
        font: moyenneFont,
        color: rgb(0, 0, 0), // Texte noir
      });

      // ECTS
      let ectsText = "0";
      try {
        ectsText = ectsValue !== null && ectsValue !== undefined ? ectsValue.toString() : "0";
      } catch (error) {
        console.log(`Erreur lors du formatage des ECTS pour ${grade.NOM_MATIERE}:`, error);
      }

      // ECTS (gras pour "UE")**
      const ectsFont = isUE ? boldFont : mainFont;
      const ectsTextWidth = ectsFont.widthOfTextAtSize(ectsText, 9);
      const ectsCenterX = col3X + col3Width / 2 - ectsTextWidth / 2;

      page.drawText(ectsText, {
        x: ectsCenterX,
        y: currentY - 15,
        size: 9,
        font: ectsFont,
        color: rgb(0, 0, 0), // Texte noir
      });

      // État (validé ou non)
      const etat = parseFloat(moyenne.replace(",", ".")) >= 10 ? "VA" : "NV";
      const etatFont = isUE ? boldFont : mainFont;
      const etatWidth = etatFont.widthOfTextAtSize(etat, 9);
      const etatCenterX = col4X + col4Width / 2 - etatWidth / 2;

      page.drawText(etat, {
        x: etatCenterX,
        y: currentY - 15,
        size: 9,
        font: etatFont,
        color: rgb(0, 0, 0), // Texte noir
      });

      currentY -= rowHeight;

      // Vérifier si une nouvelle page est nécessaire
      if (currentY < margin + 100) {
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
      borderColor: espiBlue,
      borderWidth: 1,
      color: espiBlue,
    });

    // Vertical lines
    page.drawLine({
      start: { x: col2X, y: currentY },
      end: { x: col2X, y: currentY - rowHeight },
      thickness: 1,
      color: espiGray,
    });

    page.drawLine({
      start: { x: col3X, y: currentY },
      end: { x: col3X, y: currentY - rowHeight },
      thickness: 1,
      color: espiGray,
    });

    page.drawLine({
      start: { x: col4X, y: currentY },
      end: { x: col4X, y: currentY - rowHeight },
      thickness: 1,
      color: espiGray,
    });

    // Text "Moyenne générale"
    page.drawText("Moyenne générale", {
      x: col1X + 5,
      y: currentY - 15,
      size: fontSize,
      font: boldFont,
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

    // Center the general average
    const moyenneGeneraleWidth = mainFont.widthOfTextAtSize(moyenneGenerale, fontSize);
    const moyenneGeneraleCenterX = col2X + col2Width / 2 - moyenneGeneraleWidth / 2;

    page.drawText(moyenneGenerale, {
      x: moyenneGeneraleCenterX,
      y: currentY - 15,
      size: fontSize,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    // ✅ Correction : Calcul du total des ECTS
    const getTotalECTS = (subjects: SubjectECTS[], studentId: string): number =>
      subjects
        .filter((subject) => subject.CODE_APPRENANT === studentId) // Filtrer les matières de l'étudiant
        .reduce((total, subject) => total + (Number(subject.CREDIT_ECTS) || 0), 0); // Convertir en nombre et additionner

    // ✅ Vérification et correction du calcul du total des ECTS
    const totalECTS = getTotalECTS(subjects, student.CODE_APPRENANT);
    console.log("Total ECTS après conversion :", totalECTS);

    console.log("Total ECTS calculé :", totalECTS); // Vérifie la valeur dans la console

    const totalECTSText = String(totalECTS); // Assurer une conversion propre en string
    const totalECTSWidth = mainFont.widthOfTextAtSize(totalECTSText, fontSize);
    const totalECTSCenterX = col3X + col3Width / 2 - totalECTSWidth / 2;

    // ✅ Ajout du texte proprement
    page.drawText(totalECTSText, {
      x: totalECTSCenterX,
      y: currentY - 15,
      size: fontSize,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    // État général (Validé ou Non Validé)
    const etatGeneral =
      parseFloat(moyenneGenerale.replace(",", ".")) >= 10 ? "Validé" : "Non validé";
    const etatGeneralWidth = mainFont.widthOfTextAtSize(etatGeneral, fontSize);
    const etatGeneralCenterX = col4X + col4Width / 2 - etatGeneralWidth / 2;

    page.drawText(etatGeneral, {
      x: etatGeneralCenterX,
      y: currentY - 15,
      size: fontSize,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    currentY -= rowHeight + 20;

    // Section absences et observations
    const obsBoxHeight = 60;
    const boxWidthABS = pageWidth - 2 * margin;
    const boxHeightABS = 40;

    // Dessiner le rectangle principal
    page.drawRectangle({
      x: margin,
      y: currentY - boxHeightABS,
      width: boxWidthABS,
      height: boxHeightABS,
      borderColor: espiBlue,
      borderWidth: 1,
    });

    // Lignes verticales pour diviser en trois colonnes
    page.drawLine({
      start: { x: margin + boxWidthABS / 3, y: currentY },
      end: { x: margin + boxWidthABS / 3, y: currentY - boxHeightABS },
      thickness: 1,
      color: espiBlue,
    });

    page.drawLine({
      start: { x: margin + (2 * boxWidthABS) / 3, y: currentY },
      end: { x: margin + (2 * boxWidthABS) / 3, y: currentY - boxHeightABS },
      thickness: 1,
      color: espiBlue,
    });

    // Filtrer les absences de l'étudiant en cours
    const studentAbsence = processedABS.find(
      (abs) => abs.CODE_APPRENANT === student.CODE_APPRENANT
    );

    // Si on trouve des absences, on les affiche
    if (studentAbsence) {
      // Titre "Absences justifiées" dans la première colonne
      page.drawText("Absences justifiées", {
        x: margin + boxWidthABS / 6 - 40, // Centré dans la colonne
        y: currentY - 15,
        size: fontSize,
        font: mainFont,
        color: espiBlue,
      });

      page.drawText(studentAbsence.ABSENCES_JUSTIFIEES, {
        x: margin + boxWidthABS / 6 - 10, // Centré dans la colonne
        y: currentY - 30,
        size: fontSize,
        font: mainFont,
        color: espiBlue,
      });

      // Titre "Absences injustifiées" dans la deuxième colonne
      page.drawText("Absences injustifiées", {
        x: margin + boxWidthABS / 2 - 45, // Centré dans la colonne
        y: currentY - 15,
        size: fontSize,
        font: mainFont,
        color: espiBlue,
      });

      page.drawText(studentAbsence.ABSENCES_INJUSTIFIEES, {
        x: margin + boxWidthABS / 2 - 10, // Centré dans la colonne
        y: currentY - 30,
        size: fontSize,
        font: mainFont,
        color: espiBlue,
      });

      page.drawText("Retards", {
        x: margin + (5 * boxWidthABS) / 6 - 20, // Centré dans la colonne
        y: currentY - 15,
        size: fontSize,
        font: mainFont,
        color: espiBlue,
      });

      page.drawText(studentAbsence.RETARDS, {
        x: margin + (5 * boxWidthABS) / 6 - 10, // Centré dans la colonne
        y: currentY - 30,
        size: fontSize,
        font: mainFont,
        color: espiBlue,
      });
    }

    currentY -= boxHeightABS + 20;
    currentY -= obsBoxHeight + 20;

    // Observations
    const studentObservation = observations.find(
      (obs) => obs.CODE_APPRENANT === student.CODE_APPRENANT
    );

    if (studentObservation) {
      page.drawText("OBSERVATIONS:", {
        x: col1X,
        y: currentY,
        size: fontSize,
        font: mainFont,
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
          const textWidth = mainFont.widthOfTextAtSize(testLine, 9);

          if (textWidth > maxWidth) {
            page.drawText(line, {
              x: col1X,
              y: currentY,
              size: 9,
              font: mainFont,
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
          font: mainFont,
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
        size: fontSize,
        font: mainFont,
      }
    );

    // Signature
    page.drawText("Signature du responsable pédagogique", {
      x: pageWidth - margin - 200,
      y: signatureY - 20,
      size: fontSize,
      font: mainFont,
    });

    // Information sur la validité
    const validiteY = 50;
    page.drawText("VA : Validé / NV : Non Validé / C: Compensation / S: Rattrapage", {
      x: margin,
      y: validiteY,
      size: 8,
      font: mainFont,
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
      console.log("MATIERE:", body.data.MATIERE?.length || 0);
      console.log("GROUPE:", body.data.GROUPE?.length || 0);
      console.log("SITE:", body.data.SITE?.length || 0);

      // Log the UE and associated subjects if MATIERE data is available
      if (body.data.MATIERE && body.data.MATIERE.length > 0) {
        console.log("Analyse des relations UE-Matières avant traitement:");
        logUEWithSubjects(body.data.MATIERE);
      } else {
        console.log("⚠️ Aucune donnée MATIERE disponible pour le log UE/Matières.");
      }
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

    if (data.ECTS_PAR_MATIERE && data.ECTS_PAR_MATIERE.length > 0) {
      const uniqueCount = new Set(
        data.ECTS_PAR_MATIERE.map((item: any) => `${item.CODE_APPRENANT}_${item.CODE_MATIERE}`)
      ).size;
      console.log(
        `📊 ECTS_PAR_MATIERE: ${data.ECTS_PAR_MATIERE.length} éléments, ${uniqueCount} uniques`
      );
      console.log(
        `📌 Ratio de duplication: ${(data.ECTS_PAR_MATIERE.length / uniqueCount).toFixed(2)}x`
      );
    }

    // Initialize ZIP archive in memory
    const zip = new JSZip();

    // Track failures
    let successCount = 0;
    let failureCount = 0;

    // Utiliser les données MATIERE si disponibles, sinon ECTS_PAR_MATIERE
    const sourceMatieres = data.MATIERE || data.ECTS_PAR_MATIERE || [];
    console.log(
      `📄 Source de données pour les matières: ${data.MATIERE ? "MATIERE" : "ECTS_PAR_MATIERE"}, ${
        sourceMatieres.length
      } éléments`
    );

    // Mise à jour des crédits UE avec la nouvelle fonction
    const updatedSubjects = updateUECredits(sourceMatieres);
    console.log(`✅ Crédits UE mis à jour (${updatedSubjects.length} matières traitées)`);

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

        const updatedSubjects = updateUECredits(data.ECTS_PAR_MATIERE || []);

        const pdfBytes = await createStudentPDF(
          student,
          data.MOYENNES_UE || [],
          data.MOYENNE_GENERALE || [],
          data.OBSERVATIONS || [],
          updatedSubjects, // ✅ Utilisation des matières avec ECTS mis à jour
          data.GROUPE || [],
          data.SITE || [],
          period,
          data.ABSENCE || [],
          processAbsences(data.ABSENCE || [])
        );

        console.log("📌 Matières brutes reçues :", data.ECTS_PAR_MATIERE);

        const filename = `${student.NOM_APPRENANT}_${student.PRENOM_APPRENANT}.pdf`;

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

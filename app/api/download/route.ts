// app/api/download/route.ts
import { fileStorage } from "@/lib/fileStorage";
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    // Logs de débogage pour vérifier le dossier temp
    const tempDir = path.join(process.cwd(), "temp");
    console.log(`Dossier temp: ${tempDir}`);
    console.log(`Dossier temp existe: ${fs.existsSync(tempDir)}`);

    // Vérifier le contenu du dossier temp pour le débogage
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      console.log(`Contenu du dossier temp (${files.length} fichiers):`);
      // Afficher jusqu'à 20 fichiers pour éviter de surcharger les logs
      console.log(files.slice(0, 20).join(", ") + (files.length > 20 ? "..." : ""));
    }

    // Logs de débogage pour vérifier l'import de fileStorage
    console.log("fileStorage importé:", fileStorage);
    console.log("getAllFileIds disponible:", typeof fileStorage.getAllFileIds === "function");

    // Get the file identifier from the query parameter
    const searchParams = request.nextUrl.searchParams;
    const fileId = searchParams.get("id");

    console.log(`Tentative de téléchargement du fichier avec ID: ${fileId}`);

    if (!fileId) {
      console.log("❌ Erreur: Identifiant de fichier manquant");
      return NextResponse.json(
        {
          success: false,
          error: "Identifiant de fichier manquant",
        },
        { status: 400 }
      );
    }

    // Afficher les identifiants disponibles dans le store
    const availableFiles = fileStorage.getAllFileIds();
    console.log(`Fichiers disponibles sur disque (${availableFiles.length}):`);
    console.log(availableFiles.join(", "));

    // Vérifier le chemin exact du fichier demandé
    const exactFilePath = path.join(tempDir, fileId);
    console.log(`Chemin complet du fichier recherché: ${exactFilePath}`);
    console.log(`Le fichier existe directement sur le disque: ${fs.existsSync(exactFilePath)}`);

    // Check if the file exists
    if (!fileStorage.hasFile(fileId)) {
      console.log(`❌ Erreur: Fichier non trouvé pour l'ID: ${fileId}`);

      // Vérification supplémentaire: est-ce qu'un fichier similaire existe?
      const similarFiles = availableFiles.filter(
        (filename) =>
          filename.includes(fileId.split("_")[0]) || filename.includes(fileId.split("_")[1] || "")
      );

      if (similarFiles.length > 0) {
        console.log(`Fichiers similaires trouvés: ${similarFiles.join(", ")}`);
      }

      return NextResponse.json(
        {
          success: false,
          error: "Fichier non trouvé",
        },
        { status: 404 }
      );
    }

    // Get the file
    const fileInfo = fileStorage.getFile(fileId);
    if (!fileInfo) {
      console.log(`❌ Erreur: Impossible de lire le fichier pour l'ID: ${fileId}`);
      return NextResponse.json(
        {
          success: false,
          error: "Erreur lors de la récupération du fichier",
        },
        { status: 500 }
      );
    }

    console.log(`✅ Fichier trouvé, taille: ${fileInfo.data.length} octets`);

    // Return the file as a response
    const response = new NextResponse(fileInfo.data);

    // Set appropriate headers
    response.headers.set("Content-Type", fileInfo.contentType);
    response.headers.set("Content-Disposition", `attachment; filename="${fileId}"`);

    // Cache control headers
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    console.log("En-têtes de réponse configurés:", Object.fromEntries(response.headers.entries()));

    return response;
  } catch (error) {
    console.error("❌ Erreur lors du téléchargement du fichier:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors du téléchargement du fichier",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

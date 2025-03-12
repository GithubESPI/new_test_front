// lib/fileStorage.ts
import fs from "fs";
import path from "path";

// Créer un dossier temporaire s'il n'existe pas
const tempDir = path.join(process.cwd(), "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

export const fileStorage = {
  // Stocker un fichier sur le disque
  storeFile(id: string, data: Buffer, contentType: string = "application/zip"): void {
    // Stocker le fichier
    const filePath = path.join(tempDir, id);
    fs.writeFileSync(filePath, data);

    // Stocker les métadonnées (comme le type de contenu)
    const metaFilePath = path.join(tempDir, `${id}.meta.json`);
    fs.writeFileSync(
      metaFilePath,
      JSON.stringify({
        contentType,
        timestamp: Date.now(),
      })
    );

    console.log(`Fichier stocké sur disque: ${filePath}, taille: ${data.length} octets`);
  },

  // Vérifier si un fichier existe
  hasFile(id: string): boolean {
    const filePath = path.join(tempDir, id);
    return fs.existsSync(filePath);
  },

  // Lire un fichier
  getFile(id: string): { data: Buffer; contentType: string } | null {
    const filePath = path.join(tempDir, id);
    const metaFilePath = path.join(tempDir, `${id}.meta.json`);

    if (fs.existsSync(filePath) && fs.existsSync(metaFilePath)) {
      const data = fs.readFileSync(filePath);
      const meta = JSON.parse(fs.readFileSync(metaFilePath, "utf8"));
      return {
        data,
        contentType: meta.contentType || "application/zip",
      };
    }
    return null;
  },

  // Supprimer un fichier
  deleteFile(id: string): boolean {
    const filePath = path.join(tempDir, id);
    const metaFilePath = path.join(tempDir, `${id}.meta.json`);

    let success = true;

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        console.error(`Erreur lors de la suppression du fichier ${id}:`, error);
        success = false;
      }
    }

    if (fs.existsSync(metaFilePath)) {
      try {
        fs.unlinkSync(metaFilePath);
      } catch (error) {
        console.error(`Erreur lors de la suppression des métadonnées pour ${id}:`, error);
        success = false;
      }
    }

    return success;
  },

  // Obtenir la liste des fichiers disponibles
  getAllFileIds(): string[] {
    if (!fs.existsSync(tempDir)) return [];

    return fs
      .readdirSync(tempDir)
      .filter((file) => !file.endsWith(".meta.json"))
      .filter((file) => fs.statSync(path.join(tempDir, file)).isFile());
  },

  // Nettoyer les fichiers anciens (plus vieux que x minutes)
  cleanupOldFiles(maxAgeMinutes: number = 60): void {
    const files = this.getAllFileIds();
    const now = Date.now();
    let cleanedCount = 0;

    for (const file of files) {
      const metaFilePath = path.join(tempDir, `${file}.meta.json`);

      if (fs.existsSync(metaFilePath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaFilePath, "utf8"));
          const fileAge = now - (meta.timestamp || 0);

          // Si le fichier est plus vieux que maxAgeMinutes
          if (fileAge > maxAgeMinutes * 60 * 1000) {
            this.deleteFile(file);
            cleanedCount++;
          }
        } catch (error) {
          console.error(`Erreur lors de la lecture des métadonnées pour ${file}:`, error);
        }
      }
    }

    if (cleanedCount > 0) {
      console.log(`${cleanedCount} fichiers temporaires nettoyés.`);
    }
  },
};

// Exécuter le nettoyage toutes les heures
setInterval(() => {
  try {
    fileStorage.cleanupOldFiles();
  } catch (error) {
    console.error("Erreur lors du nettoyage des fichiers temporaires:", error);
  }
}, 60 * 60 * 1000); // 1 heure

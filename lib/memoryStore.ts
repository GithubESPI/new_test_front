// lib/tempFileStorage.ts
// Système de stockage temporaire pour les fichiers entre les requêtes

// Stockage en mémoire pour les fichiers temporaires
interface FileData {
  data: Buffer;
  timestamp: number;
  contentType: string;
}

class TempFileStorage {
  private static instance: TempFileStorage;
  private files: Map<string, FileData>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.files = new Map();
    // Nettoyer les fichiers toutes les 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanupOldFiles(), 5 * 60 * 1000);
  }

  public static getInstance(): TempFileStorage {
    if (!TempFileStorage.instance) {
      TempFileStorage.instance = new TempFileStorage();
    }
    return TempFileStorage.instance;
  }

  // Stocker un fichier
  public storeFile(id: string, data: Buffer, contentType: string = "application/zip"): void {
    this.files.set(id, {
      data,
      timestamp: Date.now(),
      contentType,
    });
    console.log(`Fichier temporaire stocké: ${id}, taille: ${data.length} octets`);
    console.log(`Nombre total de fichiers stockés: ${this.files.size}`);
  }

  // Récupérer un fichier
  public getFile(id: string): FileData | undefined {
    return this.files.get(id);
  }

  // Vérifier si un fichier existe
  public hasFile(id: string): boolean {
    return this.files.has(id);
  }

  // Supprimer un fichier
  public deleteFile(id: string): boolean {
    return this.files.delete(id);
  }

  // Obtenir tous les IDs de fichiers
  public getAllFileIds(): string[] {
    return Array.from(this.files.keys());
  }

  // Nettoyer les fichiers plus anciens que 10 minutes
  private cleanupOldFiles(): void {
    const now = Date.now();
    const tenMinutesInMs = 10 * 60 * 1000;

    let cleanedCount = 0;
    for (const [id, fileInfo] of this.files.entries()) {
      if (now - fileInfo.timestamp > tenMinutesInMs) {
        this.files.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`${cleanedCount} fichiers temporaires nettoyés. Reste: ${this.files.size}`);
    }
  }
}

// Exporter une instance unique
export const tempFileStorage = TempFileStorage.getInstance();

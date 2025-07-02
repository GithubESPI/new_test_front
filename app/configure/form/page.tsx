/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, FileDown, FileText, Loader2, School, XCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Ajout du champ name dans le schéma
const formSchema = z.object({
  name: z.string().optional(), // Maintenant name est inclus dans le schéma
  campus: z.string().min(1, "Veuillez sélectionner un campus"),
  group: z.string().min(1, "Veuillez sélectionner un groupe"),
  semester: z.string().min(1, "Veuillez sélectionner une période"),
  periodeEvaluationCode: z.string().optional(), // Optionnel pour l'initialisation du formulaire
  periodeEvaluation: z.string().optional(), // Optionnel pour l'initialisation du formulaire
});

// Types pour votre formulaire
type FormValues = z.infer<typeof formSchema>;

interface PeriodeEvaluation {
  CODE_PERIODE_EVALUATION: string;
  NOM_PERIODE_EVALUATION: string;
  DATE_DEB: string;
  DATE_FIN: string;
}

interface YpareoStudent {
  inscriptions: Array<{
    site: {
      codeSite: number;
      nomSite: string;
    };
    codeGroupe: number | null;
  }>;
}

interface YpareoGroup {
  codeGroupe: number;
  nomGroupe: string;
  codeSite: number;
}

interface Campus {
  id: string; // Identifiant unique
  codeSite: number;
  label: string;
}

interface Group {
  id: number;
  label: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface QueryResults {
  APPRENANT: YpareoStudent[];
  MATIERE: string[];
  GROUPE: YpareoGroup[];
  SITE: Campus[];
  NOTE: string[];
  PERIODE_EVALUATION: PeriodeEvaluation[];
}

export default function Home() {
  const { data: session } = useSession();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [periods, setPeriods] = useState<PeriodeEvaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [allGroups, setAllGroups] = useState<YpareoGroup[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showPdfSuccessModal, setShowPdfSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [retrievedData, setRetrievedData] = useState<any>(null);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string>("");
  const [pdfStudentCount, setPdfStudentCount] = useState<number>(0);
  const [selectedGroupName, setSelectedGroupName] = useState<string>("");
  // Déclarez une ref pour stocker les données entre les rendus
  const responseDataRef = useRef<any>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      campus: "",
      group: "",
      semester: "",
      periodeEvaluationCode: "",
      periodeEvaluation: "",
    },
  });

  // Récupération des données utilisateur
  useEffect(() => {
    if (session?.user?.email) {
      const getUserData = async () => {
        try {
          const email = session?.user?.email;
          if (email) {
            const response = await fetch(`/api/user?email=${encodeURIComponent(email)}`);
            const data = await response.json();

            if (data?.name) {
              form.setValue("name", data.name);
            }
          }
        } catch (error) {
          console.error("Erreur lors de la récupération du nom:", error);
        }
      };

      getUserData();
    }
  }, [session, form]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        const studentsResponse = await fetch("/api/students");
        if (!studentsResponse.ok) throw new Error("Erreur lors de la récupération des étudiants");
        const studentsData = await studentsResponse.json();

        const groupsResponse = await fetch("/api/groups");
        if (!groupsResponse.ok) throw new Error("Erreur lors de la récupération des groupes");
        const groupsData = await groupsResponse.json();

        const studentsArray = Object.values(studentsData) as YpareoStudent[];
        const groupsArray = Object.values(groupsData) as YpareoGroup[];

        setAllGroups(groupsArray);

        const uniqueCampusMap = new Map<number, string>();
        studentsArray.forEach((student) => {
          student.inscriptions.forEach((inscription) => {
            if (!uniqueCampusMap.has(inscription.site.codeSite)) {
              uniqueCampusMap.set(inscription.site.codeSite, inscription.site.nomSite);
            }
          });
        });

        const uniqueCampuses: Campus[] = Array.from(uniqueCampusMap).map(
          ([codeSite, nomSite], index) => ({
            id: `campus-${codeSite}-${index}`,
            codeSite: codeSite,
            label: nomSite,
          })
        );

        setCampuses(uniqueCampuses);
      } catch (error) {
        console.error("Erreur:", error);
        setErrorMessage("Erreur lors du chargement des données initiales");
        setShowErrorModal(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Récupération des périodes d'évaluation
        const periodsResponse = await fetch("/api/periods");
        if (!periodsResponse.ok) {
          throw new Error("Erreur lors de la récupération des périodes d'évaluation");
        }

        const periodsData = await periodsResponse.json();

        if (periodsData.success && Array.isArray(periodsData.data)) {
          const startDate = new Date("2024-08-26 00:00:00");
          const endDate = new Date("2025-07-31 00:00:00");

          const filteredPeriods = periodsData.data.filter((period: PeriodeEvaluation) => {
            const periodStartDate = new Date(period.DATE_DEB);
            const periodEndDate = new Date(period.DATE_FIN);

            return (
              // Cas 1 : Exactement les mêmes dates
              (periodStartDate.getTime() === startDate.getTime() &&
                periodEndDate.getTime() === endDate.getTime()) ||
              // Cas 2 : Intervalle compris entre les dates spécifiées
              (periodStartDate >= startDate && periodEndDate <= endDate)
            );
          });
          setPeriods(filteredPeriods);
        } else {
          console.error("Format de données des périodes invalide:", periodsData);
          setPeriods([]);
        }

        const studentsResponse = await fetch("/api/students");
        if (!studentsResponse.ok) throw new Error("Erreur lors de la récupération des étudiants");
        const studentsData = await studentsResponse.json();

        const groupsResponse = await fetch("/api/groups");
        if (!groupsResponse.ok) throw new Error("Erreur lors de la récupération des groupes");
        const groupsData = await groupsResponse.json();

        const studentsArray = Object.values(studentsData) as YpareoStudent[];
        const groupsArray = Object.values(groupsData) as YpareoGroup[];

        setAllGroups(groupsArray);

        const uniqueCampusMap = new Map<number, string>();
        studentsArray.forEach((student) => {
          student.inscriptions.forEach((inscription) => {
            if (!uniqueCampusMap.has(inscription.site.codeSite)) {
              uniqueCampusMap.set(inscription.site.codeSite, inscription.site.nomSite);
            }
          });
        });

        const uniqueCampuses: Campus[] = Array.from(uniqueCampusMap).map(
          ([codeSite, nomSite], index) => ({
            id: `campus-${codeSite}-${index}`,
            codeSite: codeSite,
            label: nomSite,
          })
        );

        setCampuses(uniqueCampuses);
      } catch (error) {
        console.error("Erreur:", error);
        setErrorMessage("Erreur lors du chargement des données initiales");
        setShowErrorModal(true);
        setPeriods([]); // Initialiser avec un tableau vide en cas d'erreur
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const updateGroups = (campusId: string) => {
    const selectedCampus = campuses.find((campus) => campus.id === campusId);
    if (!selectedCampus) return;

    const filteredGroups = allGroups
      .filter((group) => group.codeSite === selectedCampus.codeSite)
      .map((group) => ({
        id: group.codeGroupe,
        label: group.nomGroupe,
      }));
    setGroups(filteredGroups);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);

      const selectedCampus = campuses.find((campus) => campus.id === values.campus);
      if (!selectedCampus) throw new Error("Campus non trouvé");

      // S'assurer que periodeEvaluationCode et periodeEvaluation sont définis
      if (!values.periodeEvaluationCode || !values.periodeEvaluation) {
        const selectedPeriod = periods.find((p) => p.CODE_PERIODE_EVALUATION === values.semester);
        if (!selectedPeriod) throw new Error("Période d'évaluation non trouvée");

        values.periodeEvaluationCode = values.semester;
        values.periodeEvaluation = selectedPeriod.NOM_PERIODE_EVALUATION;
      }

      // Stocker le nom du groupe sélectionné
      const selectedGroup = groups.find((group) => group.id.toString() === values.group);
      if (selectedGroup) {
        setSelectedGroupName(selectedGroup.label);
      }

      const response = await fetch("/api/sql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campus: selectedCampus.codeSite.toString(), // Utiliser codeSite au lieu de l'ID
          group: values.group,
          periodeEvaluationCode: values.periodeEvaluationCode,
          periodeEvaluation: values.periodeEvaluation,
          semester: values.semester,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la récupération des données");
      }

      console.log("✅ Données récupérées:", data);

      // Stocker les données dans à la fois la ref et l'état
      responseDataRef.current = data.data;
      setRetrievedData(data.data);
      console.log("Données stockées:", responseDataRef.current ? "Non null" : "Null");
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error("❌ Erreur lors de la soumission:", error);
      setErrorMessage(error.message || "Une erreur est survenue");
      setShowErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGeneratePDFs = async () => {
    // Utilisez la ref ou l'état, selon ce qui est disponible
    const dataToUse = responseDataRef.current || retrievedData;

    if (!dataToUse) {
      console.error("Aucune donnée disponible pour générer les PDFs");
      setErrorMessage("Aucune donnée disponible pour générer les PDFs");
      setShowErrorModal(true);
      return;
    }

    try {
      setIsGeneratingPDF(true);
      console.log("Données pour génération PDF:", dataToUse);
      console.log("APPRENANT:", dataToUse.APPRENANT?.length || 0);
      console.log("MOYENNES_UE:", dataToUse.MOYENNES_UE?.length || 0);
      console.log("MOYENNE_GENERALE:", dataToUse.MOYENNE_GENERALE?.length || 0);
      console.log("OBSERVATIONS:", dataToUse.OBSERVATIONS?.length || 0);
      console.log("ECTS_PAR_MATIERE:", dataToUse.ECTS_PAR_MATIERE?.length || 0);
      console.log("GROUPE:", dataToUse.GROUPE?.length || 0);
      console.log("SITE:", dataToUse.SITE?.length || 0);

      const selectedPeriod = form.getValues("periodeEvaluation") || "";
      console.log("Période sélectionnée:", selectedPeriod);
      console.log("Nom du groupe:", selectedGroupName);

      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: dataToUse,
          periodeEvaluation: selectedPeriod,
          groupName: selectedGroupName,
        }),
      });

      // Vérifier si la réponse est OK
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la génération des PDFs");
      }

      const data = await response.json();

      setPdfDownloadUrl(data.path);
      setPdfStudentCount(data.studentCount);
      setShowPdfSuccessModal(true);
    } catch (error: any) {
      console.error("❌ Erreur lors de la génération des PDFs:", error);
      setErrorMessage(error.message || "Une erreur est survenue lors de la génération des PDFs");
      setShowErrorModal(true);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 bg-slate-50 grainy-light">
        <Loader2 className="h-6 w-6 animate-spin text-[#0a5d81]" />
        <p className="font-sm text-gray-600">Chargement des données...</p>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50 grainy-light flex items-center justify-center p-3">
        <Card className="w-full max-w-lg mx-4 shadow-none">
          <CardHeader className="pb-4 px-8">
            <div className="flex justify-center mb-2">
              <div className="bg-gradient-to-r from-[#0a5d81] to-[#003349] rounded-full p-3">
                <School className="w-6 h-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-[#0a5d81] to-[#003349] bg-clip-text text-transparent">
              Choisir les bulletins à éditer
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="campus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-md font-semibold text-gray-700">Campus</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          updateGroups(value);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 text-sm border-2 focus:border-[#0a5d81]">
                            <SelectValue placeholder="Sélectionnez un campus" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {campuses.map((campus) => (
                            <SelectItem key={campus.id} value={campus.id} className="text-sm">
                              {campus.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="group"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-md font-semibold text-gray-700">Groupe</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10 text-sm border-2 focus:border-[#0a5d81]">
                            <SelectValue placeholder="Sélectionnez un groupe" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {groups.map((group) => (
                            <SelectItem
                              key={group.id}
                              value={group.id.toString()}
                              className="text-sm"
                            >
                              {group.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="semester"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-md font-semibold text-gray-700">
                        Période d&apos;évaluation
                      </FormLabel>
                      <Select
                        onValueChange={(value) => {
                          const selectedPeriod = periods.find(
                            (p) => p.CODE_PERIODE_EVALUATION === value
                          );

                          console.log("Période sélectionnée - Code:", value);
                          console.log("Période sélectionnée - Détails:", selectedPeriod);

                          // Stocker à la fois le code et le nom
                          if (selectedPeriod) {
                            form.setValue("periodeEvaluationCode", value); // Le code sélectionné
                            form.setValue(
                              "periodeEvaluation",
                              selectedPeriod.NOM_PERIODE_EVALUATION
                            ); // Le nom correspondant
                          }

                          field.onChange(value);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 text-sm border-2 focus:border-[#0a5d81]">
                            <SelectValue placeholder="Sélectionnez une période" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {periods.map((period) => (
                            <SelectItem
                              key={period.CODE_PERIODE_EVALUATION}
                              value={period.CODE_PERIODE_EVALUATION}
                              className="text-sm"
                            >
                              {period.NOM_PERIODE_EVALUATION}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-10 text-sm font-bold bg-gradient-to-r from-[#0a5d81] to-[#003349] hover:bg-wtm-button-linear-reverse transition-all duration-300 flex items-center justify-center gap-2 mt-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  {isSubmitting ? "Chargement..." : "Confirmer mon choix"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Modale de succès */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-6 h-6" />
              Succès
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Les données ont été récupérées avec succès. Vous pouvez maintenant procéder à la
              génération des bulletins.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:justify-center pt-4">
            <Button onClick={closeSuccessModal} variant="outline" className="w-full sm:w-auto">
              Fermer
            </Button>
            <Button
              onClick={handleGeneratePDFs} // Utilisez la fonction ici
              disabled={isGeneratingPDF}
              className="w-full sm:w-auto bg-wtm-button-linear hover:bg-wtm-button-linear-reverse transition-all duration-300 flex items-center justify-center gap-2"
            >
              {isGeneratingPDF ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
              {isGeneratingPDF ? "Génération en cours..." : "Générer les bulletins PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modale de succès pour la génération des PDFs */}
      <Dialog open={showPdfSuccessModal} onOpenChange={setShowPdfSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-6 h-6" />
              Bulletins générés avec succès
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {pdfStudentCount} bulletins ont été générés et placés dans une archive ZIP.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:justify-center pt-4">
            <Button
              onClick={() => setShowPdfSuccessModal(false)}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Fermer
            </Button>
            <Button
              onClick={async () => {
                try {
                  // Utiliser fetch pour télécharger le fichier plutôt que window.location
                  const response = await fetch(pdfDownloadUrl);

                  // Vérifier si la requête a réussi
                  if (!response.ok) {
                    throw new Error(`Erreur ${response.status}: ${response.statusText}`);
                  }

                  // Convertir la réponse en blob
                  const blob = await response.blob();

                  // Créer un URL pour le blob
                  const url = URL.createObjectURL(blob);

                  // Créer un élément <a> pour télécharger le fichier
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `bulletins_${selectedGroupName.replace(/\s+/g, "_")}.zip`;
                  document.body.appendChild(a);

                  // Déclencher le téléchargement
                  a.click();

                  // Nettoyer
                  URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                } catch (error) {
                  console.error("Erreur lors du téléchargement:", error);
                  setErrorMessage("Erreur lors du téléchargement: " + (error as Error).message);
                  setShowErrorModal(true);
                  setShowPdfSuccessModal(false);
                }
              }}
              className="w-full sm:w-auto bg-wtm-button-linear hover:bg-wtm-button-linear-reverse transition-all duration-300 flex items-center justify-center gap-2"
            >
              <FileDown className="w-5 h-5" />
              Télécharger les bulletins
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modale d'erreur */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-6 h-6" />
              Erreur
            </DialogTitle>
            <DialogDescription className="text-gray-600">{errorMessage}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}

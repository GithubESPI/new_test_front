/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, FileText, Loader2, School, XCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
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
  const [allGroups, setAllGroups] = useState<YpareoGroup[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error("❌ Erreur lors de la soumission:", error);
      setErrorMessage(error.message || "Une erreur est survenue");
      setShowErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen form-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#0a5d81]" />
        <p className="text-gray-600 font-medium">Chargement des données...</p>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen form-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl mx-4 card-shadow border-0">
          <CardHeader className="space-y-4 pb-8">
            <div className="flex justify-center">
              <div className="bg-wtm-button-linear rounded-full p-4">
                <School className="w-10 h-10 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-[#0a5d81] to-[#003349] bg-clip-text text-transparent">
                Créer vos bulletins
              </CardTitle>
              <p className="text-center text-gray-600">
                Remplissez le formulaire pour générer vos bulletins de notes
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold text-gray-700">
                        Nom/Prénom
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nom et prénom"
                          {...field}
                          className="h-12 text-lg border-2 focus:border-[#0a5d81] transition-colors"
                          value={field.value || ""} // Assurer qu'il y a toujours une valeur
                        />
                      </FormControl>
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="campus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold text-gray-700">Campus</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          updateGroups(value);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 text-lg border-2 focus:border-[#0a5d81]">
                            <SelectValue placeholder="Sélectionnez un campus" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {campuses.map((campus) => (
                            <SelectItem key={campus.id} value={campus.id} className="text-base">
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
                      <FormLabel className="text-lg font-semibold text-gray-700">Groupes</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 text-lg border-2 focus:border-[#0a5d81]">
                            <SelectValue placeholder="Sélectionnez un groupe" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {groups.map((group) => (
                            <SelectItem
                              key={group.id}
                              value={group.id.toString()}
                              className="text-base"
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
                      <FormLabel className="text-lg font-semibold text-gray-700">
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
                          <SelectTrigger className="h-12 text-lg border-2 focus:border-[#0a5d81]">
                            <SelectValue placeholder="Sélectionnez une période" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {periods.map((period) => (
                            <SelectItem
                              key={period.CODE_PERIODE_EVALUATION}
                              value={period.CODE_PERIODE_EVALUATION}
                              className="text-base"
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
                  className="w-full h-12 text-lg font-semibold bg-wtm-button-linear hover:bg-wtm-button-linear-reverse transition-all duration-300 flex items-center justify-center gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <FileText className="w-5 h-5" />
                  )}
                  {isSubmitting ? "Génération en cours..." : "Générer les bulletins"}
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

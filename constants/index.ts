import { Sparkles, Upload } from "lucide-react";

export const stepsData = [
  {
    id: 1,
    icon: Upload,
    title: "Récupérer les fichiers Excel et Word dans Yparéo",
    description:
      "Téléchargez vos fichiers Excel et Word contenant les données nécessaires (notes, informations sur les apprenants, appréciations) provenant d'Yparéo. Ces fichiers serviront de base pour la génération des bulletins.",
    videoSrc: "/videos/video-1.mp4",
  },
  {
    id: 2,
    icon: Sparkles,
    title: "Lancer la génération des bulletins",
    description:
      "Cliquez sur le bouton Générer vos bulletins pour lancer le processus. Déposez vos documents Word et Excel, puis le système va automatiquement traiter les fichiers Excel et Word pour créer des bulletins de notes au format PDF.",
    videoSrc: "/videos/video-2.mp4",
  },
  {
    id: 3,
    icon: Upload,
    title: "Télécharger les bulletins générés",
    description:
      "Une fois la génération terminée, téléchargez tous les bulletins sous forme de fichier ZIP. Cela vous permet de récupérer l'ensemble des bulletins d'un groupe, en un seul fichier compressé.",
    imageSrc:
      "https://assets.dewatermark.ai/images/watermark-remover/new/featureComparison/before_2.webp",
  },
  {
    id: 4,
    icon: Sparkles,
    title: "Importer les bulletins dans Yparéo",
    description:
      "Cliquez sur le bouton Envoyer sur Yparéo pour importer les bulletins générés directement dans le dossier de chaque apprenant. Le système associe chaque bulletin à l'apprenant concerné grâce à un identifiant unique.",
    imageSrc:
      "https://assets.dewatermark.ai/images/watermark-remover/new/featureComparison/before_2.webp",
  },
];

export const faqItems = [
  {
    question: "Quels types de fichiers dois-je utiliser pour générer les bulletins ?",
    answer:
      "Vous devez fournir un fichier Excel contenant les données des apprenants (notes, absences, etc.) et un fichier Word contenant les appréciations des étudiants. Ces fichiers seront utilisés pour générer les bulletins PDF.",
  },
  {
    question: "Comment générer les bulletins de notes ?",
    answer:
      "Une fois connecté, cliquez sur le bouton Générer vos bulletins. Vous accéderez à une page où vous pourrez déposer vos documents Excel et Word. Le processus de génération commencera automatiquement.",
  },
  {
    question: "Comment suivre la progression de la génération des bulletins ?",
    answer:
      "Pendant la génération des bulletins, une barre de progression sera affichée à l'écran. Vous pourrez ainsi suivre en temps réel l'avancement du processus.",
  },
  {
    question: "Où puis-je récupérer les bulletins après leur génération ?",
    answer:
      "Une fois la génération terminée, vous aurez la possibilité de télécharger tous les bulletins sous forme de fichier ZIP en cliquant sur le lien de téléchargement qui apparaîtra à l'écran.",
  },
  {
    question: "Comment importer les bulletins dans Yparéo ?",
    answer:
      "Après avoir généré et téléchargé les bulletins, cliquez sur Envoyer sur Yparéo pour que les bulletins soient automatiquement importés dans le système Yparéo et associés aux apprenants concernés.",
  },
  {
    question: "Que faire en cas d'erreurs lors de la génération ou de l'importation ?",
    answer:
      "Si une erreur se produit, un message d&apos;erreur apparaîtra avec des détails. Pour résoudre le problème, contactez le support technique.",
  },
  {
    question: "Comment savoir si l'importation a réussi ?",
    answer:
      "Après l'importation, un message de confirmation s&apos;affichera si tout est bien passé. Vous pouvez également vérifier dans Yparéo que les bulletins sont bien associés aux apprenants concernés.",
  },
];

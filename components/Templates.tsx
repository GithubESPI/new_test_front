"use client";

import { motion } from "framer-motion";
import { FileDown, FileText, School } from "lucide-react";
import { useEffect, useState } from "react";

const steps = [
  {
    icon: <School className="w-6 h-6" />,
    title: "1. Sélectionnez le campus et le groupe d'apprenants",
    description:
      "Commencez par choisir votre campus et le groupe d'étudiants pour lesquels vous souhaitez générer les bulletins d'évaluation.",
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: "2. Choisissez la période",
    description:
      "Sélectionnez la période correspondante. Les données seront automatiquement récupérées et analysées pour la génération des bulletins.",
  },
  {
    icon: <FileDown className="w-6 h-6" />,
    title: "3. Générez et téléchargez",
    description:
      "Une fois les données récupérées, générez les bulletins au format PDF et téléchargez-les dans une archive ZIP pratique.",
  },
];

const videos = ["/videos/video-2.mp4", "/videos/video-3.mp4", "/videos/video-4.mp4"];

export default function HowItWorks() {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (progress < 100) {
        setProgress((prev) => Math.min(prev + 1, 100));
      } else {
        const nextStepTimer = setTimeout(() => {
          setCurrentStep((prev) => (prev + 1) % steps.length);
          setProgress(0);
        }, 500);

        return () => clearTimeout(nextStepTimer);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [progress, currentStep]);

  const handleStepClick = (index: number) => {
    setCurrentStep(index);
    setProgress(0);
  };

  return (
    <section className="py-24 bg-primary-50 dark:bg-neutral-900" id="templates">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-sm font-medium tracking-wider text-white/80 uppercase mb-3">
            COMMENT ÇA MARCHE
          </h2>
          <h3 className="text-4xl font-bold text-white mb-4">
            3 étapes rapides pour générer vos bulletins
          </h3>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div className="space-y-12">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="flex gap-6 group cursor-pointer"
                onClick={() => handleStepClick(index)}
              >
                <div className="shrink-0">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-300 ${
                      index === currentStep
                        ? "bg-destructive-50 text-white"
                        : index < currentStep
                        ? "bg-destructive-50 text-white"
                        : "bg-rose-50 text-destructive-50"
                    } group-hover:bg-destructive-50 group-hover:text-white`}
                  >
                    <div>{step.icon}</div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="relative w-px h-12 bg-white/20 mx-auto mt-4">
                      <div
                        className="absolute top-0 left-0 w-full bg-destructive-50 transition-transform duration-300 origin-top"
                        style={{
                          height: "100%",
                          transform: `scaleY(${
                            index < currentStep ? 1 : index === currentStep ? progress / 100 : 0
                          })`,
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="group-hover:translate-x-2 transition-transform duration-300">
                  <h4 className="text-xl font-semibold mb-2 text-white">{step.title}</h4>
                  <p className="text-white/80 leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="relative">
            <div className="rounded-2xl overflow-hidden shadow-2xl">
              <video
                src={videos[currentStep]}
                muted
                autoPlay
                loop
                className="w-full h-auto transition-all duration-500"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import ButtonsProvider from "@/components/ButtonProvider";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Page() {
  const [isMobile, setIsMobile] = useState(false);

  // Détecter si l'appareil est mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Vérifier au chargement
    checkIfMobile();

    // Ajouter un écouteur pour redimensionnement
    window.addEventListener("resize", checkIfMobile);

    // Nettoyer l'écouteur
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  return (
    <main className="relative min-h-screen w-full bg-white">
      {/* Split background - montré uniquement sur desktop */}
      {!isMobile && (
        <div className="absolute inset-0 flex md:flex">
          <div className="w-1/2 bg-white"></div>
          <div className="w-1/2 relative overflow-hidden">
            <Image
              src="/images/background.png"
              alt="background"
              fill
              className="object-cover"
              priority
              quality={100}
            />
            {/* Superposition colorée pour améliorer la lisibilité du texte */}
            <div className="absolute inset-0 bg-blue-800/40"></div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row h-full min-h-screen">
        {/* Zone du formulaire */}
        <div className="w-full md:w-1/2 flex items-center justify-center py-8 px-4 z-10">
          <div className="w-full max-w-md">
            {/* Logo */}
            <div className="flex justify-center mb-10">
              <Image
                src="/images/logo.png"
                alt="ESPI logo"
                width={160}
                height={40}
                className="h-auto"
              />
            </div>

            {/* Titre */}
            <h1 className="text-2xl font-medium text-center mb-8">
              Connectez-vous à l&apos;application des bulletins
            </h1>

            {/* Bouton Authentification */}
            <ButtonsProvider />

            {/* Texte légal */}
            <p className="text-xs text-center text-gray-500 mt-6">
              En continuant, vous acceptez nos{" "}
              <Link href="#" className="text-gray-700 hover:underline">
                Conditions d&apos;utilisation
              </Link>{" "}
              et notre{" "}
              <Link href="#" className="text-gray-700 hover:underline">
                Politique de confidentialité
              </Link>
              .
            </p>
          </div>
        </div>

        {/* Zone d'illustration (visible uniquement sur desktop) */}
        <div className="hidden md:flex w-1/2 bg-white relative">
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
            <Image
              src="/images/background.png"
              alt="background"
              fill
              className="size-full object-cover"
              priority
            />
          </div>
        </div>
      </div>
    </main>
  );
}

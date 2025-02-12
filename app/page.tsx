"use client";

import ButtonProvider from "@/components/ButtonProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

export default function Page() {
  return (
    <main className="relative h-screen w-full">
      <div className="absolute size-full">
        <Image
          src="/images/background.png"
          alt="background"
          fill
          className="size-full object-cover"
          priority
        />
      </div>
      <div className="flex items-center justify-center min-h-screen p-4 relative z-10 bg-black/30">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Image src="/images/logo.png" alt="logo" width={125} height={125} className="m-auto" />
          </CardHeader>

          <CardContent>
            <CardTitle className="text-2xl font-bold text-center text-gray-800">
              Connectez-vous
            </CardTitle>
            <CardDescription className="text-center pb-8 pt-3">
              Pour continuer sur l&apos;application des bulletins
            </CardDescription>
            <ButtonProvider />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

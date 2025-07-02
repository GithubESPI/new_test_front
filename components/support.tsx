"use client";

import { ArrowUp } from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/button";

export default function Support() {
  return (
    <section className="py-24 bg-slate-50 grainy-light" id="faq">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-sm font-medium tracking-wider text-primary-50 uppercase mb-3">
            Support
          </h2>
          <h3 className="text-4xl font-bold text-gray-900">Vous avez des questions ? </h3>
        </div>

        <div className="relative text-center lg:w-[360px] max-w-md mx-auto">
          <Button className="inline-flex items-center justify-center w-full bg-wtm-button-linear rounded-lg hover:bg-opacity-80 transition cursor-pointer shadow-wtm-button-shadow px-10 py-5 hover:bg-wtm-button-linear-reverse hover:shadow-wtm-button-shadow">
            <ArrowUp className="inline-flex mr-2" size={20} />
            <Link
              href="https://support.informatique.groupe-espi.fr/servicedesk/customer/portal/13"
              className="font-semibold leading-[28px] tracking-[0.02em]"
              target="_blank"
              rel="noopener noreferrer"
            >
              Contactez-nous ici
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

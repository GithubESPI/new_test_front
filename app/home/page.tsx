"use client";

import CallToAction from "@/components/CallToAction";
import FAQSection from "@/components/FAQSection";
import MaxWidthWrapper from "@/components/MaxWidthWrapper";
import StepsSections from "@/components/StepsSections";
import dynamic from "next/dynamic";

const DynamicReviews = dynamic(() => import("@/components/Reviews"), {
  ssr: false,
});

export default function Page() {
  return (
    <div className="bg-slate-50 grainy-light">
      <section>
        <MaxWidthWrapper className="pb-24 pt-10 sm:pb-22 lg:gap-x-0 xl:gap-x-8 lg:pt-20 xl:pt-22 lg:pb-50">
          <div className="col-span-2 px-6 lg:px-0 lg:pt-4">
            <div className="relative mx-auto text-center lg:text-left flex flex-col items-center lg:items-center">
              <h1 className="relative w-fit tracking-tight text-balance mt-16 font-bold !leading-tight text-gray-900 text-5xl md:text-6xl lg:text-7xl">
                Générer vos bulletins scolaires
              </h1>

              <div>
                <p className="mt-8 text-lg max-w-prose text-center lg:text-center text-balance md:text-wrap">
                  Simplifiez la gestion et la distribution des{" "}
                  <span className="font-semibold">bulletins scolaires</span> semestriels des
                  apprenants, avec notre application innovante.
                </p>
                <CallToAction />
              </div>
            </div>
          </div>
        </MaxWidthWrapper>
      </section>

      <section className="bg-slate-100 grainy-dark py-24" id="utilisation">
        <MaxWidthWrapper className="flex flex-col items-center gap-16 sm:gap-32">
          <div className="flex flex-col lg:flex-row items-center gap-4 sm:gap-6">
            <h2 className="order-1 mt-2 tracking-tight text-center !leading-tight font-bold text-4xl md:text-5xl text-gray-900">
              Comment <span className="relative px-2 text-primary-50"> générer</span> des bulletins
              pour les apprenants ?
            </h2>
          </div>
          <StepsSections />
        </MaxWidthWrapper>
        <div className="pt-16">
          <DynamicReviews />
        </div>
      </section>

      <section
        className="py-10 lg:py-[60px] bg-gradient-to-r from-third-50 to-primary-50 snap-block"
        id="faq"
      >
        <div className="container flex lg:flex-row flex-col lg:gap-[112px]">
          <div className="mb-6 lg:mb-12 lg:w-1/2">
            <h2 className="text-white text-2xl lg:text-4xl font-bold lg:leading-[46px]">
              Questions fréquemment
              <br /> posées
            </h2>
            <p className="text-white text-sm lg:text-xl font-medium lg:leading-7 leading-tight mt-6">
              Si vous êtes bloqué quelque part, nous sommes là pour vous aider !
            </p>
          </div>
          <FAQSection />
        </div>
      </section>
    </div>
  );
}

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqItems } from "../constants/index"; // Importer les données depuis constants/index.ts

const FAQSection = () => {
  return (
    <div className="divide-y tlg:w-1/2">
      <Accordion type="single" collapsible className="w-full">
        {faqItems.map((item, index) => (
          <AccordionItem key={index} value={`item-${index + 1}`}>
            <AccordionTrigger className="flex items-center justify-between w-full px-5 py-4 text-white no-underline">
              <h3 className="block pr-4 font-semibold text-left text-neutral-ink-600">
                {item.question}
              </h3>
            </AccordionTrigger>
            <AccordionContent className="flex items-center justify-between w-full px-5 py-4 text-white">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default FAQSection;

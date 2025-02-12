import { ArrowDown } from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/button";

const CallToAction = () => {
  return (
    <div className="order-2 mt-9 lg:order-1 relative">
      <div className="rounded-xl lg:px-16 px-6 text-center">
        <div className="relative text-center lg:w-[360px] max-w-md mx-auto">
          <Button className="inline-flex items-center justify-center w-full bg-wtm-button-linear rounded-lg hover:bg-opacity-80 transition cursor-pointer shadow-wtm-button-shadow px-10 py-5 hover:bg-wtm-button-linear-reverse hover:shadow-wtm-button-shadow">
            <ArrowDown className="inline-flex mr-2" size={20} />
            <Link href="#utilisation" className="font-semibold leading-[28px] tracking-[0.02em]">
              Comment faire ?
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CallToAction;

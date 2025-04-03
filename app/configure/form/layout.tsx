import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";
import { Toaster } from "@/components/ui/toaster";
import { ReactNode } from "react";

const HomeLayout = ({ children }: { children: ReactNode }) => {
  return (
    <>
      <Navbar />
      <main className="flex grainy-light flex-col min-h-[calc(100vh-3.5rem-1px)]">
        <div className="flex-1 flex flex-col h-full">
          <Providers>{children}</Providers>
        </div>
        <Footer />
      </main>

      <Toaster />
    </>
  );
};

export default HomeLayout;

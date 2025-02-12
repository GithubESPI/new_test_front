"use client";

import { ArrowRight, Menu } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import MaxWidthWrapper from "./MaxWidthWrapper";
import { buttonVariants } from "./ui/button";
import { Dialog, DialogContent, DialogOverlay } from "./ui/dialog";

const Navbar = () => {
  const { data: session } = useSession();
  const user = session?.user;
  const isAdmin = user?.email === process.env.ADMIN_EMAIL;
  const [isDialogOpen, setDialogOpen] = useState(false);

  return (
    <nav className="sticky z-[80] h-24 inset-x-0 top-0 w-full border-b border-gray-200 bg-gradient-to-r/75 from-yellow-50 to-pink-50 backdrop-blur-lg transition-all">
      <MaxWidthWrapper>
        <div className="flex h-24 items-center justify-between border-b border-zinc-200">
          <Link href="/home" className="flex z-40 font-semibold">
            <Image
              src="/images/logo.png"
              width={130}
              height={50}
              alt="Logo de l'application"
              className="object-contain"
            />
          </Link>

          <div className="h-full flex items-center space-x-4">
            <button className="lg:hidden" onClick={() => setDialogOpen(true)}>
              <Menu className="h-6 w-6" />
            </button>
            <div className="hidden lg:flex items-center space-x-4">
              {user ? (
                <>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className={buttonVariants({ size: "lg", variant: "ghost" })}
                  >
                    Déconnexion
                  </button>
                  {isAdmin && (
                    <Link
                      href="/dashboard"
                      className={buttonVariants({ size: "lg", variant: "ghost" })}
                    >
                      Dashboard ✨
                    </Link>
                  )}
                  <Link href="#faq" className={buttonVariants({ size: "lg", variant: "ghost" })}>
                    Questions/Réponses
                  </Link>
                  <Link
                    href="/configure/form"
                    className={buttonVariants({
                      size: "lg",
                      className: "hidden lg:flex items-center gap-1",
                    })}
                  >
                    Générer vos bulletins
                    <ArrowRight className="ml-1.5 h-5 w-5" />
                  </Link>
                </>
              ) : (
                <>
                  <div className="h-8 w-px bg-zinc-200 hidden sm:block" />
                  <Link
                    href="/configure/form"
                    className={buttonVariants({
                      size: "sm",
                      className: "hidden sm:flex items-center gap-1",
                    })}
                  >
                    Générer vos bulletins
                    <ArrowRight className="ml-1.5 h-5 w-5" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </MaxWidthWrapper>

      <Dialog open={isDialogOpen}>
        <DialogOverlay
          className="fixed inset-0 bg-black opacity-50"
          onClick={() => setDialogOpen(false)}
        />
        <DialogContent className="fixed inset-0 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            {user ? (
              <>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className={buttonVariants({ size: "lg", variant: "ghost" })}
                >
                  Déconnexion
                </button>
                {isAdmin && (
                  <Link
                    href="/dashboard"
                    className={buttonVariants({ size: "lg", variant: "ghost" })}
                  >
                    Dashboard ✨
                  </Link>
                )}
                <Link href="#faq" className={buttonVariants({ size: "lg", variant: "ghost" })}>
                  Questions/Réponses
                </Link>
                <Link
                  href="/configure/form"
                  className={buttonVariants({
                    size: "lg",
                    className: "flex items-center gap-1",
                  })}
                >
                  Générer vos bulletins
                  <ArrowRight className="ml-1.5 h-5 w-5" />
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/configure/form"
                  className={buttonVariants({
                    size: "sm",
                    className: "flex items-center gap-1",
                  })}
                >
                  Générer vos bulletins
                  <ArrowRight className="ml-1.5 h-5 w-5" />
                </Link>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </nav>
  );
};

export default Navbar;

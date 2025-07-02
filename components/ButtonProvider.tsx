import { signIn } from "next-auth/react";
import { useState } from "react";
import { FaSpinner } from "react-icons/fa";
import { VscAzure } from "react-icons/vsc";
import { Button } from "./ui/button";

const ButtonsProvider = () => {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (provider: string) => {
    setLoading(true); // Démarre le loader
    try {
      await signIn(provider, {
        callbackUrl: "/home",
      }); // Appelez le fournisseur d'authentification ici
    } catch (error) {
      setLoading(false); // Si une erreur se produit, arrêtez le loader
      console.error("Erreur lors de la connexion :", error);
    }
  };

  return (
    <>
      <div className="flex flex-col space-y-4">
        <Button
          onClick={() => handleSignIn("azure-ad")}
          className="w-full bg-primary-50 flex items-center justify-center border border-bg-primary-50 rounded-md p-6 mb-6  transition hover:bg-third-50"
          disabled={loading}
        >
          {loading ? (
            <FaSpinner className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <VscAzure className="h-4 w-4 mr-2" />
          )}
          <p className="text-white">Se connecter avec mon compte ESPI</p>
        </Button>
      </div>
    </>
  );
};

export default ButtonsProvider;

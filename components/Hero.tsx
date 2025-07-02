import CallToAction from "./CallToAction";
import HeroVideoDialog from "./magicui/hero-video-dialog";

const Hero = () => {
  return (
    <>
      <div className="text-center mb-10">
        {/* Announcement Badge */}

        {/* Main Heading */}
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-6 lg:text-6xl">
          Générer vos bulletins
          <br />
          scolaires
        </h1>

        {/* Subheading */}
        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
          Simplifiez la gestion et la distribution aux
          <br />
          apprenants, avec notre application innovante.
        </p>

        {/* CTA Section */}
        <div className="space-y-4">
          <CallToAction />
        </div>
      </div>

      <div className="relative mt-16">
        <HeroVideoDialog
          className="block rounded-xl border-8 border-white shadow-2xl overflow-hidden"
          animationStyle="from-center"
          videoSrc="/videos/video-1.mp4"
          thumbnailSrc="/images/form.png"
          thumbnailAlt="Démonstration de l'application"
        />
      </div>
    </>
  );
};

export default Hero;

import { stepsData } from "@/constants";
import Image from "next/image";

const StepsSection = () => {
  return (
    <div className="space-y-12 pt-10 lg:pt-[12px] lg:space-y-20">
      {stepsData.map((step, index) => (
        <div
          key={index}
          className={`sm:flex sm:justify-start sm:items-center gap-10 justify-center items-center text-base-content-primary ${
            index % 2 === 1 ? "flex-row-reverse" : ""
          }`}
        >
          <div className="flex flex-col gap-5 w-full lg:w-1/2">
            <div
              className={`w-14 h-14 bg-${
                index % 2 === 0 ? "violet" : "cyan"
              }-50 rounded-xl flex flex-col justify-center items-center`}
            >
              <step.icon />
            </div>
            <div>
              <h3 className="text-neutral-900 text-xl lg:text-3xl font-bold leading-relaxed lg:leading-10">
                <span className="text-primary-50">{step.title.split(" ")[0]}</span>{" "}
                {step.title.split(" ").slice(1).join(" ")}
              </h3>
              <p className="sm:mb-8 sm:mt-4 sm:text-sm text-justify">{step.description}</p>
            </div>
          </div>

          <div className="flex flex-col justify-center w-full lg:w-1/2">
            <div className="max-w-[921px] m-auto bg-white lg:p-6 p-3 rounded-2xl shadow-wtm-image-compare-shadow sm:mt-10">
              <div className="h-auto w-full">
                <div className="flex justify-center items-center">
                  <div className="w-full">
                    <div className="relative cursor-pointer">
                      {step.videoSrc ? (
                        <video
                          autoPlay
                          controls
                          width="320"
                          height="240"
                          src={step.videoSrc}
                          className="relative w-full rounded-2xl slider-feature-split-line rendered"
                        />
                      ) : (
                        step.imageSrc && (
                          <Image
                            src={step.imageSrc}
                            alt="video placeholder"
                            width={921}
                            height={518}
                            layout="responsive"
                            className="relative w-full rounded-2xl slider-feature-split-line rendered"
                            loading="lazy"
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StepsSection;

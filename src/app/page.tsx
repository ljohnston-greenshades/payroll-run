import Image from "next/image";
import { GreenshadesLogo } from "@/components/GreenshadesLogo";
import { RegistrationForm } from "@/components/RegistrationForm";

export default function HomePage() {
  const eventName = process.env.NEXT_PUBLIC_EVENT_NAME ?? "the booth";

  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-8">
      <div className="flex w-full max-w-lg flex-col items-center text-center">
        <GreenshadesLogo className="mb-2 h-6 w-auto" />
        <p className="mb-4 font-serif text-[0.65rem] uppercase tracking-[0.3em] text-white/60">
          {eventName}
        </p>

        <div className="mb-2 flex items-end justify-center gap-4 sm:gap-6">
          <Image
            src="/flo.png"
            alt="Flo the flamingo"
            width={160}
            height={200}
            unoptimized
            priority
            className="flo-bounce drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
            style={{ imageRendering: "pixelated" }}
          />
          <div className="flex flex-col items-start pb-3 text-left">
            <h1 className="font-pixel text-2xl leading-tight text-gsGreen sm:text-3xl">
              PAYROLL
              <br />
              RUN
            </h1>
            <p className="mt-2 font-serif text-sm text-white/85 sm:text-base">
              How long can you keep
              <br />
              payroll running?
            </p>
          </div>
        </div>

        <div className="mt-4 w-full">
          <RegistrationForm />
        </div>
      </div>
    </main>
  );
}

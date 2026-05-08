import Image from "next/image";
import { GreenshadesLogo } from "@/components/GreenshadesLogo";
import { RegistrationForm } from "@/components/RegistrationForm";

export default function HomePage() {
  const eventName = process.env.NEXT_PUBLIC_EVENT_NAME ?? "the booth";

  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-8">
      <div className="flex w-full max-w-4xl flex-col items-center">
        <GreenshadesLogo className="mb-2 h-6 w-auto" />
        <p className="mb-8 font-serif text-[0.65rem] uppercase tracking-[0.3em] text-white/60">
          {eventName}
        </p>

        <div className="flex w-full flex-col items-center gap-8 md:flex-row md:items-center md:justify-center md:gap-12">
          <div className="flex flex-col items-center md:items-start">
            <Image
              src="/flo.png"
              alt="Flo the flamingo"
              width={260}
              height={336}
              unoptimized
              priority
              className="flo-bounce drop-shadow-[0_10px_24px_rgba(0,0,0,0.6)]"
              style={{ imageRendering: "pixelated" }}
            />
            <p className="mt-3 hidden font-pixel text-[0.6rem] uppercase tracking-widest text-gsGreen md:block">
              Meet Flo
            </p>
          </div>

          <div className="flex w-full max-w-md flex-col items-center text-center md:items-start md:text-left">
            <h1 className="font-pixel text-3xl leading-tight text-gsGreen sm:text-4xl">
              PAYROLL
              <br />
              RUN
            </h1>
            <p className="mb-5 mt-2 font-serif text-base text-white/85">
              How long can you keep payroll running?
            </p>
            <RegistrationForm />
          </div>
        </div>
      </div>
    </main>
  );
}

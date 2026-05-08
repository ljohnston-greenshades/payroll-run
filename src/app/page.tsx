import { GreenshadesLogo } from "@/components/GreenshadesLogo";
import { RegistrationForm } from "@/components/RegistrationForm";

export default function HomePage() {
  const eventName = process.env.NEXT_PUBLIC_EVENT_NAME ?? "the booth";

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-end justify-center opacity-20">
        <div className="flamingo-bounce text-[12rem] leading-none">🦩</div>
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <GreenshadesLogo className="mb-3 h-7 w-auto" />
        <p className="mb-1 font-serif text-xs uppercase tracking-[0.3em] text-white/60">
          {eventName}
        </p>
        <h1 className="font-pixel text-3xl text-gsGreen sm:text-4xl">PAYROLL RUN</h1>
        <p className="mt-3 mb-8 font-serif text-lg text-white/85">
          How long can you keep payroll running?
        </p>

        <RegistrationForm />
      </div>
    </main>
  );
}

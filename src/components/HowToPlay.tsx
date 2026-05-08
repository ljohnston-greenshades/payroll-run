interface ItemProps {
  icon: string;
  name: string;
  desc: string;
  positive?: boolean;
}

function Item({ icon, name, desc, positive }: ItemProps) {
  return (
    <li className="flex items-center gap-2 text-xs">
      <span className="text-base">{icon}</span>
      <span>
        <span
          className={`font-pixel text-[0.55rem] uppercase tracking-wider ${
            positive ? "text-gsGreen" : "text-red-300"
          }`}
        >
          {name}
        </span>
        <span className="ml-1.5 text-white/60">{desc}</span>
      </span>
    </li>
  );
}

export function HowToPlay() {
  return (
    <div className="mt-6 w-full max-w-md rounded-md border border-white/10 bg-white/[0.03] p-4">
      <p className="font-pixel text-[0.55rem] uppercase tracking-widest text-gsGreen">
        How to play
      </p>
      <p className="mt-1 mb-3 font-serif text-xs text-white/70">
        Tap or press <span className="text-white">SPACE</span> to jump,{" "}
        <span className="text-white">↓</span> to duck. Survive as long as you
        can.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ul className="space-y-1.5">
          <Item icon="💰" name="Paycheck" desc="+$100 × combo" positive />
          <Item icon="📄" name="W-2 Form" desc="+$250 × combo" positive />
          <Item icon="🛡️" name="GS Shield" desc="5s of protection" positive />
        </ul>
        <ul className="space-y-1.5">
          <Item icon="🚫" name="IRS Audit" desc="game over — jump" />
          <Item icon="⏰" name="Deadline" desc="duck to avoid" />
          <Item icon="⚖️" name="Garnishment" desc="game over — jump" />
        </ul>
      </div>
    </div>
  );
}

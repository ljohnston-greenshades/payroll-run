"use client";

import { deletePlayerAction } from "./actions";

interface Props {
  playerId: string;
  playerName: string;
  adminKey: string;
}

// Wraps the deletePlayerAction in a native `confirm()` so admins
// can't single-tap themselves into wiping a real lead by accident.
// Client component because server components can't attach onSubmit.
export function DeletePlayerButton({ playerId, playerName, adminKey }: Props) {
  return (
    <form
      action={deletePlayerAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Delete "${playerName}" and ALL their scores? This cannot be undone.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="key" value={adminKey} />
      <input type="hidden" name="id" value={playerId} />
      <button
        type="submit"
        className="rounded border border-red-500/50 px-2 py-1 text-xs text-red-300 transition hover:bg-red-500/10"
      >
        Delete
      </button>
    </form>
  );
}

// Subtle sunset gradient anchored to the bottom of the attract
// screen — warm orange at the horizon fading up through coral, pink,
// and a whisper of dusk-purple. Low-opacity throughout so it reads as
// atmosphere rather than a focal element.
export function ParallaxSkyline() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 overflow-hidden"
      style={{ height: "380px" }}
    >
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: "380px",
          background:
            "linear-gradient(to top, rgba(237, 124, 46, 0.22) 0%, rgba(255, 138, 110, 0.14) 25%, rgba(255, 107, 157, 0.08) 55%, rgba(130, 90, 180, 0.05) 80%, transparent 100%)",
        }}
      />
      {/* Soft golden glow right at the horizon line to suggest sun. */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: "80px",
          background:
            "linear-gradient(to top, rgba(245, 213, 12, 0.10), transparent)",
        }}
      />
    </div>
  );
}

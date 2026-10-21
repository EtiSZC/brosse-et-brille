/** The app's name, shown as a sticker title on the home screen and the profile picker. */
export const APP_NAME = "Quenottes";

// Small fixed tilt per letter for a hand-stuck sticker look.
const TILTS = [-3, 2, -2, 3, -1, 2, 0, -2, 0, 3, -2, 2, -3, 1, -2];

/** Each letter slightly tilted, like stickers; read as one word by screen readers. */
const AppTitle = () => (
  <>
    <span className="sr-only">{APP_NAME}</span>
    {APP_NAME.split("").map((char, i) => (
      <span
        key={i}
        aria-hidden
        className="inline-block"
        style={{ transform: `rotate(${TILTS[i % TILTS.length]}deg)`, minWidth: char === " " ? "0.3em" : undefined }}
      >
        {char}
      </span>
    ))}
  </>
);

export default AppTitle;

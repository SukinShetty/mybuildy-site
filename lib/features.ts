// The eight feature cards. Shared by the lazy card stack and its static placeholder.
export type Feature = {
  title: string;
  line: string;
  image: { src: string; alt: string; kind: "screen" | "pose"; width: number; height: number };
};

export const FEATURES: Feature[] = [
  {
    title: "Watches your screen, not your code",
    line: "You pick one window. He reads what it shows and never opens your files.",
    image: { src: "/images/screens/mascot.png", alt: "The small Buildy mascot floating on the desktop with its control bar", kind: "screen", width: 379, height: 380 },
  },
  {
    title: "Plain English, every time",
    line: "Every step the agent takes, explained without jargon.",
    image: { src: "/images/buildy-idle.png", alt: "Buildy standing and smiling, ready to explain", kind: "pose", width: 512, height: 768 },
  },
  {
    title: "The next prompt, ready to send",
    line: "He writes it, you read it, one click sends it to the terminal.",
    image: { src: "/images/screens/guidance-panel.png", alt: "Guidance panel showing a plain-English summary, an on-track status, and the next prompt with a Send button", kind: "screen", width: 525, height: 593 },
  },
  {
    title: "Checks that it actually worked",
    line: "When the agent says it is done, he looks for proof before moving on.",
    image: { src: "/images/buildy-thinking.png", alt: "Buildy with a hand on his chin, thinking", kind: "pose", width: 512, height: 768 },
  },
  {
    title: "Stops when a decision needs you",
    line: "No guessing on the choices that are yours to make. He asks.",
    image: { src: "/images/buildy-watching.png", alt: "Buildy mid-step, looking up attentively", kind: "pose", width: 512, height: 768 },
  },
  {
    title: "Remembers your project",
    line: "Tomorrow he knows what you built today. Stored only on your computer.",
    image: { src: "/images/screens/memory.png", alt: "Project memory screen with the goal and what My Buildy has learned", kind: "screen", width: 683, height: 854 },
  },
  {
    title: "Your key, your model",
    line: "Anthropic, OpenAI, Google, OpenRouter, or a local model. You choose.",
    image: { src: "/images/screens/settings.png", alt: "Settings screen listing Anthropic, OpenAI, Google Gemini and OpenRouter as providers", kind: "screen", width: 683, height: 854 },
  },
  {
    title: "Speaks, so you can keep reading",
    line: "He can read his explanation aloud while your eyes stay on the terminal.",
    image: { src: "/images/buildy-speaking.png", alt: "Buildy talking with one hand raised", kind: "pose", width: 512, height: 768 },
  },
];

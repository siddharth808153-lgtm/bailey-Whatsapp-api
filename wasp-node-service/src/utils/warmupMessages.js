const WARMUP_MESSAGES = [
  "Hello, how is your day going?",
  "Hey there! Just checking in.",
  "Hi, did you get a chance to look at the document?",
  "Good morning! Hope you have a productive day.",
  "Hey! Let's catch up sometime this week.",
  "Hello, hope all is well with you.",
  "Hi there, is this number active?",
  "Quick question: are we meeting today?",
  "Hi, just testing out the new connection.",
  "Good afternoon! Just wanted to say hello."
];

const WARMUP_REPLIES = [
  "Hey! Yes, everything is going great here.",
  "Hi there. Yes, I saw it, will reply soon.",
  "Hello. Sure, let's connect tomorrow.",
  "Good morning! Yes, hope you have a great day too.",
  "Hey! I'm around, let's chat in the evening.",
  "Hello. Yes, all is good on my end.",
  "Hi, yes, this number is active and working.",
  "Yes, we are still on for today's meeting.",
  "Awesome, connection looks stable!",
  "Good afternoon! Thanks for reaching out."
];

export function getRandomMessage() {
  const idx = Math.floor(Math.random() * WARMUP_MESSAGES.length);
  return WARMUP_MESSAGES[idx];
}

export function getRandomReply() {
  const idx = Math.floor(Math.random() * WARMUP_REPLIES.length);
  return WARMUP_REPLIES[idx];
}

export function getRandomDelay(minMs = 30000, maxMs = 120000) {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

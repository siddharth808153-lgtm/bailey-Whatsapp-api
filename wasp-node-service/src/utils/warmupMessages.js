// Pool of natural-sounding messages for warmup
// Randomized to avoid pattern detection

export const warmupMessagePool = [
  "Hey! How are you doing today? 😊",
  "Good morning! Hope you have a great day ahead.",
  "Hi there! Just checking in.",
  "Hello! Everything good on your end?",
  "Hey, what's up?",
  "Hope you're having a wonderful day!",
  "Good evening! How was your day?",
  "Hi! Long time no chat. How are things?",
  "Hey! Just wanted to say hello 👋",
  "Good afternoon! Hope all is well.",
  "Hey, how's everything going?",
  "Hi! Hope you're doing well today.",
  "Hello there! Just passing by to say hi.",
  "Hey! How's your week going so far?",
  "Good morning sunshine! Have a great day 🌞",
  "Hi! Just wanted to check in on you.",
  "Hey there! Hope things are going smoothly.",
  "Hello! Wishing you a productive day.",
  "Hey! How are you feeling today?",
  "Hi! Just a quick hello from my end 😄",
  "Good day! Hope everything is going well.",
  "Hey, thinking of you. Hope all is good!",
  "Hi there! Any exciting plans today?",
  "Hello! Hope your day is going great.",
  "Hey! Just dropping by to say hi 🙌"
]

export const warmupReplies = [
  "I'm doing great, thanks for asking! 😊",
  "All good here! Hope you're well too.",
  "Thanks! Things are going well.",
  "Doing well! How about you?",
  "Great, thanks! Have a wonderful day!",
  "All good on my end. Thanks for checking in!",
  "Doing fantastic! Hope you are too 😊",
  "Pretty good! Thanks for asking.",
  "All well here! Hope the same for you.",
  "Good, thanks! You take care too!"
]

export function getRandomMessage() {
  return warmupMessagePool[
    Math.floor(Math.random() * warmupMessagePool.length)
  ]
}

export function getRandomReply() {
  return warmupReplies[
    Math.floor(Math.random() * warmupReplies.length)
  ]
}

export function getRandomDelay(min = 5000, max = 30000) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

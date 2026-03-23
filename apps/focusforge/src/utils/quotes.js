// 35 discipline-themed motivational quotes — no fluff
const QUOTES = [
  // Jocko Willink
  { text: "Discipline equals freedom.", author: "Jocko Willink" },
  { text: "Don't expect to be motivated every day. Get disciplined.", author: "Jocko Willink" },
  { text: "The more you practice, the better you get, the more freedom you have to create.", author: "Jocko Willink" },
  { text: "Get after it.", author: "Jocko Willink" },
  { text: "There is no easy way. There is only hard work, late nights, early mornings, practice, rehearsal, repetition, study, sweat, blood, toil, frustration, and discipline.", author: "Jocko Willink" },
  { text: "Default aggressive.", author: "Jocko Willink" },
  { text: "If you want to be tougher, be tougher.", author: "Jocko Willink" },
  
  // David Goggins
  { text: "Who's gonna carry the boats?", author: "David Goggins" },
  { text: "You are in danger of living a life so comfortable and soft that you will die without ever realizing your true potential.", author: "David Goggins" },
  { text: "Suffering is the true test of life.", author: "David Goggins" },
  { text: "Don't stop when you're tired. Stop when you're done.", author: "David Goggins" },
  { text: "The only person who was going to turn my life around was me.", author: "David Goggins" },
  { text: "We don't rise to the level of our expectations, we fall to the level of our training.", author: "David Goggins" },
  { text: "You gotta start your day off winning.", author: "David Goggins" },
  { text: "Calloused mind. That's the goal.", author: "David Goggins" },
  
  // Marcus Aurelius / Stoics
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius" },
  { text: "You have power over your mind — not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
  { text: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius" },
  { text: "The best revenge is not to be like your enemy.", author: "Marcus Aurelius" },
  { text: "We suffer more in imagination than in reality.", author: "Seneca" },
  { text: "It is not that we have a short time to live, but that we waste a great deal of it.", author: "Seneca" },
  { text: "Difficulty is what wakes up the genius.", author: "Nassim Taleb" },
  
  // Warriors / Athletes
  { text: "I fear not the man who has practiced 10,000 kicks once, but the man who has practiced one kick 10,000 times.", author: "Bruce Lee" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "The fight is won or lost far away from witnesses — behind the lines, in the gym, out there on the road, long before I dance under those lights.", author: "Muhammad Ali" },
  { text: "I don't count my sit-ups. I only start counting when it starts hurting.", author: "Muhammad Ali" },
  { text: "Obsessed is a word the lazy use to describe the dedicated.", author: "Grant Cardone" },
  
  // Focus / Work
  { text: "The successful warrior is the average man, with laser-like focus.", author: "Bruce Lee" },
  { text: "Until you value yourself, you won't value your time. Until you value your time, you will not do anything with it.", author: "M. Scott Peck" },
  { text: "Ordinary people seek entertainment. Extraordinary people seek education and learning.", author: "Benjamin Hardy" },
  { text: "Work hard in silence. Let success make the noise.", author: "Frank Ocean" },
  { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Arnold Schwarzenegger" },
  { text: "Stay hungry. Stay foolish.", author: "Steve Jobs" },
  { text: "Your mind is for having ideas, not holding them.", author: "David Allen" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "Do the hard work, especially when you don't feel like it.", author: "Hamza Ahmed" },
];

export const getRandomQuote = () => {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
};

export const getQuoteByIndex = (index) => {
  return QUOTES[index % QUOTES.length];
};

export default QUOTES;

// Mood validation
const VALID_MOODS = [
  "happy",
  "sad",
  "angry",
  "anxious",
  "neutral",
  "excited",
  "peaceful",
  "frustrated",
  "grateful",
  "hopeful"
];

export function validateMood(mood: string): boolean {
  return VALID_MOODS.includes(mood);
}

// Content validation
export function validateContent(content: string): boolean {
  return content.trim().length > 0 && content.length <= 1500;
}

// Tag validation
export function validateTags(tags: string[]): boolean {
  return tags.every(tag => tag.trim().length > 0 && tag.length <= 50);
}
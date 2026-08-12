// Static word data module for WordGraph
// Task 2 will replace this with Dexie-backed data without touching UI components.

export type RelationshipType = 'synonym' | 'antonym' | 'related';

export interface WordNode {
  word: string;
  type: RelationshipType;
}

export interface WordData {
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  definition: string;
  synonyms: string[];
  antonyms: string[];
  related: string[];
  examples: [string, string];
  memoryTrick: string;
  usage: string;
}

export interface GraphData {
  centre: string;
  nodes: WordNode[];
}

// ── Static word database ──────────────────────────────────────────────────────

export const WORD_DB: Record<string, WordData> = {
  pragmatic: {
    word: 'pragmatic',
    pronunciation: '/præɡˈmætɪk/',
    partOfSpeech: 'adjective',
    definition:
      'Dealing with things sensibly and realistically in a way that is based on practical rather than theoretical considerations.',
    synonyms: ['practical', 'realistic', 'sensible'],
    antonyms: ['idealistic', 'impractical'],
    related: ['strategy', 'decision', 'practicality', 'approach'],
    examples: [
      'She took a pragmatic approach to solving the budget crisis, focusing on solutions that could be implemented immediately.',
      'His pragmatic mindset meant he focused on what could actually be achieved rather than what was theoretically perfect.',
    ],
    memoryTrick:
      "Think of 'pragma' from the Greek word for 'deed' or 'act' — pragmatic people act on what works, not on what sounds ideal.",
    usage:
      'Often used to describe someone who prefers practical, workable solutions over idealistic or theoretical ones. Commonly appears in business, politics, and philosophy contexts.',
  },
  practical: {
    word: 'practical',
    pronunciation: '/ˈpræktɪkl/',
    partOfSpeech: 'adjective',
    definition:
      'Of or concerned with the actual doing or use of something rather than with theory and ideas; likely to succeed or be effective in real circumstances.',
    synonyms: ['pragmatic', 'sensible', 'realistic'],
    antonyms: ['impractical', 'idealistic', 'theoretical'],
    related: ['skill', 'application', 'implementation', 'function'],
    examples: [
      'She gave us practical advice that we could actually use the next day.',
      'The course offered a practical introduction to data analysis with real datasets.',
    ],
    memoryTrick:
      "Break it into 'practice' + '-al' — something practical is related to practice, to doing rather than just thinking.",
    usage:
      "Used to describe skills, solutions, or people that focus on real-world application. 'Practical' often emphasises usefulness, while 'pragmatic' emphasises adaptability.",
  },
  realistic: {
    word: 'realistic',
    pronunciation: '/ˌrɪəˈlɪstɪk/',
    partOfSpeech: 'adjective',
    definition:
      'Having or showing a sensible and practical idea of what can be achieved or expected; representing things in a way that is accurate and true to life.',
    synonyms: ['pragmatic', 'sensible', 'practical'],
    antonyms: ['idealistic', 'fanciful', 'unrealistic'],
    related: ['expectation', 'accuracy', 'honesty', 'assessment'],
    examples: [
      'We need to be realistic about how long this project will take.',
      'Her realistic portrayal of city life resonated with many readers.',
    ],
    memoryTrick:
      "Comes from 'real' — a realistic person keeps their feet planted firmly in reality.",
    usage:
      "Used to describe attitudes, expectations, or representations that align with reality. 'Realistic' often carries a slightly moderating connotation, as in tempering overly optimistic expectations.",
  },
  sensible: {
    word: 'sensible',
    pronunciation: '/ˈsɛnsɪbl/',
    partOfSpeech: 'adjective',
    definition:
      'Done or chosen in accordance with wisdom or prudence; likely to be of benefit; showing good sense or sound judgement.',
    synonyms: ['pragmatic', 'reasonable', 'practical'],
    antonyms: ['foolish', 'unwise', 'irrational'],
    related: ['judgement', 'wisdom', 'prudence', 'reason'],
    examples: [
      "It's sensible to save money for unexpected expenses.",
      'She made the sensible decision to get a second opinion before committing.',
    ],
    memoryTrick:
      "Shares its root with 'sense' — a sensible choice is one that just makes sense.",
    usage:
      "Often applied to decisions, choices, or advice. 'Sensible' implies moderation and reasonableness, sometimes contrasting with emotional or impulsive choices.",
  },
  idealistic: {
    word: 'idealistic',
    pronunciation: '/aɪˌdɪəˈlɪstɪk/',
    partOfSpeech: 'adjective',
    definition:
      'Having or showing high principles and ideals which may not be achievable in practice; guided more by ideals than by reality.',
    synonyms: ['visionary', 'utopian', 'naive'],
    antonyms: ['pragmatic', 'realistic', 'practical'],
    related: ['ideal', 'vision', 'aspiration', 'principle'],
    examples: [
      "His idealistic belief in universal justice drove his career as a human rights lawyer.",
      "Some called her plans idealistic; she called them ambitious.",
    ],
    memoryTrick:
      "Comes from 'ideal' — an idealistic person pursues the ideal, even when reality falls short.",
    usage:
      "Can carry both positive (inspiring, principled) and negative (naive, impractical) connotations depending on context. Antonym of pragmatic in philosophical and political discourse.",
  },
  impractical: {
    word: 'impractical',
    pronunciation: '/ɪmˈpræktɪkl/',
    partOfSpeech: 'adjective',
    definition:
      'Not adapted for use or action; not sensible or realistic; not capable of dealing sensibly with everyday matters.',
    synonyms: ['unrealistic', 'unworkable', 'idealistic'],
    antonyms: ['pragmatic', 'practical', 'workable'],
    related: ['inefficiency', 'complexity', 'theory', 'obstacle'],
    examples: [
      'The proposed solution was technically elegant but completely impractical to implement.',
      'Wearing high heels on a hiking trail is entirely impractical.',
    ],
    memoryTrick:
      "'Im-' means not, 'practical' means doable — impractical = not doable in practice.",
    usage:
      "Describes ideas, plans, or people that fail to account for real-world constraints. Often used to critique overly complex or theoretical approaches.",
  },
  strategy: {
    word: 'strategy',
    pronunciation: '/ˈstrætɪdʒi/',
    partOfSpeech: 'noun',
    definition:
      'A plan of action designed to achieve a long-term or overall aim; the art of planning and directing overall operations toward a goal.',
    synonyms: ['plan', 'approach', 'tactic'],
    antonyms: ['improvisation', 'spontaneity', 'chaos'],
    related: ['pragmatic', 'goal', 'planning', 'execution'],
    examples: [
      "The company's pragmatic strategy focused on sustainable growth rather than rapid expansion.",
      'A good strategy anticipates obstacles and builds in contingencies.',
    ],
    memoryTrick:
      "From the Greek 'strategos' (general) — a strategy is what a general uses to win a campaign.",
    usage:
      "Used broadly across business, military, sports, and everyday life. A 'strategy' is higher-level than a 'tactic', referring to the overarching plan rather than specific moves.",
  },
  decision: {
    word: 'decision',
    pronunciation: '/dɪˈsɪʒən/',
    partOfSpeech: 'noun',
    definition:
      'A conclusion or resolution reached after consideration; the action or process of deciding something or of resolving a question.',
    synonyms: ['choice', 'resolution', 'verdict'],
    antonyms: ['indecision', 'hesitation', 'ambivalence'],
    related: ['pragmatic', 'judgement', 'option', 'consequence'],
    examples: [
      'Making pragmatic decisions requires balancing ideal outcomes with real constraints.',
      'The decision to pivot the product saved the company from failure.',
    ],
    memoryTrick:
      "From Latin 'decidere' (to cut off) — making a decision cuts off other possibilities.",
    usage:
      "Central to both everyday conversation and formal contexts (legal, medical, business). 'Decision-making' as a compound noun refers to the entire process.",
  },
  practicality: {
    word: 'practicality',
    pronunciation: '/ˌpræktɪˈkælɪti/',
    partOfSpeech: 'noun',
    definition:
      'The quality or state of being practical; the aspects of a situation that involve the actual doing or experience of something rather than theories or ideas.',
    synonyms: ['pragmatism', 'feasibility', 'workability'],
    antonyms: ['impracticality', 'idealism', 'abstraction'],
    related: ['pragmatic', 'efficiency', 'function', 'application'],
    examples: [
      'The practicality of the design was tested in real user scenarios.',
      'Questions of practicality must be weighed against questions of principle.',
    ],
    memoryTrick:
      "The noun form of 'practical' — practicality is the quality of being practical.",
    usage:
      "Often used when evaluating whether something works in the real world. 'Questions of practicality' is a common phrase in policy and design contexts.",
  },
  approach: {
    word: 'approach',
    pronunciation: '/əˈprəʊtʃ/',
    partOfSpeech: 'noun',
    definition:
      'A way of dealing with a situation or problem; a method used for handling or undertaking something; the way one goes about doing something.',
    synonyms: ['method', 'strategy', 'technique'],
    antonyms: ['avoidance', 'neglect', 'evasion'],
    related: ['pragmatic', 'solution', 'process', 'framework'],
    examples: [
      'A pragmatic approach to the problem yielded faster results than theoretical analysis.',
      'Different teams adopted different approaches to the same challenge.',
    ],
    memoryTrick:
      "'Approach' literally means to come close to something — your approach is how you get close to solving the problem.",
    usage:
      "Extremely versatile word used across all domains. As a verb, it means to come near; as a noun, it means a method or angle of attack on a problem.",
  },
  ephemeral: {
    word: 'ephemeral',
    pronunciation: '/ɪˈfɛmərəl/',
    partOfSpeech: 'adjective',
    definition:
      'Lasting for a very short time; transitory; lasting only a short day or a few days.',
    synonyms: ['transient', 'fleeting', 'momentary'],
    antonyms: ['permanent', 'enduring', 'lasting'],
    related: ['time', 'memory', 'change', 'impermanence'],
    examples: [
      'Social media stories are designed to be ephemeral, disappearing after 24 hours.',
      'The ephemeral beauty of cherry blossoms is part of what makes them so prized.',
    ],
    memoryTrick:
      "From Greek 'ephemeros' (lasting only a day) — think of a mayfly that lives for a single day.",
    usage:
      "Used in both literal and metaphorical senses. In digital contexts, refers to content or tokens that expire. In art and literature, captures the beauty of transience.",
  },
  eloquent: {
    word: 'eloquent',
    pronunciation: '/ˈɛləkwənt/',
    partOfSpeech: 'adjective',
    definition:
      'Fluent or persuasive in speaking or writing; clearly expressing or indicating something; having or exercising the power of fluent, forceful, and appropriate speech.',
    synonyms: ['articulate', 'fluent', 'persuasive'],
    antonyms: ['inarticulate', 'halting', 'clumsy'],
    related: ['rhetoric', 'language', 'communication', 'expression'],
    examples: [
      'Her eloquent speech moved the audience to tears.',
      'The poem was an eloquent expression of grief and hope intertwined.',
    ],
    memoryTrick:
      "From Latin 'eloqui' (to speak out) — an eloquent speaker speaks out with power and beauty.",
    usage:
      "Describes both people (an eloquent speaker) and things (an eloquent gesture). A slightly formal word, often used to praise exceptional communication.",
  },
};

// ── Graph builder ─────────────────────────────────────────────────────────────

export function buildGraphData(centreWord: string): GraphData {
  const key = centreWord.toLowerCase();
  const data = WORD_DB[key];

  if (!data) {
    // Word not in DB — return a minimal graph
    return {
      centre: centreWord,
      nodes: [],
    };
  }

  const nodes: WordNode[] = [
    ...data.synonyms.map((w) => ({ word: w, type: 'synonym' as const })),
    ...data.antonyms.map((w) => ({ word: w, type: 'antonym' as const })),
    ...data.related.map((w) => ({ word: w, type: 'related' as const })),
  ];

  return { centre: centreWord, nodes };
}

// ── Suggestion words (homepage chips) ─────────────────────────────────────────

export const SUGGESTION_WORDS = ['pragmatic', 'ephemeral', 'eloquent'];

// ── localStorage helpers (Task 2 will replace with Dexie) ────────────────────

const RECENT_WORDS_KEY = 'wg_recent_words';
const SAVED_WORDS_KEY = 'wg_saved_words';

export function getRecentWords(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_WORDS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addRecentWord(word: string): void {
  try {
    const recent = getRecentWords().filter(
      (w) => w.toLowerCase() !== word.toLowerCase(),
    );
    recent.unshift(word.toLowerCase());
    localStorage.setItem(
      RECENT_WORDS_KEY,
      JSON.stringify(recent.slice(0, 10)),
    );
  } catch {
    /* ignore */
  }
}

export function getSavedWords(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_WORDS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function isWordSaved(word: string): boolean {
  return getSavedWords().includes(word.toLowerCase());
}

export function toggleSavedWord(word: string): boolean {
  try {
    const saved = getSavedWords();
    const key = word.toLowerCase();
    const idx = saved.indexOf(key);
    if (idx === -1) {
      saved.unshift(key);
    } else {
      saved.splice(idx, 1);
    }
    localStorage.setItem(SAVED_WORDS_KEY, JSON.stringify(saved));
    return idx === -1; // returns true if now saved
  } catch {
    return false;
  }
}

/**
 * Skill Taxonomy and Normalization Module
 * Adapted & expanded from JaweriaAsif745/Resume-github-job-analyzer under MIT License.
 */

export type SkillCategory =
  | 'languages'
  | 'frontend'
  | 'backend'
  | 'databases'
  | 'apis_architecture'
  | 'cloud_devops'
  | 'ai_ml'
  | 'data_engineering'
  | 'testing_practices';

export interface SkillDefinition {
  canonical: string;
  category: SkillCategory;
  aliases: string[];
  description?: string;
  isMultiWord?: boolean;
}

export const SKILL_TAXONOMY: SkillDefinition[] = [
  // Programming Languages
  { canonical: 'JavaScript', category: 'languages', aliases: ['js', 'ecmascript', 'vanilla js'] },
  { canonical: 'TypeScript', category: 'languages', aliases: ['ts'] },
  { canonical: 'Python', category: 'languages', aliases: ['py', 'python3', 'python2'] },
  { canonical: 'Java', category: 'languages', aliases: ['core java', 'java 8', 'java 11', 'java 17'] },
  { canonical: 'C++', category: 'languages', aliases: ['cpp', 'c plus plus'] },
  { canonical: 'C', category: 'languages', aliases: ['ansi c', 'c language'] },
  { canonical: 'C#', category: 'languages', aliases: ['csharp', 'c sharp', '.net c#'] },
  { canonical: 'Go', category: 'languages', aliases: ['golang'] },
  { canonical: 'Rust', category: 'languages', aliases: ['rustlang'] },
  { canonical: 'Ruby', category: 'languages', aliases: ['ruby lang'] },
  { canonical: 'PHP', category: 'languages', aliases: ['php7', 'php8'] },
  { canonical: 'Swift', category: 'languages', aliases: ['swiftlang', 'apple swift'] },
  { canonical: 'Kotlin', category: 'languages', aliases: ['kt', 'kotlinlang'] },
  { canonical: 'SQL', category: 'languages', aliases: ['structured query language', 'ansi sql'] },
  { canonical: 'HTML', category: 'languages', aliases: ['html5'] },
  { canonical: 'CSS', category: 'languages', aliases: ['css3'] },
  { canonical: 'Bash', category: 'languages', aliases: ['shell', 'sh', 'shell scripting', 'bash script'] },

  // Frontend Frameworks & Libraries
  { canonical: 'React', category: 'frontend', aliases: ['reactjs', 'react.js'] },
  { canonical: 'Next.js', category: 'frontend', aliases: ['nextjs', 'next'] },
  { canonical: 'Vue.js', category: 'frontend', aliases: ['vue', 'vuejs', 'vue 3'] },
  { canonical: 'Angular', category: 'frontend', aliases: ['angularjs', 'angular 2+'] },
  { canonical: 'Svelte', category: 'frontend', aliases: ['sveltekit'] },
  { canonical: 'Tailwind CSS', category: 'frontend', aliases: ['tailwind', 'tailwindcss'], isMultiWord: true },
  { canonical: 'Redux', category: 'frontend', aliases: ['redux toolkit', 'rtk'] },

  // Backend Frameworks
  { canonical: 'Node.js', category: 'backend', aliases: ['node', 'nodejs'] },
  { canonical: 'Express.js', category: 'backend', aliases: ['express', 'expressjs'] },
  { canonical: 'FastAPI', category: 'backend', aliases: ['fast api'] },
  { canonical: 'Django', category: 'backend', aliases: ['django rest framework', 'drf'] },
  { canonical: 'Flask', category: 'backend', aliases: ['flask framework'] },
  { canonical: 'Spring Boot', category: 'backend', aliases: ['spring', 'springboot'], isMultiWord: true },
  { canonical: 'NestJS', category: 'backend', aliases: ['nest', 'nest.js'] },
  { canonical: 'Ruby on Rails', category: 'backend', aliases: ['rails', 'ror'], isMultiWord: true },
  { canonical: 'ASP.NET', category: 'backend', aliases: ['asp.net core', 'dotnet core', '.net core'] },

  // Databases & SQL
  { canonical: 'PostgreSQL', category: 'databases', aliases: ['postgres', 'pgsql'] },
  { canonical: 'MySQL', category: 'databases', aliases: ['my sql'] },
  { canonical: 'MongoDB', category: 'databases', aliases: ['mongo'] },
  { canonical: 'Redis', category: 'databases', aliases: ['redis cache'] },
  { canonical: 'SQLite', category: 'databases', aliases: ['sqlite3'] },
  { canonical: 'Supabase', category: 'databases', aliases: ['supabase db'] },
  { canonical: 'Firebase', category: 'databases', aliases: ['firestore', 'firebase realtime'] },
  { canonical: 'Cassandra', category: 'databases', aliases: ['apache cassandra'] },
  { canonical: 'DynamoDB', category: 'databases', aliases: ['aws dynamodb'] },
  { canonical: 'Elasticsearch', category: 'databases', aliases: ['elastic search', 'elk'] },

  // APIs & Architecture
  { canonical: 'REST API', category: 'apis_architecture', aliases: ['restful', 'rest', 'rest apis', 'restful api', 'restful services'], isMultiWord: true },
  { canonical: 'GraphQL', category: 'apis_architecture', aliases: ['gql', 'apollo graphql'] },
  { canonical: 'gRPC', category: 'apis_architecture', aliases: ['grpc protocol', 'protobuf'] },
  { canonical: 'WebSockets', category: 'apis_architecture', aliases: ['websocket', 'socket.io'] },
  { canonical: 'Microservices', category: 'apis_architecture', aliases: ['microservice architecture', 'micro services'] },
  { canonical: 'Event-Driven Architecture', category: 'apis_architecture', aliases: ['event driven', 'eda', 'kafka', 'rabbitmq'], isMultiWord: true },

  // Cloud & DevOps
  { canonical: 'Docker', category: 'cloud_devops', aliases: ['docker compose', 'containerization'] },
  { canonical: 'Kubernetes', category: 'cloud_devops', aliases: ['k8s'] },
  { canonical: 'AWS', category: 'cloud_devops', aliases: ['amazon web services', 'ec2', 's3', 'lambda'] },
  { canonical: 'GCP', category: 'cloud_devops', aliases: ['google cloud', 'google cloud platform'] },
  { canonical: 'Azure', category: 'cloud_devops', aliases: ['microsoft azure'] },
  { canonical: 'CI/CD', category: 'cloud_devops', aliases: ['continuous integration', 'cicd', 'github actions', 'jenkins', 'gitlab ci'], isMultiWord: true },
  { canonical: 'Terraform', category: 'cloud_devops', aliases: ['infrastructure as code', 'iac'] },
  { canonical: 'Linux', category: 'cloud_devops', aliases: ['unix', 'ubuntu', 'debian'] },
  { canonical: 'Git', category: 'cloud_devops', aliases: ['github', 'git version control', 'version control'] },
  { canonical: 'Nginx', category: 'cloud_devops', aliases: ['reverse proxy'] },

  // AI & Machine Learning
  { canonical: 'Machine Learning', category: 'ai_ml', aliases: ['ml', 'machine-learning'], isMultiWord: true },
  { canonical: 'Deep Learning', category: 'ai_ml', aliases: ['neural networks', 'dl'], isMultiWord: true },
  { canonical: 'PyTorch', category: 'ai_ml', aliases: ['torch'] },
  { canonical: 'TensorFlow', category: 'ai_ml', aliases: ['tf', 'keras'] },
  { canonical: 'Scikit-Learn', category: 'ai_ml', aliases: ['sklearn', 'scikit learn'] },
  { canonical: 'Natural Language Processing', category: 'ai_ml', aliases: ['nlp', 'text processing'], isMultiWord: true },
  { canonical: 'Computer Vision', category: 'ai_ml', aliases: ['cv', 'opencv', 'image processing'], isMultiWord: true },
  { canonical: 'LLM & Generative AI', category: 'ai_ml', aliases: ['large language models', 'llm', 'generative ai', 'genai', 'langchain', 'huggingface'], isMultiWord: true },

  // Data Engineering & Analysis
  { canonical: 'Pandas', category: 'data_engineering', aliases: ['pandas library'] },
  { canonical: 'NumPy', category: 'data_engineering', aliases: ['numpy array'] },
  { canonical: 'Data Structures & Algorithms', category: 'data_engineering', aliases: ['dsa', 'data structures', 'algorithms'], isMultiWord: true },
  { canonical: 'Apache Spark', category: 'data_engineering', aliases: ['spark', 'pyspark'], isMultiWord: true },

  // Testing & Engineering Practices
  { canonical: 'Unit Testing', category: 'testing_practices', aliases: ['unit tests', 'tdd', 'test driven development'], isMultiWord: true },
  { canonical: 'Jest', category: 'testing_practices', aliases: ['jestjs'] },
  { canonical: 'Vitest', category: 'testing_practices', aliases: ['vite test'] },
  { canonical: 'Pytest', category: 'testing_practices', aliases: ['python pytest'] },
  { canonical: 'Cypress', category: 'testing_practices', aliases: ['cypress.io', 'e2e testing'] },
];

/**
 * Builds alias lookup index for instant O(1) canonicalization.
 */
const aliasMap = new Map<string, SkillDefinition>();
const multiWordSkills: SkillDefinition[] = [];

for (const skill of SKILL_TAXONOMY) {
  aliasMap.set(skill.canonical.toLowerCase(), skill);
  for (const alias of skill.aliases) {
    aliasMap.set(alias.toLowerCase(), skill);
  }
  if (skill.isMultiWord || skill.canonical.includes(' ') || skill.canonical.includes('-')) {
    multiWordSkills.push(skill);
  }
}

// Sort multiword skills descending by length to match longest multi-word matches first
multiWordSkills.sort((a, b) => b.canonical.length - a.canonical.length);

/**
 * Normalize any input string to canonical skill name or return null if unknown.
 */
export function normalizeSkill(input: string): string | null {
  if (!input) return null;
  const clean = input.trim().toLowerCase().replace(/[^\w\s+#.-]/g, ' ');
  const singleSpaced = clean.replace(/\s+/g, ' ').trim();
  
  const found = aliasMap.get(singleSpaced);
  if (found) return found.canonical;

  // Direct lookup without trailing dots or dashes
  const stripped = singleSpaced.replace(/[.-]+$/, '');
  const foundStripped = aliasMap.get(stripped);
  if (foundStripped) return foundStripped.canonical;

  return null;
}

/**
 * Extract canonical skills from raw text (job description, resume, repo topic/description).
 */
export function extractSkillsFromText(text: string): {
  skills: string[];
  categorized: Record<SkillCategory, string[]>;
} {
  if (!text) {
    return { skills: [], categorized: createEmptyCategorized() };
  }

  const foundSet = new Set<string>();
  const lowerText = ` ${text.toLowerCase().replace(/[^\w\s+#.-]/g, ' ')} `;

  // 1. First search multi-word expressions and aliases
  for (const def of SKILL_TAXONOMY) {
    const searchTerms = [def.canonical, ...def.aliases];
    for (const term of searchTerms) {
      const normalizedTerm = term.toLowerCase();
      // Look for exact word boundary
      const escaped = normalizedTerm.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const pattern = new RegExp(`(?:^|\\s|[,;.:/])${escaped}(?:$|\\s|[,;.:/])`, 'i');
      if (pattern.test(lowerText)) {
        foundSet.add(def.canonical);
        break;
      }
    }
  }

  const skills = Array.from(foundSet).sort();
  const categorized = createEmptyCategorized();

  for (const s of skills) {
    const def = SKILL_TAXONOMY.find((item) => item.canonical === s);
    if (def) {
      categorized[def.category].push(s);
    }
  }

  return { skills, categorized };
}

function createEmptyCategorized(): Record<SkillCategory, string[]> {
  return {
    languages: [],
    frontend: [],
    backend: [],
    databases: [],
    apis_architecture: [],
    cloud_devops: [],
    ai_ml: [],
    data_engineering: [],
    testing_practices: [],
  };
}

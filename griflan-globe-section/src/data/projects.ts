export interface Project {
  slug: string
  name: string
  category: string
  tagline: string
  /** Optional real thumbnails (6 per project). When omitted, placeholder art is generated. */
  images?: string[]
  /** Optional palette override: [background, foreground, accent]. */
  palette?: [string, string, string]
}

export const PALETTES: [string, string, string][] = [
  ['#1b1a2e', '#fffddb', '#ff3831'],
  ['#f5e6c8', '#1a1a1a', '#e5533d'],
  ['#0d3b2e', '#e9f5e1', '#8ee04a'],
  ['#ffd23f', '#1a1a1a', '#1f4bd8'],
  ['#2a1b3d', '#f3e9ff', '#c084fc'],
  ['#0b2545', '#eef4ff', '#5dd9ff'],
  ['#ff5c39', '#fff5ea', '#1a1a1a'],
  ['#efe9e1', '#2b2b2b', '#b84a2a'],
  ['#101010', '#f2f2f2', '#ffd23f'],
  ['#143d59', '#f4f6f8', '#f2b134'],
  ['#e8f0e1', '#1f3b22', '#f26b3a'],
  ['#2b2b2b', '#fffddb', '#67e8f9'],
]

export const PROJECTS: Project[] = [
  { slug: 'stackline', name: 'Stackline', category: 'SaaS', tagline: 'Documents that file themselves.' },
  { slug: 'postbird', name: 'Postbird', category: 'B2C', tagline: 'Mail, minus the mailroom.' },
  { slug: 'velo', name: 'Velo Ops', category: 'Outsourcing', tagline: 'Teams on demand.' },
  { slug: 'rootfinder', name: 'Rootfinder', category: 'B2C', tagline: 'A retirement roadmap for everyone.' },
  { slug: 'minnow', name: 'Minnow', category: 'A.I.', tagline: 'Do what moves you.' },
  { slug: 'upcart', name: 'Upcart', category: 'SaaS', tagline: 'Retail intelligence.' },
  { slug: 'inrev', name: 'In Revenue', category: 'Venture Capital', tagline: 'Capital that compounds.' },
  { slug: 'prosupp', name: 'Pro Supply', category: 'E-Commerce', tagline: 'Hyde Xtreme.' },
  { slug: 'engen', name: 'New Engine', category: 'Marketing', tagline: 'Growth, engineered.' },
  { slug: 'welch', name: 'S. Welch', category: 'Education', tagline: 'Become you.' },
  { slug: 'everest', name: 'Everest ERP', category: 'SaaS', tagline: 'Run the whole mountain.' },
  { slug: 'elevate', name: 'Elevate', category: 'Home Warranty', tagline: 'Protection, lifted.' },
  { slug: 'pathways', name: 'Five Pathways', category: 'Finance', tagline: 'Five ways forward.' },
  { slug: 'vandough', name: 'Van Dough', category: 'Art', tagline: 'Collected, not created.' },
  { slug: 'armadillo', name: 'Armadillo', category: 'Home Warranty', tagline: 'Hard shell, soft landing.' },
  { slug: 'happyface', name: 'HappyFace', category: 'E-Commerce', tagline: 'Smile, shipped.' },
  { slug: 'dogelon', name: 'Dogelon', category: 'Blockchain', tagline: 'To Mars.' },
  { slug: 'dashq', name: 'DashQ', category: 'SaaS', tagline: 'Leasing, in a dash.' },
  { slug: 'mew', name: 'Mew', category: 'Blockchain', tagline: 'Cat coin.' },
  { slug: 'handwrit', name: 'Handwrit', category: 'B2C', tagline: 'Robots that write by hand.' },
  { slug: 'brainsave', name: 'Brainsave', category: 'A.I.', tagline: 'Remember everything.' },
  { slug: 'clydel', name: 'Cly-Del', category: 'Manufacturing', tagline: 'Precision since 1939.' },
  { slug: 'barrow', name: 'Barrow Street', category: 'Education', tagline: 'Where curiosity starts.' },
  { slug: 'hugo', name: 'Hugo', category: 'Outsourcing', tagline: 'Support, humanised.' },
  { slug: 'altgage', name: 'Altgage', category: 'Real Estate', tagline: 'Mortgage on your terms.' },
  { slug: 'openhome', name: 'Open Home', category: 'A.I.', tagline: 'Your house, listening.' },
  { slug: 'portal', name: 'Portal', category: 'Blockchain', tagline: 'Bridge hits 65k users.' },
  { slug: 'shardeum', name: 'Shardeum', category: 'Blockchain', tagline: 'Infinitely scalable.' },
  { slug: 'mindjoin', name: 'MindJoin', category: 'B2B', tagline: 'Minds, joined.' },
  { slug: 'saffron', name: 'Saffron', category: 'Venture Capital', tagline: 'Rare, valuable.' },
  { slug: 'ultrared', name: 'Ultra Red', category: 'Cyber Security', tagline: 'See what attackers see.' },
  { slug: 'flatiron', name: 'Flatiron Sports', category: 'Venture Capital', tagline: 'Game on.' },
  { slug: 'fountain', name: 'Fountain', category: 'Healthcare', tagline: 'Care that flows.' },
  { slug: 'geneva', name: 'Geneva Med', category: 'Healthcare', tagline: 'Precision medicine.' },
]

export const TICKER_ITEMS = [
  'Portal bridge hits 65k users',
  'Minnow raises $47 million in Series B',
  'Everest ERP launches v3',
  'Stackline named top SaaS of the year',
  'Ultra Red expands to EMEA',
  'DashQ partners with 200 property groups',
]

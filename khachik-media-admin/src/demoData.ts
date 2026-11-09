import type { Category, Project } from './api'

const titles: Array<{
  slug: string
  title: string
  client: string
  category: Category
  published: boolean
}> = [
  {
    slug: 'bluorng-x-playboy',
    title: 'Bluorng X Playboy',
    client: 'Bluorng X Playboy Global',
    category: 'promotional',
    published: true,
  },
  {
    slug: 'ultrahuman-abu-dhabi',
    title: 'Ultrahuman Abu Dhabi',
    client: 'Ultrahuman',
    category: 'promotional',
    published: true,
  },
  {
    slug: 'pepsi-sri-lanka',
    title: 'Pepsi Sri Lanka',
    client: 'Pepsi',
    category: 'corporate',
    published: true,
  },
  {
    slug: 'puma-launch',
    title: 'Puma Launch',
    client: 'Puma',
    category: 'advertisements',
    published: true,
  },
  {
    slug: 'swiggy-nights',
    title: 'Swiggy Nights',
    client: 'Swiggy',
    category: 'short-forms',
    published: false,
  },
  {
    slug: 'new-balance-run',
    title: 'New Balance Run',
    client: 'New Balance',
    category: 'promotional',
    published: true,
  },
  {
    slug: 'snitch-drop',
    title: 'Snitch Drop',
    client: 'Snitch',
    category: 'advertisements',
    published: true,
  },
  {
    slug: 'samay-raina-live',
    title: 'Samay Raina Live',
    client: 'Samay Raina',
    category: 'corporate',
    published: false,
  },
]

export const DEMO_PROJECTS: Project[] = titles.map((item, index) => ({
  id: `demo-${index + 1}`,
  slug: item.slug,
  title: item.title,
  date: 'Oct, 2024',
  year: '2024',
  client: item.client,
  service: 'End to End Content Production',
  category: item.category,
  description: ['Local demo project — connect the API for real data.'],
  coverUrl: null,
  coverType: null,
  heroUrl: null,
  heroType: null,
  published: item.published,
  sortOrder: index + 1,
  gallery: [],
}))

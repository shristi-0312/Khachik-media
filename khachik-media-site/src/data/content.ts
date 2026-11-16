export type Category = 'promotional' | 'advertisements' | 'short-forms'

export type MediaType = 'image' | 'video'

export type GallerySlot =
  | 'full'
  | 'pair-1'
  | 'pair-2'
  | 'triple-1'
  | 'triple-2'
  | 'triple-3'

export type GalleryItem = {
  slot: GallerySlot
  mediaType: MediaType
  url: string
}

export type Project = {
  slug: string
  title: string
  date: string
  year: string
  client: string
  service: string
  category: Category
  description: string[]
  /** Optional — filled when loaded from the admin API / CDN. */
  coverUrl?: string | null
  coverType?: MediaType | null
  heroUrl?: string | null
  heroType?: MediaType | null
  gallery?: GalleryItem[]
}

/** Films filters — Short-forms / Promotional / Advertisements. */
export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'short-forms', label: 'Short-forms' },
  { id: 'promotional', label: 'Promotional Events' },
  { id: 'advertisements', label: 'Advertisements' },
]

export const ABOUT_BODY = [
  'Khachik Media is a production house for corporate events, artist events and short-form content. We help brands turn moments into stories their audience remembers and shares.',
  'Our edge is how we work on the ground. We know how to put people at ease, from CEOs and performers to the crowd and the people around them. The result is footage that feels natural, warm and real, not staged. And because we’ve built our own audience online, every edit is shaped to hold attention from the first second.',
  'Brands like Bluorng, Puma, New Balance, Pepsi Sri Lanka, Swiggy and Snitch, along with artists like Samay Raina, have trusted us to capture their biggest moments.',
  'Whether it’s a launch, a live show or a content series, we bring the same promise: stories with heart, built to perform.',
]

export const PROJECTS: Project[] = [
  {
    slug: 'bluorng-x-playboy',
    title: 'Bluorng X Playboy',
    date: 'Oct, 2024',
    year: '2024',
    client: 'Bluorng X Playboy Global',
    service: 'End to End Content Production',
    category: 'promotional',
    description: [
      "We had the exciting opportunity to shoot, edit, and produce the PLAYBOY X BLUORNG campaign, merging PLAYBOY's iconic style with BLUORNG’s bold, contemporary edge. From the high-energy shoot to the final polished edit, every step was meticulously crafted to create a visually striking, seamless fusion of both brands’ unique vibes.",
      'We handled photography, videography, and complete end-to-end campaign production, bringing the vision to life across every frame. The result is a campaign that perfectly captures the essence of both worlds, bold and unforgettable.',
    ],
  },
  {
    slug: 'ultrahuman-abu-dhabi',
    title: 'Ultrahuman Abu Dhabi',
    date: 'Oct, 2024',
    year: '2024',
    client: 'Ultrahuman',
    service: 'End to End Content Production',
    category: 'promotional',
    description: [
      'We captured Ultrahuman’s Abu Dhabi moment end to end — from on-ground coverage to polished edits built to hold attention from the first second.',
      'The result is footage that feels natural, warm and real, shaped for brands and audiences who expect stories with heart.',
    ],
  },
  {
    slug: 'pepsi-sri-lanka',
    title: 'Pepsi Sri Lanka',
    date: 'Oct, 2024',
    year: '2024',
    client: 'Pepsi',
    service: 'Event Film',
    category: 'promotional',
    description: [
      'Khachik Media created event films for Pepsi Sri Lanka that feel human and hold attention from the first frame.',
    ],
  },
  {
    slug: 'puma-launch',
    title: 'Puma Launch',
    date: 'Jun, 2024',
    year: '2024',
    client: 'Puma',
    service: 'Brand Content',
    category: 'advertisements',
    description: [
      'Launch coverage and short-form edits shaped for social performance and brand recall.',
    ],
  },
  {
    slug: 'swiggy-nights',
    title: 'Swiggy Nights',
    date: 'Mar, 2024',
    year: '2024',
    client: 'Swiggy',
    service: 'Short-form Series',
    category: 'short-forms',
    description: [
      'A short-form series built to hold attention — sharp hooks, warm presence, and edits tuned for sharing.',
    ],
    heroUrl: '/media/reel-1.mp4',
    heroType: 'video',
  },
  {
    slug: 'new-balance-run',
    title: 'New Balance Run',
    date: 'Jan, 2025',
    year: '2025',
    client: 'New Balance',
    service: 'Event Coverage',
    category: 'promotional',
    description: [
      'On-ground coverage that puts people at ease and turns a live moment into a story the audience remembers.',
    ],
  },
  {
    slug: 'snitch-drop',
    title: 'Snitch Drop',
    date: 'Nov, 2024',
    year: '2024',
    client: 'Snitch',
    service: 'Campaign Production',
    category: 'advertisements',
    description: [
      'End-to-end campaign production for a drop that needed pace, personality, and polish.',
    ],
  },
  {
    slug: 'samay-raina-live',
    title: 'Samay Raina Live',
    date: 'Aug, 2024',
    year: '2024',
    client: 'Samay Raina',
    service: 'Artist Event',
    category: 'promotional',
    description: [
      'Artist event coverage with natural, warm footage that holds attention online and offline.',
    ],
  },
]

export const TESTIMONIALS = [
  {
    quote:
      'We needed a steady stream of reels for our launch month, and Khachik delivered every week without us having to chase. Sharp edits, strong hooks, and they understood our brand from the first brief.',
    name: 'Manish M.',
    role: 'Founder, Big 6',
  },
]

export function getProject(slug: string) {
  return PROJECTS.find((p) => p.slug === slug)
}

export function getNextProject(slug: string) {
  const i = PROJECTS.findIndex((p) => p.slug === slug)
  if (i < 0) return PROJECTS[0]
  return PROJECTS[(i + 1) % PROJECTS.length]
}

/** Compact looping reels painted onto the home globe tiles. */
export const MEDIA_REELS = [
  '/media/small/reel-1.mp4',
  '/media/small/reel-2.mp4',
  '/media/small/reel-3.mp4',
  '/media/small/reel-4.mp4',
  '/media/small/reel-5.mp4',
  '/media/small/reel-6.mp4',
  '/media/small/reel-7.mp4',
  '/media/small/reel-8.mp4',
  '/media/small/reel-9.mp4',
  '/media/small/reel-10.mp4',
  '/media/small/reel-11.mp4',
  '/media/small/reel-12.mp4',
  '/media/small/reel-13.mp4',
  '/media/small/reel-14.mp4',
] as const

/** Higher-quality reel kept only for the Swiggy project detail page. */
export const DETAIL_REEL = '/media/reel-1.mp4'

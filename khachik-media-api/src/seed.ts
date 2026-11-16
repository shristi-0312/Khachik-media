import bcrypt from 'bcryptjs'
import { config } from './config.js'
import { prisma } from './db.js'
import { CATEGORY_DB_MAP } from './types.js'

const SEED_PROJECTS = [
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
    description: ['Launch coverage and short-form edits shaped for social performance and brand recall.'],
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
    description: ['End-to-end campaign production for a drop that needed pace, personality, and polish.'],
  },
  {
    slug: 'samay-raina-live',
    title: 'Samay Raina Live',
    date: 'Aug, 2024',
    year: '2024',
    client: 'Samay Raina',
    service: 'Artist Event',
    category: 'promotional',
    description: ['Artist event coverage with natural, warm footage that holds attention online and offline.'],
  },
] as const

async function main() {
  const passwordHash = await bcrypt.hash(config.adminPassword, 12)
  await prisma.adminUser.upsert({
    where: { email: config.adminEmail },
    update: { passwordHash },
    create: { email: config.adminEmail, passwordHash },
  })

  for (let i = 0; i < SEED_PROJECTS.length; i += 1) {
    const p = SEED_PROJECTS[i]
    await prisma.project.upsert({
      where: { slug: p.slug },
      update: {
        title: p.title,
        date: p.date,
        year: p.year,
        client: p.client,
        service: p.service,
        category: CATEGORY_DB_MAP[p.category],
        description: [...p.description],
        published: true,
        sortOrder: i,
      },
      create: {
        slug: p.slug,
        title: p.title,
        date: p.date,
        year: p.year,
        client: p.client,
        service: p.service,
        category: CATEGORY_DB_MAP[p.category],
        description: [...p.description],
        published: true,
        sortOrder: i,
      },
    })
  }

  console.log(`Seeded admin ${config.adminEmail} and ${SEED_PROJECTS.length} projects`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

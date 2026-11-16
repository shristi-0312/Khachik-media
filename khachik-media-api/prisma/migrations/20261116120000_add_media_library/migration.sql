-- CreateEnum
CREATE TYPE "MediaSection" AS ENUM (
  'films_short_forms',
  'films_promotional',
  'films_advertisements',
  'stills',
  'globe_horizontal',
  'globe_vertical'
);

-- CreateTable
CREATE TABLE "MediaItem" (
    "id" TEXT NOT NULL,
    "section" "MediaSection" NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "dateLabel" TEXT NOT NULL DEFAULT '',
    "mediaType" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaItem_section_sortOrder_idx" ON "MediaItem"("section", "sortOrder");

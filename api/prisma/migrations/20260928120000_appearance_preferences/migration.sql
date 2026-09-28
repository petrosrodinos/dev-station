-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN     "accent_color" TEXT,
ADD COLUMN     "font_family" TEXT NOT NULL DEFAULT 'inter',
ADD COLUMN     "font_size" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN     "mono_font_family" TEXT NOT NULL DEFAULT 'jetbrains-mono',
ADD COLUMN     "theme_preset" TEXT NOT NULL DEFAULT 'default';

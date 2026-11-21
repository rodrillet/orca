// orca-fork: a department's mark: its icon on its color, like agentes.chat's setor mark.
import React from 'react'
import {
  BookOpen,
  Briefcase,
  Building2,
  ChartColumn,
  Code,
  FlaskConical,
  Headset,
  Megaphone,
  Palette,
  Rocket,
  Scale,
  Shield,
  Truck,
  Users,
  Wallet,
  Wrench,
  type LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/class-names'
import {
  DEFAULT_BOT_AVATAR_COLOR,
  isDarkBotAvatarColor
} from '../../../../../shared/bots/bot-avatar-color'
import type {
  DepartmentIcon,
  DepartmentProfile
} from '../../../../../shared/orca-fork/departments/department-profile'

// The mark sits on the owner's own color, so its icon takes the light or dark ink of the swatches.
const LIGHT_INK = '#ffffff'
const DARK_INK = '#1f2126'

export const DEPARTMENT_ICON_COMPONENTS: Record<DepartmentIcon, LucideIcon> = {
  building: Building2,
  briefcase: Briefcase,
  code: Code,
  megaphone: Megaphone,
  headset: Headset,
  chart: ChartColumn,
  wallet: Wallet,
  scale: Scale,
  palette: Palette,
  flask: FlaskConical,
  shield: Shield,
  truck: Truck,
  users: Users,
  rocket: Rocket,
  book: BookOpen,
  wrench: Wrench
}

export function DepartmentMark({
  profile,
  className
}: {
  profile: Pick<DepartmentProfile, 'color' | 'icon'>
  className?: string
}): React.JSX.Element {
  const color = profile.color ?? DEFAULT_BOT_AVATAR_COLOR
  const Icon = DEPARTMENT_ICON_COMPONENTS[profile.icon ?? 'building']
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-6 shrink-0 items-center justify-center rounded-md',
        className
      )}
      // A department's own color, picked from the bot picture swatches.
      style={{ backgroundColor: color, color: isDarkBotAvatarColor(color) ? LIGHT_INK : DARK_INK }}
    >
      <Icon className="size-[60%]" strokeWidth={2} />
    </span>
  )
}

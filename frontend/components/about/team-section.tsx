'use client'

import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { LinkedinIcon, TwitterIcon, GithubIcon, Plus } from 'lucide-react'

export function TeamSection() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)

  const team = [
    {
      initial: 'A',
      name: t('about.member1name'),
      role: t('about.member1role'),
      bio: t('about.member1bio'),
      gradient: 'from-[#00f5d4] to-[#8b5cf6]',
      image: '/images/team/alex-chen.jpg',
      socials: ['linkedin', 'twitter'],
    },
    {
      initial: 'S',
      name: t('about.member2name'),
      role: t('about.member2role'),
      bio: t('about.member2bio'),
      gradient: 'from-[#8b5cf6] to-[#10b981]',
      image: '/images/team/sarah-kim.jpg',
      socials: ['linkedin', 'github', 'twitter'],
    },
    {
      initial: 'M',
      name: t('about.member3name'),
      role: t('about.member3role'),
      bio: t('about.member3bio'),
      gradient: 'from-[#f59e0b] to-[#00f5d4]',
      image: '/images/team/marcus-liu.jpg',
      socials: ['linkedin', 'twitter'],
    },
    {
      initial: 'R',
      name: t('about.member4name'),
      role: t('about.member4role'),
      bio: t('about.member4bio'),
      gradient: 'from-[#10b981] to-[#8b5cf6]',
      image: '/images/team/ryan-park.jpg',
      socials: ['linkedin', 'github'],
    },
  ]

  return (
    <section className="px-4 py-16 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-[#64748b]">
            {t('about.teamLabel')}
          </div>
          <h2 className="mt-3 font-[family-name:var(--font-space-grotesk)] text-4xl font-extrabold text-[#f1f5f9]">
            {t('about.teamTitle')}
          </h2>
          <p className="mt-3 text-[15px] text-[#64748b]">
            {t('about.teamSubtitle')}
          </p>
        </div>

        {/* Team cards grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {team.map((member, i) => (
            <div
              key={i}
              className="group rounded-xl border border-[#ffffff0d] bg-[#0d0d14] p-6 text-center backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-[#ffffff1a]"
            >
              {/* Avatar circle - with image support */}
              <div className="relative mx-auto h-18 w-18">
                <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${member.gradient} p-[2px]`}>
                  <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#05050a]">
                    {/* Try to load image, fallback to initial letter */}
                    <img
                      src={member.image}
                      alt={member.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        // If image fails to load, hide image and show letter
                        e.currentTarget.style.display = 'none'
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement
                        if (fallback) fallback.style.display = 'flex'
                      }}
                    />
                    {/* Fallback letter display */}
                    <span 
                      className="hidden h-full w-full items-center justify-center font-[family-name:var(--font-space-grotesk)] text-[28px] font-black text-[#f1f5f9]"
                      style={{ display: 'none' }}
                    >
                      {member.initial}
                    </span>
                  </div>
                </div>
              </div>

              {/* Name */}
              <h3 className="mt-4 font-[family-name:var(--font-space-grotesk)] text-lg font-bold text-[#f1f5f9]">
                {member.name}
              </h3>

              {/* Role pill */}
              <div className="mt-1 inline-block rounded-full bg-[#13131e] px-3 py-1 text-xs text-[#64748b]">
                {member.role}
              </div>

              {/* Bio */}
              <p className="mt-3 text-center text-[13px] leading-6 text-[#64748b]">
                {member.bio}
              </p>

              {/* Social links */}
              <div className="mt-4 flex justify-center gap-2">
                {member.socials.map((social, j) => (
                  <button
                    key={j}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ffffff0d] bg-transparent text-[#64748b] transition-all hover:border-[#00f5d4]/30 hover:text-[#00f5d4]"
                  >
                    {social === 'linkedin' && <LinkedinIcon className="h-4 w-4" />}
                    {social === 'twitter' && <TwitterIcon className="h-4 w-4" />}
                    {social === 'github' && <GithubIcon className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Join us card */}
          <div className="group rounded-xl border border-dashed border-[#ffffff1a] bg-[#0d0d14] p-6 text-center backdrop-blur-xl transition-all hover:border-[#00f5d4]/30">
            <div className="mx-auto flex h-18 w-18 items-center justify-center">
              <Plus className="h-8 w-8 text-[#334155]" />
            </div>
            <h3 className="mt-4 font-[family-name:var(--font-space-grotesk)] text-base font-semibold text-[#64748b]">
              {t('about.joinTeam')}
            </h3>
            <p className="mt-2 text-[13px] text-[#64748b]">
              {t('about.joinTeamDesc')}
            </p>
            <button className="mt-4 rounded-full border border-[#ffffff0d] bg-transparent px-4 py-2 text-sm font-medium text-[#64748b] transition-all hover:border-[#00f5d4]/30 hover:text-[#00f5d4]">
              {t('about.viewOpenings')}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

'use client'

import { useState } from 'react'
import { useLocale } from '@/components/locale-provider'
import { useTranslation } from '@/lib/i18n'
import { CheckCircle2, XCircle, Clock, TrendingUp } from 'lucide-react'

interface Proposal {
  id: number
  title: string
  description: string
  status: 'active' | 'passed' | 'rejected' | 'pending'
  votesFor: number
  votesAgainst: number
  totalVotes: number
  endTime: string
  proposer: string
}

function createMockProposals(t: (key: string) => string): Proposal[] {
  return [
    {
      id: 1,
      title: t('daoVoting.proposal1Title'),
      description: t('daoVoting.proposal1Desc'),
      status: 'active',
      votesFor: 12450,
      votesAgainst: 3200,
      totalVotes: 15650,
      endTime: '2026-03-05 00:00 UTC',
      proposer: '0xAbcd...1234'
    },
    {
      id: 2,
      title: t('daoVoting.proposal2Title'),
      description: t('daoVoting.proposal2Desc'),
      status: 'active',
      votesFor: 8900,
      votesAgainst: 6100,
      totalVotes: 15000,
      endTime: '2026-03-08 00:00 UTC',
      proposer: '0xEfgh...5678'
    },
    {
      id: 3,
      title: t('daoVoting.proposal3Title'),
      description: t('daoVoting.proposal3Desc'),
      status: 'passed',
      votesFor: 15200,
      votesAgainst: 4800,
      totalVotes: 20000,
      endTime: '2026-03-10 00:00 UTC',
      proposer: '0xIjkl...9012'
    },
    {
      id: 4,
      title: t('daoVoting.proposal4Title'),
      description: t('daoVoting.proposal4Desc'),
      status: 'active',
      votesFor: 11200,
      votesAgainst: 3800,
      totalVotes: 15000,
      endTime: '2026-03-15 00:00 UTC',
      proposer: '0xMnop...3456'
    },
    {
      id: 5,
      title: t('daoVoting.proposal5Title'),
      description: t('daoVoting.proposal5Desc'),
      status: 'active',
      votesFor: 9800,
      votesAgainst: 4200,
      totalVotes: 14000,
      endTime: '2026-03-18 00:00 UTC',
      proposer: '0xQrst...7890'
    },
    {
      id: 6,
      title: t('daoVoting.proposal6Title'),
      description: t('daoVoting.proposal6Desc'),
      status: 'pending',
      votesFor: 0,
      votesAgainst: 0,
      totalVotes: 0,
      endTime: '2026-03-20 00:00 UTC',
      proposer: '0xUvwx...abcd'
    }
  ]
}

export function DAOVoting() {
  const { locale } = useLocale()
  const { t } = useTranslation(locale)
  const [proposals] = useState<Proposal[]>(() => createMockProposals(t))

  function getStatusColor(status: string) {
    switch (status) {
      case 'active': return 'text-[#00f5d4]'
      case 'passed': return 'text-[#10b981]'
      case 'rejected': return 'text-[#f43f5e]'
      case 'pending': return 'text-[#fb923c]'
      default: return 'text-[#64748b]'
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'active': return <Clock className="h-4 w-4" />
      case 'passed': return <CheckCircle2 className="h-4 w-4" />
      case 'rejected': return <XCircle className="h-4 w-4" />
      case 'pending': return <TrendingUp className="h-4 w-4" />
      default: return null
    }
  }

  function getStatusText(status: string) {
    switch (status) {
      case 'active': return t('daoVoting.statusVoting')
      case 'passed': return t('daoVoting.statusPassed')
      case 'rejected': return t('daoVoting.statusRejected')
      case 'pending': return t('daoVoting.statusPending')
      default: return status
    }
  }

  function getVotePercentage(votesFor: number, totalVotes: number) {
    if (totalVotes === 0) return 0
    return Math.round((votesFor / totalVotes) * 100)
  }

  return (
    <section className="mt-12">
      {/* Section Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-[#f1f5f9]">
            {t('daoVoting.title')}
          </h2>
          <p className="mt-1 text-sm text-[#64748b]">
            {t('daoVoting.subtitle')}
          </p>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-full border border-[#00f5d4]/30 bg-[#00f5d4]/10 px-4 py-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-[#00f5d4]" />
          <span className="text-xs font-medium text-[#00f5d4]">{t('daoVoting.daoPhase')}</span>
        </div>
      </div>

      {/* Proposals List */}
      <div className="space-y-4">
        {proposals.map((proposal) => {
          const forPercentage = getVotePercentage(proposal.votesFor, proposal.totalVotes)
          const againstPercentage = 100 - forPercentage

          return (
            <div
              key={proposal.id}
              className="group rounded-xl border border-[#ffffff0d] bg-[#0d0d1499] p-6 backdrop-blur-xl transition-all hover:border-[#00f5d4]/30 hover:shadow-[0_0_30px_rgba(0,245,212,0.1)]"
            >
              {/* Header */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold text-[#f1f5f9]">
                      {proposal.title}
                    </h3>
                    <div className={`flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${getStatusColor(proposal.status)}`}
                      style={{ borderColor: 'currentColor', opacity: 0.8 }}
                    >
                      {getStatusIcon(proposal.status)}
                      {getStatusText(proposal.status)}
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#94a3b8]">
                    {proposal.description}
                  </p>
                </div>
              </div>

              {/* Vote Progress */}
              {proposal.totalVotes > 0 && (
                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-[#10b981]">{t('daoVoting.voteFor')} {forPercentage}%</span>
                    <span className="font-medium text-[#f43f5e]">{t('daoVoting.voteAgainst')} {againstPercentage}%</span>
                  </div>
                  <div className="relative h-2.5 overflow-hidden rounded-full bg-[#13131e]">
                    <div
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#10b981] to-[#10b981]/80 transition-all duration-500"
                      style={{ width: `${forPercentage}%` }}
                    />
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-xs text-[#64748b]">
                    <span className="font-[family-name:var(--font-mono)]">{proposal.votesFor.toLocaleString()} {t('daoVoting.votesFor')}</span>
                    <span className="font-[family-name:var(--font-mono)]">{proposal.votesAgainst.toLocaleString()} {t('daoVoting.votesAgainst')}</span>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="mt-6 space-y-4 border-t border-[#ffffff0d] pt-4">
                <div className="flex flex-col gap-2 text-xs text-[#64748b] sm:flex-row sm:items-center sm:gap-6">
                  <div>
                    <span className="text-[#94a3b8]">{t('daoVoting.proposer')}:</span>
                    <span className="ml-1 font-mono">{proposal.proposer}</span>
                  </div>
                  <div>
                    <span className="text-[#94a3b8]">{t('daoVoting.endTime')}:</span>
                    <span className="ml-1">{proposal.endTime}</span>
                  </div>
                </div>

                {proposal.status === 'active' && (
                  <div className="flex w-full gap-3 sm:w-auto sm:justify-end">
                    <button className="flex-1 rounded-lg border border-[#10b981]/30 bg-[#10b981]/10 px-4 py-2.5 text-sm font-medium text-[#10b981] transition-all hover:bg-[#10b981]/20 active:scale-[0.98] sm:flex-initial">
                      {t('daoVoting.voteForBtn')}
                    </button>
                    <button className="flex-1 rounded-lg border border-[#f43f5e]/30 bg-[#f43f5e]/10 px-4 py-2.5 text-sm font-medium text-[#f43f5e] transition-all hover:bg-[#f43f5e]/20 active:scale-[0.98] sm:flex-initial">
                      {t('daoVoting.voteAgainstBtn')}
                    </button>
                  </div>
                )}

                {proposal.status === 'pending' && (
                  <div className="w-full rounded-lg border border-[#fb923c]/30 bg-[#fb923c]/10 px-4 py-2.5 text-center text-sm font-medium text-[#fb923c] sm:w-auto">
                    {t('daoVoting.waitingToStart')}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Info Box */}
      <div className="mt-6 rounded-xl border border-[#00f5d4]/20 bg-[#00f5d4]/5 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#00f5d4]/20">
            <span className="text-xs text-[#00f5d4]">ℹ</span>
          </div>
          <div className="flex-1 text-sm text-[#94a3b8]">
            <p className="font-medium text-[#f1f5f9]">{t('daoVoting.votingWeightTitle')}</p>
            <p className="mt-1 leading-relaxed">
              {t('daoVoting.votingWeightDesc')}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

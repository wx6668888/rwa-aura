import { Navbar } from '@/components/navbar'
import { BackgroundEffects } from '@/components/background-effects'
import { SecurityHeader } from '@/components/security/security-header'
import { AuditReports } from '@/components/security/audit-reports'
import { ContractAddresses } from '@/components/security/contract-addresses'
import { SecurityMeasures } from '@/components/security/security-measures'
import { BugBounty } from '@/components/security/bug-bounty'
import { SecurityHistory } from '@/components/security/security-history'
import { TrustedBy } from '@/components/security/trusted-by'

export const metadata = {
  title: '安全 | RWA Protocol',
  description: 'RWA Protocol 安全审计报告、合约地址和安全机制',
}

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#05050a] font-sans">
      <BackgroundEffects opacity={8} />
      <Navbar />
      
      <main className="relative">
        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-[100px] pt-below-navbar-safe sm:px-6 lg:px-8">
          <SecurityHeader />
          <AuditReports />
          <ContractAddresses />
          <SecurityMeasures />
          <BugBounty />
          <SecurityHistory />
          <TrustedBy />
        </div>
      </main>
    </div>
  )
}

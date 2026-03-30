/** 共用栅格；右列动图（宽约 +20%） */
export const TRUST_CARD_BODY_GRID =
  'mt-3 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_min(163px,52vw)] grid-rows-1 items-stretch gap-x-3 sm:mt-4 sm:grid-cols-[minmax(0,1fr)_min(210px,52vw)] sm:gap-x-5 md:grid-cols-[minmax(0,1fr)_min(384px,54vw)] md:gap-x-10 lg:grid-cols-[minmax(0,1fr)_min(480px,48vw)] lg:gap-x-12'

/** 左列：说明块在「标题与按钮之间」垂直居中；按钮贴底 */
export const TRUST_TEXT_COL =
  'flex h-full min-h-0 min-w-0 flex-col justify-between gap-0'

/** 包裹 ul，在左列上半区垂直居中（与 how-it-works 邀请卡列表间隔一致） */
export const TRUST_BULLET_CENTER_WRAP =
  'flex min-h-0 min-w-0 flex-1 flex-col items-start justify-center py-1'

/** 与 how-it-works-section「邀请好友」列表：space-y-2.5、13px、#94a3b8 */
export const TRUST_BULLET_UL =
  'm-0 w-full max-w-2xl list-none space-y-2.5 p-0 text-left text-[13px] leading-relaxed text-[#94a3b8]'

export const TRUST_BULLET_LI = 'flex gap-2'

/** 与邀请卡圆点一致 */
export const TRUST_BULLET_MARK =
  'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00f5d4]'

export const TRUST_LOTTIE_COL =
  'flex h-full min-h-[11rem] w-full min-w-0 flex-col items-end self-stretch sm:min-h-[12rem]'
export const TRUST_LOTTIE_INNER =
  'h-full min-h-0 w-full max-w-[min(26.5rem,100%)] md:max-w-none'

/** 与首页 Hero「质押」主按钮一致（hero-section.tsx Link） */
export const TRUST_CARD_HERO_CTA_CLASS =
  'inline-flex rounded-full bg-plasma-cyan px-7 py-2.5 text-[15px] font-semibold text-void-black transition-transform duration-200 hover:scale-[1.02] hover:brightness-110 sm:px-8 sm:py-3 sm:text-base'

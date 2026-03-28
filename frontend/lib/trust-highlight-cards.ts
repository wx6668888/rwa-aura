/** 共用栅格；右列宽约 +20% 放大动图 */
export const TRUST_CARD_BODY_GRID =
  'mt-4 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_min(163px,52vw)] grid-rows-1 items-stretch gap-x-3 sm:mt-5 sm:grid-cols-[minmax(0,1fr)_min(210px,52vw)] sm:gap-x-5 md:grid-cols-[minmax(0,1fr)_min(384px,54vw)] md:gap-x-10 lg:grid-cols-[minmax(0,1fr)_min(480px,48vw)] lg:gap-x-12'

/** 安全透明卡：双列等高；左列仅放三条要点，垂直居中对齐动图（红线区） */
export const SECURITY_TRUST_BODY_ROW =
  'mt-3 flex min-h-0 flex-1 flex-row items-stretch gap-x-3 sm:mt-4 sm:gap-x-5 md:gap-x-10 lg:gap-x-12'

/** 与 SECURITY_TRUST_BODY_ROW 搭配；与左列同高 */
export const SECURITY_TRUST_LOTTIE_COL =
  'flex h-full min-h-[13.25rem] w-[min(163px,52vw)] shrink-0 flex-col items-end sm:min-h-[14.5rem] sm:w-[min(210px,52vw)] md:w-[min(384px,54vw)] lg:w-[min(480px,48vw)]'

export const SECURITY_TRUST_LOTTIE_INNER =
  'min-h-0 w-full flex-1 max-w-[min(26.5rem,100%)] md:max-w-none'

/** 左列：三条要点在列内垂直居中，与右侧动图齐平（非贴在标题下） */
export const SECURITY_TRUST_TEXT_COL =
  'flex h-full min-h-0 min-w-0 flex-1 flex-col items-start justify-center gap-0'

/** 首条顶对齐右列动图顶；按钮底对齐右列动图底 */
export const TRUST_TEXT_COL =
  'flex h-full min-h-0 min-w-0 flex-col justify-between gap-0'

export const TRUST_BULLET_LIST =
  'm-0 list-none space-y-2 p-0 py-0 text-left text-[12px] leading-snug text-[#c7d3e1] sm:space-y-2.5 sm:text-[13px] sm:leading-relaxed md:space-y-3 md:text-sm md:leading-relaxed'

export const TRUST_BULLET_LI = 'flex gap-1.5 sm:gap-2'
export const TRUST_BULLET_DOT = 'shrink-0 text-[#00f5d4]/80'

/** 右列铺满栅格行高，动图自上而下填满（与左侧首行/按钮顶底对齐） */
export const TRUST_LOTTIE_COL =
  'flex h-full min-h-[13.25rem] w-full min-w-0 flex-col items-end self-stretch sm:min-h-[14.5rem]'
export const TRUST_LOTTIE_INNER =
  'h-full min-h-0 w-full max-w-[min(26.5rem,100%)] md:max-w-none'

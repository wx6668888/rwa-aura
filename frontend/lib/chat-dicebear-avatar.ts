/**
 * 站内默认头像：DiceBear adventurer（npm，不请求 api.dicebear.com）。
 * 稳定维由地址哈希决定；易变维（mouth / skinColor / hairColor）由「地址 + 本地日历日 YYYY-MM-DD」决定，同一自然日内不变。
 */
import { createAvatar } from '@dicebear/core'
import * as adventurer from '@dicebear/adventurer'
import { keccak256, toUtf8Bytes } from 'ethers'
import type { Options as AdventurerOptions } from '@dicebear/adventurer'

const EYES: NonNullable<AdventurerOptions['eyes']> = [
  'variant01',
  'variant02',
  'variant03',
  'variant04',
  'variant05',
  'variant06',
  'variant07',
  'variant08',
  'variant09',
  'variant10',
  'variant11',
  'variant12',
  'variant13',
  'variant14',
  'variant15',
  'variant16',
  'variant17',
  'variant18',
  'variant19',
  'variant20',
  'variant21',
  'variant22',
  'variant23',
  'variant24',
  'variant25',
  'variant26',
] as const

const EYEBROWS: NonNullable<AdventurerOptions['eyebrows']> = [
  'variant01',
  'variant02',
  'variant03',
  'variant04',
  'variant05',
  'variant06',
  'variant07',
  'variant08',
  'variant09',
  'variant10',
  'variant11',
  'variant12',
  'variant13',
  'variant14',
  'variant15',
] as const

const HAIR: NonNullable<AdventurerOptions['hair']> = [
  'short01',
  'short02',
  'short03',
  'short04',
  'short05',
  'short06',
  'short07',
  'short08',
  'short09',
  'short10',
  'short11',
  'short12',
  'short13',
  'short14',
  'short15',
  'short16',
  'short17',
  'short18',
  'short19',
  'long01',
  'long02',
  'long03',
  'long04',
  'long05',
  'long06',
  'long07',
  'long08',
  'long09',
  'long10',
  'long11',
  'long12',
  'long13',
  'long14',
  'long15',
  'long16',
  'long17',
  'long18',
  'long19',
  'long20',
  'long21',
  'long22',
  'long23',
  'long24',
  'long25',
  'long26',
] as const

const MOUTH: NonNullable<AdventurerOptions['mouth']> = [
  'variant01',
  'variant02',
  'variant03',
  'variant04',
  'variant05',
  'variant06',
  'variant07',
  'variant08',
  'variant09',
  'variant10',
  'variant11',
  'variant12',
  'variant13',
  'variant14',
  'variant15',
  'variant16',
  'variant17',
  'variant18',
  'variant19',
  'variant20',
  'variant21',
  'variant22',
  'variant23',
  'variant24',
  'variant25',
  'variant26',
  'variant27',
  'variant28',
  'variant29',
  'variant30',
] as const

const SKIN_COLORS = ['f2d3b1', 'ecad80', '9e5622', '763900'] as const
const HAIR_COLORS = ['ac6511', 'cb6820', 'ab2a18', 'e5d7a3', 'b9a05f', '796a45', '6a4e35', '562306', '0e0e0e'] as const

function hash32(seed: string): Uint8Array {
  const hex = keccak256(toUtf8Bytes(seed))
  const out = new Uint8Array(32)
  for (let i = 0; i < 32; i += 1) {
    out[i] = parseInt(hex.slice(2 + i * 2, 4 + i * 2), 16)
  }
  return out
}

function pick<T extends string>(arr: readonly T[], bytes: Uint8Array, offset: number): T {
  return arr[bytes[offset % 32] % arr.length] as T
}

export function localCalendarDateKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 真人侧：无自定义头像 URL 时用 adventurer（含历史默认 /chat-bot-icons/xx.svg）。社区机器人走同一路径时在 UserBadge 内单独判断。 */
export function shouldUseDicebearAvatar(params: {
  isBot: boolean
  avatar?: string | null
}): boolean {
  if (params.isBot) return false
  const a = (params.avatar || '').trim()
  if (!a) return true
  if (a.startsWith('http') || a.startsWith('/api/')) return false
  if (/^\/chat-bot-icons\/\d{2}\.svg$/i.test(a)) return true
  return false
}

export function buildDicebearAdventurerOptions(address: string, dateKey?: string): AdventurerOptions {
  const addr = (address || 'guest').toLowerCase().trim()
  const stable = hash32(addr)
  const dk = dateKey || localCalendarDateKey()
  const daily = hash32(`${addr}:${dk}`)

  return {
    eyes: [pick([...EYES], stable, 0)],
    eyebrows: [pick([...EYEBROWS], stable, 1)],
    hair: [pick([...HAIR], stable, 2)],
    featuresProbability: stable[5] % 2 === 0 ? 0 : 35,
    glassesProbability: stable[7] % 3 === 0 ? 12 : 0,
    mouth: [pick([...MOUTH], daily, 10)],
    skinColor: [pick([...SKIN_COLORS], daily, 11)],
    hairColor: [pick([...HAIR_COLORS], daily, 12)],
  }
}

export function getChatDicebearDataUri(address: string, dateKey?: string): string {
  const addr = (address || 'guest').toLowerCase().trim() || 'guest'
  const svg = createAvatar(adventurer, {
    seed: addr,
    ...buildDicebearAdventurerOptions(address, dateKey),
    size: 128,
  }).toDataUri()
  return svg
}

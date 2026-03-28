'use client'

import { useTranslation, Locale } from '@/lib/i18n'
import { announcementsContentZh } from '@/lib/announcements-content-zh'
import { announcementsContentEn } from '@/lib/announcements-content-en'
import { announcementsContentKo } from '@/lib/announcements-content-ko'

interface AnnouncementContentProps {
  slug: string
  locale: Locale
}

const contentMap = {
  zh: announcementsContentZh,
  en: announcementsContentEn,
  ko: announcementsContentKo,
}

// Simple markdown to HTML converter
function markdownToHtml(markdown: string): string {
  if (!markdown) return ''
  
  let html = markdown
  
  // Code blocks (must be processed first)
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    return `<pre class="bg-surface-2 rounded-xl p-4 overflow-x-auto my-4"><code class="font-mono text-sm text-plasma-cyan">${code.trim()}</code></pre>`
  })
  
  // Inline code
  html = html.replace(/`([^`\n]+)`/g, '<code class="bg-surface-2 px-1.5 py-0.5 rounded text-plasma-cyan font-mono text-sm">$1</code>')
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-text-primary mt-6 mb-3">$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-text-primary mt-8 mb-4">$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-text-primary mt-8 mb-4">$1</h1>')
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-text-primary">$1</strong>')
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-plasma-cyan hover:underline">$1</a>')
  
  // Tables
  html = html.replace(/\|(.+)\|/g, (match) => {
    if (match.includes('---')) return '' // Skip separator rows
    const cells = match.split('|').filter(c => c.trim())
    return '<tr>' + cells.map(c => `<td class="px-3 py-2 border border-border-subtle">${c.trim()}</td>`).join('') + '</tr>'
  })
  
  // Lists - unordered
  html = html.replace(/^\- (.*$)/gim, '<li class="ml-4 mb-2">$1</li>')
  html = html.replace(/(<li[^>]*>.*<\/li>)/s, '<ul class="list-disc my-4 space-y-2">$1</ul>')
  
  // Lists - ordered
  html = html.replace(/^\d+\. (.*$)/gim, '<li class="ml-4 mb-2">$1</li>')
  
  // Blockquotes
  html = html.replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-plasma-cyan pl-4 italic text-text-secondary my-4">$1</blockquote>')
  
  // Horizontal rules
  html = html.replace(/^---$/gim, '<hr class="my-6 border-border-subtle">')
  
  // Split into paragraphs (double newlines)
  const paragraphs = html.split(/\n\n+/)
  html = paragraphs.map(p => {
    p = p.trim()
    if (!p) return ''
    // Don't wrap headers, lists, code blocks, etc. in <p>
    if (p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<ol') || p.startsWith('<pre') || p.startsWith('<blockquote') || p.startsWith('<hr') || p.startsWith('<table')) {
      return p
    }
    return `<p class="mb-4 leading-relaxed">${p}</p>`
  }).join('\n')
  
  return html
}

export default function AnnouncementContent({ slug, locale }: AnnouncementContentProps) {
  // Get content from content files, fallback to translation if not available
  const contentData = contentMap[locale]?.[slug as keyof typeof contentMap.zh] || contentMap.en[slug as keyof typeof contentMap.en]
  const content = contentData?.content || ''
  
  // Convert markdown to HTML
  const htmlContent = markdownToHtml(content)

  return (
    <div className="prose prose-invert max-w-none">
      <div className="text-[15px] text-text-secondary leading-[1.8] space-y-6">
        {/* Content rendered from markdown */}
        <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
      </div>

      <style jsx global>{`
        .prose h2 {
          font-size: 24px;
          font-weight: 700;
          color: #f1f5f9;
          margin-top: 32px;
          margin-bottom: 16px;
          font-family: 'Space Grotesk', sans-serif;
        }
        .prose h3 {
          font-size: 20px;
          font-weight: 600;
          color: #f1f5f9;
          margin-top: 24px;
          margin-bottom: 12px;
          font-family: 'Space Grotesk', sans-serif;
        }
        .prose p {
          margin-bottom: 16px;
        }
        .prose ul, .prose ol {
          margin: 16px 0;
          padding-left: 24px;
        }
        .prose li {
          margin-bottom: 8px;
        }
        .prose a {
          color: #00f5d4;
          text-decoration: underline;
        }
        .prose a:hover {
          opacity: 0.8;
        }
        .prose code {
          background: #13131e;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          color: #00f5d4;
        }
        .prose pre {
          background: #13131e;
          border: 1px solid #ffffff1a;
          border-radius: 12px;
          padding: 16px;
          overflow-x: auto;
          margin: 16px 0;
        }
        .prose pre code {
          background: transparent;
          padding: 0;
        }
        .prose blockquote {
          border-left: 4px solid #00f5d4;
          padding-left: 16px;
          color: #94a3b8;
          font-style: italic;
          margin: 16px 0;
        }
        .prose strong {
          color: #f1f5f9;
          font-weight: 600;
        }
        .prose table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
        }
        .prose th {
          background: #13131e;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          border: 1px solid #ffffff1a;
        }
        .prose td {
          padding: 12px;
          border: 1px solid #ffffff1a;
        }
        .info-box {
          background: #00f5d415;
          border: 1px solid #00f5d440;
          border-radius: 12px;
          padding: 16px;
          margin: 24px 0;
        }
        .warning-box {
          background: #f43f5e15;
          border: 1px solid #f43f5e40;
          border-radius: 12px;
          padding: 16px;
          margin: 24px 0;
        }
        .success-box {
          background: #10b98115;
          border: 1px solid #10b98140;
          border-radius: 12px;
          padding: 16px;
          margin: 24px 0;
        }
      `}</style>
    </div>
  )
}

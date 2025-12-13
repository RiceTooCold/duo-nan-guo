import Link from 'next/link'
import { BookOpen, Sparkles, BarChart3, Settings } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Duo-Nan-Guo</h1>
              <p className="text-xs text-muted-foreground">Content Factory</p>
            </div>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/admin"
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              進入管理後台
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            智慧題庫生成工廠
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            利用生成式 AI 技術，自動產出符合 JLPT / TOEIC / TOPIK / HSK 檢定標準的高品質語言題目
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <LanguageCard
            lang="EN"
            name="TOEIC"
            description="Part 5 填空題"
            color="bg-lang-en"
            icon="🇺🇸"
          />
          <LanguageCard
            lang="JP"
            name="JLPT"
            description="N1-N5 文字語彙"
            color="bg-lang-jp"
            icon="🇯🇵"
          />
          <LanguageCard
            lang="KR"
            name="TOPIK"
            description="I/II 閱讀填空"
            color="bg-lang-kr"
            icon="🇰🇷"
          />
          <LanguageCard
            lang="CN"
            name="HSK"
            description="Level 1-6 量詞句型"
            color="bg-lang-cn"
            icon="🇨🇳"
          />
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureBlock
            icon={<Sparkles className="w-6 h-6" />}
            title="雙模型博弈"
            description="Generator 生成 + Critic 審查，確保量產效率與品質控管"
          />
          <FeatureBlock
            icon={<BookOpen className="w-6 h-6" />}
            title="全目標語沈浸"
            description="T2T 模式：題目與選項皆使用目標語言，模擬真實檢定壓力"
          />
          <FeatureBlock
            icon={<BarChart3 className="w-6 h-6" />}
            title="智慧題型配比"
            description="根據官方考試大綱，自動按比例生成各類題型"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-sm text-muted-foreground">
          <p>Duo-Nan-Guo Content Factory v1.0.0 • Powered by Gemini AI</p>
        </div>
      </footer>
    </div>
  )
}

function LanguageCard({
  lang,
  name,
  description,
  color,
  icon
}: {
  lang: string
  name: string
  description: string
  color: string
  icon: string
}) {
  return (
    <Link
      href={`/admin/generate?lang=${lang}`}
      className="group relative overflow-hidden rounded-2xl border border-border/50 bg-background p-6 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
    >
      <div className={`absolute top-0 right-0 w-24 h-24 ${color} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`} />
      <div className="relative">
        <span className="text-3xl mb-4 block">{icon}</span>
        <h3 className="text-lg font-semibold mb-1">{name}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  )
}

function FeatureBlock({
  icon,
  title,
  description
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="p-6 rounded-xl bg-muted/50 border border-border/50">
      <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

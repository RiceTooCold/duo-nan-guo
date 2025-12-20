import Link from 'next/link'
import { Sparkles, ArrowRight, Zap, Swords, Users, Bot, Globe, Target, Trophy, Timer } from 'lucide-react'

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
              <p className="text-xs text-muted-foreground">多難過</p>
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
      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <div className="mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Swords className="w-4 h-4" />
              語言檢定對戰遊戲
            </span>
          </div>

          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent leading-tight">
            挑戰你的語言實力<br />贏得對戰勝利
          </h2>

          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            結合 Kahoot 式的即時對戰機制與官方語言檢定內容，在刺激的 1v1 或多人對戰中提升你的語言能力
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link
              href="/play"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              開始對戰
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Supported Exams */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <span className="px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">🇯🇵 JLPT</span>
            <span className="px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">🇺🇸 TOEIC</span>
            <span className="px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">🇰🇷 TOPIK</span>
            <span className="px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">🇨🇳 HSK</span>
          </div>
        </div>

        {/* Game Modes */}
        <div className="mb-16">
          <h3 className="text-center text-sm font-medium text-muted-foreground mb-6">對戰模式</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Swords className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-semibold mb-2">1v1 Duel</h4>
              <p className="text-sm text-muted-foreground">
                與真人玩家或 AI Bot 進行一對一對決，搶答速度與正確率決定勝負
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-semibold mb-2">Multiplayer</h4>
              <p className="text-sm text-muted-foreground">
                2-8 人同時對戰，在激烈的多人競爭中脫穎而出
              </p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-16">
          <h3 className="text-center text-sm font-medium text-muted-foreground mb-6">核心功能</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Timer className="w-6 h-6" />}
              title="即時對戰"
              description="透過 Socket.io 實現毫秒級同步，體驗真正的實時競賽快感"
            />
            <FeatureCard
              icon={<Bot className="w-6 h-6" />}
              title="智慧 Bot"
              description="Rule Bot 模擬學習者錯誤，LLM Bot 使用 AI 進行真實作答"
            />
            <FeatureCard
              icon={<Trophy className="w-6 h-6" />}
              title="Combo 計分"
              description="連續答對獲得連擊加成，速度越快分數越高"
            />
            <FeatureCard
              icon={<Target className="w-6 h-6" />}
              title="T2T 沈浸"
              description="Target-to-Target 全目標語環境，無母語提示，模擬真實考試壓力"
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="AI 題庫"
              description="Gemini 驅動的題目生成引擎，Generator-Critic 雙模型品質把關"
            />
            <FeatureCard
              icon={<Globe className="w-6 h-6" />}
              title="四語支援"
              description="日語 JLPT、英語 TOEIC、韓語 TOPIK、華語 HSK 全面覆蓋"
            />
          </div>
        </div>

        {/* Scoring System */}
        <div className="mb-16 p-8 rounded-2xl bg-muted/30 border border-border/50">
          <h3 className="text-lg font-semibold mb-6 text-center">計分系統</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-xl bg-background border border-border/50">
              <div className="text-2xl font-bold text-primary mb-1">+100</div>
              <div className="text-xs text-muted-foreground">基礎分數</div>
            </div>
            <div className="p-4 rounded-xl bg-background border border-border/50">
              <div className="text-2xl font-bold text-primary mb-1">+50</div>
              <div className="text-xs text-muted-foreground">速度加成</div>
            </div>
            <div className="p-4 rounded-xl bg-background border border-border/50">
              <div className="text-2xl font-bold text-primary mb-1">x2.5</div>
              <div className="text-xs text-muted-foreground">Combo 倍率</div>
            </div>
            <div className="p-4 rounded-xl bg-background border border-border/50">
              <div className="text-2xl font-bold text-destructive mb-1">Reset</div>
              <div className="text-xs text-muted-foreground">答錯歸零</div>
            </div>
          </div>
        </div>

        {/* Tech Stack Preview */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">技術架構</p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            <span className="px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">Next.js 15+</span>
            <span className="px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">Socket.io</span>
            <span className="px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">MongoDB + Prisma</span>
            <span className="px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">Gemini AI</span>
            <span className="px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">PWA</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-sm text-muted-foreground">
          <p>Duo-Nan-Guo v0.2.0 • Gamified Language Exam Battle App</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="p-5 rounded-xl bg-muted/50 border border-border/50">
      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
        {icon}
      </div>
      <h4 className="font-semibold mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

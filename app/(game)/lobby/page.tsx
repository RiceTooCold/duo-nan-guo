import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getUserDashboardStats } from '@/actions/game.server'
import LobbyDashboard from './LobbyDashboard'

export default async function LobbyPage() {
    // 1. Get Session on Server
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
        redirect('/') // or /login
    }

    // 2. Fetch User Stats (SSR)
    // This runs on the server, so it's fast and secure.
    const stats = await getUserDashboardStats(session.user.id)

    // 3. Render Client Component with Data
    return <LobbyDashboard stats={stats} session={session} />
}

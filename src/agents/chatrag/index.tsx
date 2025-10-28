import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { NavigationProvider } from '@/context/navigation-context'
import { ChatProvider } from '@/context/chat-context'
import { KnowledgeBaseProvider } from '@/context/knowledge-base-context'
import { Sidebar } from '@/components/sidebar'
import { MainContent } from '@/components/main-content'
import AgentLoader from '@/components/agent-loader'
import { ArrowLeft } from 'lucide-react'

export default function ChatRagAgent() {
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Simulate loading time for better UX
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return <AgentLoader />
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <NavigationProvider>
        <ChatProvider>
          <KnowledgeBaseProvider>
            <div className="flex h-screen bg-background relative">
              {/* Back to Factory Button */}
              <button
                onClick={() => navigate('/')}
                className="absolute bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/50"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver a la fábrica
              </button>

              {/* Left Sidebar */}
              <Sidebar />

              {/* Main Content */}
              <MainContent />
            </div>
          </KnowledgeBaseProvider>
        </ChatProvider>
      </NavigationProvider>
    </ThemeProvider>
  )
}

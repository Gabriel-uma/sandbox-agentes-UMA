import { useNavigation } from '@/context/navigation-context'
import { EnhancedChatInterface } from '@/components/enhanced-chat-interface'
import { DocumentsSection } from '@/components/documents-section'
import { KnowledgeBaseSection } from '@/components/knowledge-base-section'
import { ChatHistorySection } from '@/components/chat-history-section'
import { SettingsSection } from '@/components/settings-section'
import { HelpSection } from '@/components/help-section'

export function MainContent() {
  const { activeSection } = useNavigation()

  const renderSection = () => {
    switch (activeSection) {
      case 'chat':
        return <EnhancedChatInterface />
      case 'documents':
        return <DocumentsSection />
      case 'knowledge-base':
        return <KnowledgeBaseSection />
      case 'history':
        return <ChatHistorySection />
      case 'settings':
        return <SettingsSection />
      case 'help':
        return <HelpSection />
      default:
        return <EnhancedChatInterface />
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {renderSection()}
      </main>
    </div>
  )
}
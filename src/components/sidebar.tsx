import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  MessageSquare,
  FileText,
  BookOpen,
  History,
  Settings,
  HelpCircle,
  Search,
  Sun,
  Moon,
} from "lucide-react"
import { useState, useEffect } from "react"
import { useTheme } from "@/components/theme-provider"
import { useNavigation } from "@/context/navigation-context"

const navigationItems = [
  { icon: MessageSquare, label: "Chat RAG", section: "chat" as const },
  { icon: FileText, label: "Documentos", section: "documents" as const },
  { icon: BookOpen, label: "Base de Conocimiento", section: "knowledge-base" as const },
  { icon: History, label: "Historial de Chat", section: "history" as const },
]

const settingsItems = [
  { icon: Settings, label: "Configuración", section: "settings" as const },
  { icon: HelpCircle, label: "Ayuda", section: "help" as const },
]

export function Sidebar() {
  const { theme, setTheme } = useTheme()
  const { activeSection, setActiveSection } = useNavigation()
  const [mounted, setMounted] = useState(false)

  // useEffect to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const isDark = theme === 'dark'

  return (
    <div className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-sm"></div>
          </div>
          <span className="font-semibold text-sidebar-foreground">Asistente RAG</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar" className="pl-10 bg-input border-0 text-sm" />
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">⌘K</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4 overflow-y-auto">
        <nav className="space-y-1">
          {navigationItems.map((item) => (
            <Button
              key={item.label}
              variant={activeSection === item.section ? "secondary" : "ghost"}
              className={`w-full justify-start gap-3 h-10 transition-all ${
                activeSection === item.section
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'hover:bg-sidebar-accent/50 text-sidebar-foreground'
              }`}
              onClick={() => setActiveSection(item.section)}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm truncate">{item.label}</span>
            </Button>
          ))}
        </nav>

        <div className="mt-8">
          <h3 className="text-xs font-semibold text-sidebar-foreground/60 mb-3 px-3 uppercase tracking-wider">
            Configuración y Ayuda
          </h3>
          <nav className="space-y-1">
            {settingsItems.map((item) => (
              <Button
                key={item.label}
                variant={activeSection === item.section ? "secondary" : "ghost"}
                className={`w-full justify-start gap-3 h-10 transition-all ${
                  activeSection === item.section
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'hover:bg-sidebar-accent/50 text-sidebar-foreground'
                }`}
                onClick={() => setActiveSection(item.section)}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm truncate">{item.label}</span>
              </Button>
            ))}
          </nav>
        </div>
      </div>

      {/* Theme Toggle */}
      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="w-full justify-start gap-3 h-10 hover:bg-sidebar-accent/50"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span className="text-sm">Tema {isDark ? "Claro" : "Oscuro"}</span>
        </Button>
      </div>
    </div>
  )
}

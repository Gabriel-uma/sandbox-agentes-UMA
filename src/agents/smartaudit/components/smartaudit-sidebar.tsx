import { BarChart3, FileCheck, CheckSquare, Settings, HelpCircle, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/theme-provider'
import { useState, useEffect } from 'react'

type AgentSection = 'analista' | 'auditor' | 'revisor' | 'settings' | 'help'

interface SmartAuditSidebarProps {
  activeSection: AgentSection
  onSectionChange: (section: AgentSection) => void
}

export function SmartAuditSidebar({ activeSection, onSectionChange }: SmartAuditSidebarProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const isDark = theme === 'dark'

  const navigationItems = [
    { icon: BarChart3, label: 'Analista', section: 'analista' as const },
    { icon: FileCheck, label: 'Auditor', section: 'auditor' as const },
    { icon: CheckSquare, label: 'Revisor', section: 'revisor' as const },
  ]

  const settingsItems = [
    { icon: Settings, label: 'Configuración', section: 'settings' as const },
    { icon: HelpCircle, label: 'Ayuda', section: 'help' as const },
  ]

  return (
    <div className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-gradient-to-r from-fuchsia-400 to-purple-500 rounded flex items-center justify-center">
            <FileCheck className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-sidebar-foreground">SmartAudit</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4 overflow-y-auto">
        <nav className="space-y-1">
          {navigationItems.map((item) => (
            <Button
              key={item.label}
              variant={activeSection === item.section ? 'secondary' : 'ghost'}
              className={`w-full justify-start gap-3 h-10 transition-all ${
                activeSection === item.section
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'hover:bg-sidebar-accent/50 text-sidebar-foreground'
              }`}
              onClick={() => onSectionChange(item.section)}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm truncate">{item.label}</span>
            </Button>
          ))}
        </nav>

        <div className="mt-8">
          <h3 className="text-xs font-semibold text-sidebar-foreground/60 mb-3 px-3 uppercase tracking-wider">
            Configuración
          </h3>
          <nav className="space-y-1">
            {settingsItems.map((item) => (
              <Button
                key={item.label}
                variant={activeSection === item.section ? 'secondary' : 'ghost'}
                className={`w-full justify-start gap-3 h-10 transition-all ${
                  activeSection === item.section
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'hover:bg-sidebar-accent/50 text-sidebar-foreground'
                }`}
                onClick={() => onSectionChange(item.section)}
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

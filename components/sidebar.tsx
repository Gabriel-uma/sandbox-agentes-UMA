"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  MessageSquare,
  FolderOpen,
  FileText,
  BookOpen,
  Users,
  History,
  Settings,
  HelpCircle,
  Search,
  Sun,
  Moon,
} from "lucide-react"
import { useState, useEffect } from "react"
import { useTheme } from "next-themes"

const navigationItems = [
  { icon: MessageSquare, label: "Chat RAG", active: true },
  { icon: FileText, label: "Documentos" },
  { icon: BookOpen, label: "Base de Conocimiento" },
  { icon: History, label: "Historial de Chat" },
]

const settingsItems = [
  { icon: Settings, label: "Configuración" },
  { icon: HelpCircle, label: "Ayuda" },
]

export function Sidebar() {
  const { theme, setTheme } = useTheme()
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
      <div className="flex-1 p-4">
        <nav className="space-y-1">
          {navigationItems.map((item) => (
            <Button
              key={item.label}
              variant={item.active ? "secondary" : "ghost"}
              className="w-full justify-start gap-3 h-10"
            >
              <item.icon className="w-4 h-4" />
              <span className="text-sm">{item.label}</span>
              {item.badge && (
                <span className="ml-auto bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">{item.badge}</span>
              )}
            </Button>
          ))}
        </nav>

        <div className="mt-8">
          <h3 className="text-xs font-medium text-muted-foreground mb-2 px-3">Configuración y Ayuda</h3>
          <nav className="space-y-1">
            {settingsItems.map((item) => (
              <Button key={item.label} variant="ghost" className="w-full justify-start gap-3 h-10">
                <item.icon className="w-4 h-4" />
                <span className="text-sm">{item.label}</span>
              </Button>
            ))}
          </nav>
        </div>
      </div>

      {/* Theme Toggle */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => setTheme(isDark ? 'light' : 'dark')} className="gap-2">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="text-sm">{isDark ? "Claro" : "Oscuro"}</span>
          </Button>
        </div>

      </div>
    </div>
  )
}

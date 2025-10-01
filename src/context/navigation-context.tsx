import React, { createContext, useContext, useState } from 'react'

type NavigationSection = 'chat' | 'documents' | 'knowledge-base' | 'history' | 'settings' | 'help'

interface NavigationContextType {
  activeSection: NavigationSection
  setActiveSection: (section: NavigationSection) => void
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [activeSection, setActiveSection] = useState<NavigationSection>('chat')

  return (
    <NavigationContext.Provider value={{ activeSection, setActiveSection }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return context
}
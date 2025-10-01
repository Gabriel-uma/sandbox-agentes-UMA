import { ThemeProvider } from '@/components/theme-provider'
import { NavigationProvider } from '@/context/navigation-context'
import { Sidebar } from '@/components/sidebar'
import { MainContent } from '@/components/main-content'

function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <NavigationProvider>
        <div className="flex h-screen bg-background">
          {/* Left Sidebar */}
          <Sidebar />

          {/* Main Content */}
          <MainContent />
        </div>
      </NavigationProvider>
    </ThemeProvider>
  )
}

export default App
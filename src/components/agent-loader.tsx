export default function AgentLoader() {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#0b0f19] via-[#12152a] to-[#1a103f] flex items-center justify-center z-50">
      <div className="text-center space-y-6">
        {/* Animated spinner with glow effect */}
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-500 opacity-20 blur-2xl rounded-full animate-pulse" />
          <div className="relative w-16 h-16 border-4 border-transparent border-t-cyan-400 border-r-purple-500 rounded-full animate-spin" />
        </div>

        {/* Loading text with gradient */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent animate-pulse">
            Cargando agente...
          </h2>
          <div className="flex justify-center gap-1">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

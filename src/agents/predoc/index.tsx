export default function PreDocAgent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0f19] via-[#12152a] to-[#1a103f] flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-500 opacity-20 blur-2xl rounded-full" />
          <div className="relative text-8xl">🚧</div>
        </div>

        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent">
          Pre-Doc
        </h1>

        <p className="text-gray-400 text-xl max-w-md mx-auto">
          Este agente estará disponible próximamente
        </p>

        <div className="pt-8">
          <button
            onClick={() => window.close()}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-400 to-cyan-500 text-white font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

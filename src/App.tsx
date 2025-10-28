import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AgentsShowcase from '@/pages/agents-showcase'
import ChatRagAgent from '@/agents/chatrag'
import SmartAuditAgent from '@/agents/smartaudit'
import PreDocAgent from '@/agents/predoc'
import EscribaAgent from '@/pages/escriba'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AgentsShowcase />} />
        <Route path="/agents/chatrag" element={<ChatRagAgent />} />
        <Route path="/agents/smartaudit" element={<SmartAuditAgent />} />
        <Route path="/agents/predoc" element={<PreDocAgent />} />
        <Route path="/agents/escriba" element={<EscribaAgent />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

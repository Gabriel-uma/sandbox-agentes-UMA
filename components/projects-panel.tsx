import { Button } from "@/components/ui/button"
import { MoreHorizontal, Plus } from "lucide-react"

const projects = [
  {
    title: "Learning From 100 Years o...",
    subtitle: "For athletes, high altitude pose...",
  },
  {
    title: "Research officiants",
    subtitle: "Maxwell's equations—the four...",
  },
  {
    title: "What does a senior lead de...",
    subtitle: "Physiological implications involv...",
  },
  {
    title: "Write a sweet note to your...",
    subtitle: "In the eighteenth century the G...",
  },
  {
    title: "Meet with cake bakers",
    subtitle: "Physical space is often conceiv...",
  },
  {
    title: "Meet with cake bakers",
    subtitle: "Physical space is often conceiv...",
  },
]

export function ProjectsPanel() {
  return (
    <div className="w-80 h-screen bg-popover border-l border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-popover-foreground">Projects (7)</h2>
          <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>

        <Button className="w-full justify-start gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {projects.map((project, index) => (
            <div key={index} className="p-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors mb-1">
              <h3 className="font-medium text-sm text-popover-foreground mb-1 line-clamp-1">{project.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{project.subtitle}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

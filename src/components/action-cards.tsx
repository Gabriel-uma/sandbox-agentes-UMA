import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PenTool, ImageIcon, User, Code, Plus } from "lucide-react"

const actionCards = [
  {
    icon: PenTool,
    title: "Write copy",
    bgColor: "bg-orange-100",
    iconColor: "text-orange-600",
  },
  {
    icon: ImageIcon,
    title: "Image generation",
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    icon: User,
    title: "Create avatar",
    bgColor: "bg-green-100",
    iconColor: "text-green-600",
  },
  {
    icon: Code,
    title: "Write code",
    bgColor: "bg-pink-100",
    iconColor: "text-pink-600",
  },
]

export function ActionCards() {
  return (
    <div className="grid grid-cols-2 gap-4 max-w-2xl">
      {actionCards.map((card) => (
        <Card key={card.title} className="border border-border hover:shadow-sm transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                  <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                <span className="font-medium text-card-foreground">{card.title}</span>
              </div>
              <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Paperclip, Mic, MoreHorizontal, Send } from "lucide-react"
import { useState } from "react"

export function ChatInput() {
  const [message, setMessage] = useState("Summarize the latest")

  return (
    <div className="border-t border-border bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative">
          <div className="flex items-center gap-2 bg-input rounded-lg border border-border p-3">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 border-0 bg-transparent p-0 focus-visible:ring-0"
            />
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                <Mic className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground">20 / 3,000</span>
              <Button size="sm" className="w-8 h-8 p-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-2 text-center">
          Script may generate inaccurate information about people, places, or facts. Model: Script AI v1.3
        </p>
      </div>
    </div>
  )
}

import React, { useState } from "react"
import { Card, Button, Badge } from "./ui"
import { Power, Radio, Video, Tv, Settings, Play, Pause, Square } from "lucide-react"
import { cn } from "../lib/utils"

interface BroadcastOptionsProps {
  onClose?: () => void
}

const BroadcastOptions: React.FC<BroadcastOptionsProps> = ({ onClose }) => {
  const [playoutStatus, setPlayoutStatus] = useState<"active" | "paused" | "stopped">("active")
  const [liveChannels, setLiveChannels] = useState(2)
  const [padMode, setPadMode] = useState<"auto" | "manual">("auto")
  const [adsCount, setAdsCount] = useState(12)

  return (
    <Card className="p-4 bg-slate-800/90 backdrop-blur-sm border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Options Broadcast
        </h3>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-slate-700 h-6 w-6 p-0"
          >
            ×
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Playout Status */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Power className={cn(
              "w-4 h-4",
              playoutStatus === "active" ? "text-green-400" : 
              playoutStatus === "paused" ? "text-amber-400" : 
              "text-red-400"
            )} />
            <span className="text-xs font-semibold text-slate-300">Playout</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant={playoutStatus === "active" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setPlayoutStatus("active")}
              className={cn(
                "h-7 text-xs",
                playoutStatus === "active" ? "bg-green-600 hover:bg-green-700" : "text-slate-400 hover:bg-slate-700"
              )}
              leftIcon={<Play className="w-3 h-3" />}
            >
              Actif
            </Button>
            <Button
              variant={playoutStatus === "paused" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setPlayoutStatus("paused")}
              className={cn(
                "h-7 text-xs",
                playoutStatus === "paused" ? "bg-amber-600 hover:bg-amber-700" : "text-slate-400 hover:bg-slate-700"
              )}
              leftIcon={<Pause className="w-3 h-3" />}
            >
              Pause
            </Button>
            <Button
              variant={playoutStatus === "stopped" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setPlayoutStatus("stopped")}
              className={cn(
                "h-7 text-xs",
                playoutStatus === "stopped" ? "bg-red-600 hover:bg-red-700" : "text-slate-400 hover:bg-slate-700"
              )}
              leftIcon={<Square className="w-3 h-3" />}
            >
              Stop
            </Button>
          </div>
        </div>

        {/* Live Channels */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Radio className="w-4 h-4 text-red-400" />
            <span className="text-xs font-semibold text-slate-300">Live Channels</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLiveChannels(Math.max(0, liveChannels - 1))}
              className="h-7 w-7 p-0 text-slate-400 hover:bg-slate-700"
            >
              −
            </Button>
            <Badge className="bg-slate-700 text-white font-mono px-3">
              {liveChannels}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLiveChannels(liveChannels + 1)}
              className="h-7 w-7 p-0 text-slate-400 hover:bg-slate-700"
            >
              +
            </Button>
          </div>
        </div>

        {/* PAD Mode */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Video className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold text-slate-300">PAD Mode</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant={padMode === "auto" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setPadMode("auto")}
              className={cn(
                "h-7 text-xs",
                padMode === "auto" ? "bg-blue-600 hover:bg-blue-700" : "text-slate-400 hover:bg-slate-700"
              )}
            >
              Auto
            </Button>
            <Button
              variant={padMode === "manual" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setPadMode("manual")}
              className={cn(
                "h-7 text-xs",
                padMode === "manual" ? "bg-blue-600 hover:bg-blue-700" : "text-slate-400 hover:bg-slate-700"
              )}
            >
              Manuel
            </Button>
          </div>
        </div>

        {/* Ads Count */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Tv className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-slate-300">ADS Spots</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAdsCount(Math.max(0, adsCount - 1))}
              className="h-7 w-7 p-0 text-slate-400 hover:bg-slate-700"
            >
              −
            </Button>
            <Badge className="bg-slate-700 text-white font-mono px-3">
              {adsCount}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAdsCount(adsCount + 1)}
              className="h-7 w-7 p-0 text-slate-400 hover:bg-slate-700"
            >
              +
            </Button>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-400">Paramètres Avancés</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500">
          <div>EPG: Actif</div>
          <div>EAS: Configuré</div>
          <div>Traffic: Intégré</div>
        </div>
      </div>
    </Card>
  )
}

export default BroadcastOptions


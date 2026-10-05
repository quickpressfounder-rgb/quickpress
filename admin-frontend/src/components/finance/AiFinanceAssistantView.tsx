import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Sparkles,
  Bot,
  Sliders,
  Send,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Layers,
  Database,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import {
  queryAiFinanceAssistant,
  simulateCommercialScenario,
  AiAssistantResponse,
  ScenarioSimulationResponse,
} from "@/api/finance-api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { toast } from "sonner";

const QUICK_QUESTIONS = [
  "What is our total GMV and net profit?",
  "How much COD cash is currently held by fleet riders?",
  "What are our total GST and tax liabilities this month?",
  "Which cities are driving the highest net profit?",
];

export function AiFinanceAssistantView() {
  const [activeTab, setActiveTab] = useState<"ai-chat" | "simulator">("ai-chat");
  const [queryInput, setQueryInput] = useState("");
  const [chatResult, setChatResult] = useState<AiAssistantResponse | null>(null);

  // Simulator Sliders State
  const [commissionRate, setCommissionRate] = useState(15.0);
  const [deliveryFeePerKm, setDeliveryFeePerKm] = useState(7.0);
  const [monthlyGrowthPct, setMonthlyGrowthPct] = useState(10);
  const [platformFee, setPlatformFee] = useState(10.0);
  const [simResult, setSimResult] = useState<ScenarioSimulationResponse | null>(null);

  const aiMutation = useMutation({
    mutationFn: (q: string) => queryAiFinanceAssistant(q),
    onSuccess: (data) => {
      setChatResult(data);
    },
    onError: (err: any) => {
      toast.error(err?.message || "AI query failed");
    },
  });

  const simMutation = useMutation({
    mutationFn: (params: any) => simulateCommercialScenario(params),
    onSuccess: (data) => {
      setSimResult(data);
      toast.success("Simulation calculated successfully");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Scenario simulation failed");
    },
  });

  const handleRunQuery = (questionText?: string) => {
    const text = questionText || queryInput;
    if (!text.trim()) {
      toast.error("Please enter a question");
      return;
    }
    setQueryInput(text);
    aiMutation.mutate(text);
  };

  const handleRunSimulation = () => {
    simMutation.mutate({
      commissionRate,
      deliveryFeePerKm,
      monthlyOrderGrowthPct: monthlyGrowthPct,
      platformFee,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Sparkles className="size-5" />
            </span>
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">AI Finance Intelligence & Scenario Simulator</h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Query financial metrics using natural language or simulate commercial levers without mutating live ledger data.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="bg-zinc-100 p-1 rounded-xl">
            <TabsTrigger value="ai-chat" className="text-xs font-bold rounded-lg px-3 py-1.5 flex items-center gap-1.5">
              <Bot className="size-3.5" />
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="simulator" className="text-xs font-bold rounded-lg px-3 py-1.5 flex items-center gap-1.5">
              <Sliders className="size-3.5" />
              Scenario Simulator
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* AI Assistant Chat View */}
      {activeTab === "ai-chat" && (
        <div className="space-y-6">
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Quick Inquiries</h3>
            <div className="flex flex-wrap gap-2">
              {QUICK_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleRunQuery(q)}
                  disabled={aiMutation.isPending}
                  className="text-xs bg-zinc-50 hover:bg-indigo-50 hover:text-indigo-700 text-zinc-700 font-medium px-3 py-2 rounded-xl border border-zinc-200 transition-colors text-left"
                >
                  "{q}"
                </button>
              ))}
            </div>

            <div className="pt-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRunQuery();
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <Input
                    placeholder="Ask any financial question (e.g. 'What was our total refund payout this month?')..."
                    value={queryInput}
                    onChange={(e) => setQueryInput(e.target.value)}
                    className="text-xs rounded-xl h-10 pr-10"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={aiMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-4 text-xs font-semibold"
                >
                  {aiMutation.isPending ? <RefreshCw className="size-3.5 animate-spin" /> : <Send className="size-3.5 mr-1" />}
                  Ask AI
                </Button>
              </form>
            </div>
          </div>

          {/* AI Response Card */}
          {chatResult && (
            <div className="bg-gradient-to-br from-indigo-900 via-zinc-900 to-black text-white rounded-2xl p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg">
                    <Bot className="size-4" />
                  </span>
                  <span className="text-xs font-semibold text-zinc-300">Deterministic Financial Analysis</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                  <Database className="size-3" />
                  <span>Source: {chatResult.source || "Supabase PostgreSQL"}</span>
                </div>
              </div>

              <div className="text-sm font-medium leading-relaxed text-zinc-100">
                {chatResult.answer}
              </div>

              {chatResult.metrics && Object.keys(chatResult.metrics).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {Object.entries(chatResult.metrics).map(([k, v]) => (
                    <div key={k} className="bg-white/10 rounded-xl p-3 border border-white/10">
                      <div className="text-[10px] text-zinc-400 uppercase font-mono">{k}</div>
                      <div className="text-sm font-bold text-white mt-0.5">
                        {typeof v === "number" ? `₹${Number(v).toFixed(2)}` : String(v)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Commercial What-If Scenario Simulator */}
      {activeTab === "simulator" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls Panel */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <Sliders className="size-4 text-amber-600" />
                <h3 className="text-sm font-bold text-zinc-900">Commercial Levers & Assumptions</h3>
              </div>
              <Badge variant="outline" className="text-xs">Sandbox Mode</Badge>
            </div>

            {/* Slider 1: Commission */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <Label className="font-semibold text-zinc-700">Partner Commission Rate</Label>
                <span className="font-mono font-bold text-indigo-600">{commissionRate}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="35"
                step="0.5"
                value={commissionRate}
                onChange={(e) => setCommissionRate(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 h-2 bg-zinc-200 rounded-lg cursor-pointer"
              />
              <p className="text-[10px] text-zinc-400">Base take-rate charged to laundry partners</p>
            </div>

            {/* Slider 2: Delivery fee per km */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <Label className="font-semibold text-zinc-700">Customer Delivery Fee per Km</Label>
                <span className="font-mono font-bold text-indigo-600">₹{deliveryFeePerKm}/km</span>
              </div>
              <input
                type="range"
                min="3"
                max="25"
                step="0.5"
                value={deliveryFeePerKm}
                onChange={(e) => setDeliveryFeePerKm(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 h-2 bg-zinc-200 rounded-lg cursor-pointer"
              />
              <p className="text-[10px] text-zinc-400">Customer delivery rate charged beyond base radius</p>
            </div>

            {/* Slider 3: Volume Growth */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <Label className="font-semibold text-zinc-700">Projected Monthly Volume Growth</Label>
                <span className="font-mono font-bold text-emerald-600">+{monthlyGrowthPct}%</span>
              </div>
              <input
                type="range"
                min="-20"
                max="100"
                step="5"
                value={monthlyGrowthPct}
                onChange={(e) => setMonthlyGrowthPct(parseInt(e.target.value))}
                className="w-full accent-emerald-600 h-2 bg-zinc-200 rounded-lg cursor-pointer"
              />
              <p className="text-[10px] text-zinc-400">Expected scale in total order volume</p>
            </div>

            {/* Slider 4: Platform Fee */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <Label className="font-semibold text-zinc-700">Platform Convenience Fee</Label>
                <span className="font-mono font-bold text-indigo-600">₹{platformFee}</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={platformFee}
                onChange={(e) => setPlatformFee(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 h-2 bg-zinc-200 rounded-lg cursor-pointer"
              />
              <p className="text-[10px] text-zinc-400">Fixed checkout fee per order</p>
            </div>

            <Button
              onClick={handleRunSimulation}
              disabled={simMutation.isPending}
              className="w-full bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-semibold h-10"
            >
              {simMutation.isPending ? <RefreshCw className="size-3.5 animate-spin mr-2" /> : <Sparkles className="size-3.5 mr-2" />}
              Run Commercial Simulation
            </Button>
          </div>

          {/* Projection Results Panel */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-zinc-900">Projected Financial Impact</h3>
              </div>
              {simResult && (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                  Simulation Ready
                </Badge>
              )}
            </div>

            {!simResult ? (
              <div className="text-center py-16 text-zinc-400">
                <Sliders className="size-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Adjust sliders on the left and click "Run Commercial Simulation" to project outcomes.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                    <span className="text-xs text-zinc-500">Projected Gross GMV</span>
                    <div className="text-xl font-black text-zinc-900 mt-1">
                      ₹{((simResult.projectedFinancials?.projectedGmv ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                    <span className="text-xs text-zinc-500">Projected Net Profit</span>
                    <div className="text-xl font-black text-emerald-700 mt-1">
                      ₹{((simResult.projectedFinancials?.projectedNetProfit ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-900">Projected Net Margin</span>
                    <span className="font-bold text-emerald-800 font-mono text-sm">
                      {(simResult.projectedFinancials?.projectedMarginPct ?? 0).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-emerald-700">
                    <span>Variance vs Current Reality:</span>
                    <span className="font-bold font-mono">
                      +₹{((simResult.projectedFinancials?.deltaVsCurrent ?? 0)).toFixed(2)} (
                      {(simResult.projectedFinancials?.variancePercentage ?? 0).toFixed(1)}%)
                    </span>
                  </div>
                </div>

                <div className="text-xs text-zinc-500 leading-relaxed p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                  <span className="font-bold text-zinc-800">Executive Summary:</span> At a {commissionRate}% commission rate and ₹{deliveryFeePerKm}/km delivery fee, your bottom-line margin is projected to expand by {(simResult.projectedFinancials?.variancePercentage ?? 0).toFixed(1)}% under a {monthlyGrowthPct}% growth trajectory.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

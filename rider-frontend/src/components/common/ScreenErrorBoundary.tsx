import React, { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ScreenErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("[QuickPress Captain ScreenErrorBoundary]", error, errorInfo);
  }

  handleRetry = (): void => {
    try {
      if (this.props.onReset) {
        this.props.onReset();
      } else {
        // Clear potential corrupted active order cache and cleanly reload route
        try {
          localStorage.removeItem("qp_active_rider_order");
          localStorage.removeItem("qp_active_delivery_order");
        } catch {}
        window.location.reload();
        return;
      }
    } catch {}
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 my-auto text-center w-full max-w-sm mx-auto">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 shadow-2xs mb-3">
            <AlertTriangle className="size-6 stroke-[2.2]" />
          </div>
          <h3 className="text-sm font-black text-zinc-900 tracking-tight">
            {this.props.fallbackTitle || "Unable to display this section"}
          </h3>
          <p className="mt-1 text-xs text-zinc-500 max-w-xs leading-relaxed">
            A temporary display issue occurred. Tap below to reload this section safely.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-zinc-950 shadow-sm transition-all hover:bg-amber-500 active:scale-95 cursor-pointer"
          >
            <RefreshCw className="size-3.5 stroke-[2.2]" />
            <span>Reload Section</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

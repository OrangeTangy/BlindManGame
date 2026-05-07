import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  resetKey?: string | number;
}
interface State {
  error: Error | null;
}

/**
 * Guards the minigame panel. A stage transition briefly has mismatched
 * (stage.kind vs minigameState.kind) or a stale state, and a stray render
 * error there used to black-screen the whole page. We swallow it, show a
 * friendly loader, and auto-reset whenever `resetKey` changes (e.g. new
 * stage) so the next stage renders cleanly.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }
  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.warn("[ErrorBoundary] minigame panel render failed:", error);
  }
  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="card text-slate-400 text-center py-6">
            <div className="text-sm uppercase tracking-widest text-amber-400 mb-2">
              Loading stage…
            </div>
            <div className="text-xs text-slate-500">
              (hang tight — the next minigame is spinning up)
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

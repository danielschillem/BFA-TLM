import { Component } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-lg bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Une erreur est survenue
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              L'application a rencontré un problème inattendu. Veuillez
              rafraîchir la page ou revenir à l'accueil.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 text-white font-medium text-sm hover:bg-primary-600 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Rafraîchir
              </button>
              <button
                onClick={() => {
                  window.location.href = "/dashboard";
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition"
              >
                <Home className="w-4 h-4" />
                Accueil
              </button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left bg-gray-100 rounded-xl p-4">
                <summary className="text-xs font-medium text-gray-500 cursor-pointer">
                  Détails techniques
                </summary>
                <pre className="mt-2 text-xs text-red-600 overflow-auto whitespace-pre-wrap">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

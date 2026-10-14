import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router.jsx';
import { AppProviders } from './app/providers.jsx';
import './styles/index.css';

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('Unhandled UI Exception caught by boundary:', error, errorInfo);
  }

  handleCopyDetails = () => {
    const text = `Error: ${this.state.error?.message}\nStack: ${this.state.error?.stack}\nComponent: ${this.state.errorInfo?.componentStack}`;
    navigator.clipboard.writeText(text);
    alert('Error details copied to clipboard.');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-app flex flex-col items-center justify-center p-6 text-center select-none text-main">
          <div className="w-16 h-16 rounded-full bg-danger/10 text-danger flex items-center justify-center mb-4 text-2xl font-bold">
            !
          </div>
          <h2 className="text-2xl font-bold font-poppins">Something went wrong</h2>
          <p className="text-sm text-muted max-w-md mt-2 mb-6">
            An unexpected application error occurred. You can reload the page or copy error details for support.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-contrast rounded-token text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Reload Page
            </button>
            <button
              onClick={this.handleCopyDetails}
              className="px-4 py-2 bg-surface-2 text-main border border-line rounded-token text-sm font-semibold hover:bg-line transition-colors"
            >
              Copy Error Details
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </AppProviders>
    </GlobalErrorBoundary>
  </React.StrictMode>
);

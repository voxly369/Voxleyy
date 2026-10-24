import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorState } from '../states/ErrorState.tsx'
import { reportClientError } from '../../lib/errors/reportError.ts'

type Props = { children: ReactNode }
type State = { hasError: boolean; errorKey: number }

export class GlobalErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorKey: 0 }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void reportClientError({
      message: error.message,
      name: error.name,
      stack: error.stack,
      componentStack: info.componentStack ?? undefined,
      route: typeof window !== 'undefined' ? window.location.pathname : undefined,
    })
  }

  reset = () => {
    this.setState((prev) => ({ hasError: false, errorKey: prev.errorKey + 1 }))
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          title="Something went wrong"
          message="Voxly hit an unexpected error. You can try again, or refresh the page."
          onRetry={this.reset}
        />
      )
    }

    return <div key={this.state.errorKey}>{this.props.children}</div>
  }
}

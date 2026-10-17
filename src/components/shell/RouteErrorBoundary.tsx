import { Component, type ReactNode } from 'react'
import { ErrorState } from '../states/ErrorState.tsx'

type Props = { children: ReactNode }
type State = { hasError: boolean }

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  reset = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          title="This page did not open"
          message="Something went wrong while showing this screen. Try again."
          onRetry={this.reset}
        />
      )
    }

    return this.props.children
  }
}

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Body, BodyStrong, Heading, Small } from '@/components/ui/Text'
import { COLOR, RADIUS, SPACE } from '@/lib/theme'
import { captureException } from '@/lib/sentry'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
    captureException(error, { componentStack: info.componentStack })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Heading>That screen broke</Heading>
          <Body tone="soft">
            Nothing you did. Try again, and if it keeps happening, close the app and reopen it.
          </Body>
          {__DEV__ && this.state.error ? (
            <Small tone="soft" numberOfLines={4}>
              {this.state.error.message}
            </Small>
          ) : null}
          <Pressable
            onPress={this.handleRetry}
            accessibilityRole="button"
            accessibilityLabel="Try again"
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <BodyStrong color={COLOR.white}>Try again</BodyStrong>
          </Pressable>
        </View>
      )
    }

    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.paper,
    paddingHorizontal: SPACE.s5,
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: SPACE.s3,
  },
  button: {
    marginTop: SPACE.s2,
    minHeight: 48,
    paddingHorizontal: SPACE.s5,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { backgroundColor: COLOR.inkPressed, transform: [{ scale: 0.97 }] },
})

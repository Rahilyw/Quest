import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { FeedbackSheet } from '@/components/FeedbackSheet'
import { Body, BodyStrong, Heading, Small } from '@/components/ui/Text'
import { captureException } from '@/lib/sentry'
import { COLOR, RADIUS, SPACE } from '@/lib/theme'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  eventId?: string
  feedbackOpen: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, feedbackOpen: false }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
    const eventId = captureException(error, { componentStack: info.componentStack })
    this.setState({ eventId })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, eventId: undefined, feedbackOpen: false })
  }

  handleOpenFeedback = () => {
    this.setState({ feedbackOpen: true })
  }

  handleCloseFeedback = () => {
    this.setState({ feedbackOpen: false })
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
          <Pressable
            onPress={this.handleOpenFeedback}
            accessibilityRole="button"
            accessibilityLabel="Tell us what happened"
            style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]}
          >
            <BodyStrong>Tell us what happened</BodyStrong>
          </Pressable>
          <FeedbackSheet
            visible={this.state.feedbackOpen}
            onClose={this.handleCloseFeedback}
            eventId={this.state.eventId}
          />
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
  secondary: {
    minHeight: 48,
    paddingHorizontal: SPACE.s5,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.secondaryFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryPressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
})

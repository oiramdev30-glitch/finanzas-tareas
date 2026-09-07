'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    const errorMessage = error.message + '\n' + (errorInfo.componentStack ?? '');
    AsyncStorage.setItem('lastCrash', errorMessage).catch(() => {});
  }

  handleRetry = async () => {
    await AsyncStorage.removeItem('lastCrash');
    // This will cause a remount of the app
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>La app falló al iniciar</Text>
          <Text style={styles.errorText}>{this.state.error?.message ?? 'Error desconocido'}</Text>
          <Button title="Reintentar" onPress={this.handleRetry} />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#f2f3f7',
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#f87171',
    fontSize: 14,
  },
});
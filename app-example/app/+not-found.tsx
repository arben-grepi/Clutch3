import React from 'react';
import { Link } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';
import { Stack } from 'expo-router';

export default function NotFound() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Oops Not Found',
        }}
      />
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.errorCode}>404</Text>
          <Text style={styles.title}>Page Not Found</Text>
          <Text style={styles.message}>
            Sorry, we couldn't find the page you're looking for.
          </Text>
          <View style={styles.buttonContainer}>
            <Link href="/" style={styles.button}>
              <Text style={styles.buttonText}>Go back home</Text>
              
            </Link>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  content: {
    alignItems: 'center',
  },
  errorCode: {
    fontSize: 96,
    fontWeight: 'bold',
    color: '#111827',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
  },
  message: {
    fontSize: 18,
    color: '#4b5563',
    marginTop: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 24,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

import { useState, useCallback } from 'react'
import axios from 'axios'

export const useMetricsTracking = () => {
  const [metrics, setMetrics] = useState({
    typingSpeed: 0,
    mouseMovements: 0,
    startTime: null,
    keyPresses: 0,
    mouseMoveCount: 0
  })

  // Start tracking
  const startTracking = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      startTime: Date.now(),
      keyPresses: 0,
      mouseMoveCount: 0
    }))
  }, [])

  // Track key presses (typing speed = chars per second)
  const handleKeyPress = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      keyPresses: prev.keyPresses + 1
    }))
  }, [])

  // Track mouse movement
  const handleMouseMove = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      mouseMoveCount: prev.mouseMoveCount + 1
    }))
  }, [])

  // Calculate and submit metrics
  const submitMetrics = useCallback(async (token) => {
    if (!metrics.startTime) return
    
    const elapsedSeconds = (Date.now() - metrics.startTime) / 1000
    const typingSpeed = elapsedSeconds > 0 ? (metrics.keyPresses / elapsedSeconds).toFixed(2) : 0
    const mouseMovements = metrics.mouseMoveCount

    try {
      await axios.post('/_/backend/metrics/record', { typingSpeed: parseFloat(typingSpeed), mouseMovements }, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (err) {
      console.error('Failed to submit metrics:', err)
    }
  }, [metrics])

  return {
    startTracking,
    handleKeyPress,
    handleMouseMove,
    submitMetrics,
    metrics
  }
}

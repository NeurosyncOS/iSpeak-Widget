import React, { useState, useEffect, useRef } from 'react'

const iSpeakWidget = ({ 
  onResponse = null,
  theme = "consciousness",
  apiKeys = {},
  embeddedMode = false,
  widgetPosition = { x: 20, y: 20 },
  minimized = false
}) => {
  // Core States
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [response, setResponse] = useState("iSpeak widget ready...")
  const [recognition, setRecognition] = useState(null)
  const [voiceActivated, setVoiceActivated] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState('groq')
  const [isMinimized, setIsMinimized] = useState(minimized)
  const [position, setPosition] = useState(widgetPosition)
  const [isDragging, setIsDragging] = useState(false)

  // Voice States
  const [availableVoices, setAvailableVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState("")
  const [voiceSpeed, setVoiceSpeed] = useState(0.9)
  const [outputLanguage, setOutputLanguage] = useState("en-US")

  // AI SERVICE CONFIGURATION
  const AI_SERVICES = {
    groq: {
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      key: apiKeys.groq || import.meta.env?.VITE_GROQ_API_KEY,
      model: 'llama-3.1-8b-instant'
    },
    openai: {
      endpoint: 'https://api.openai.com/v1/chat/completions',
      key: apiKeys.openai || import.meta.env?.VITE_OPENAI_API_KEY,
      model: 'gpt-4o-mini'
    },
    anthropic: {
      endpoint: 'https://api.anthropic.com/v1/messages',
      key: apiKeys.anthropic || import.meta.env?.VITE_ANTHROPIC_API_KEY,
      model: 'claude-3-5-sonnet-20241022'
    }
  }

  // Theme Configuration
  const themes = {
    consciousness: {
      bg: "#0a0a0f",
      primary: "#8b5cf6",
      accent: "#a78bfa",
      text: "#e5e7eb",
      border: "rgba(139, 92, 246, 0.3)",
      glow: "rgba(139, 92, 246, 0.5)"
    },
    awakening: {
      bg: "#000000",
      primary: "#fbbf24",
      accent: "#f59e0b",
      text: "#fef3c7",
      border: "rgba(251, 191, 36, 0.3)",
      glow: "rgba(251, 191, 36, 0.5)"
    },
    empathic: {
      bg: "#0f172a",
      primary: "#06b6d4",
      accent: "#67e8f9",
      text: "#cffafe",
      border: "rgba(6, 182, 212, 0.3)",
      glow: "rgba(6, 182, 212, 0.5)"
    }
  }

  const currentTheme = themes[theme] || themes.consciousness

  // AI Processing
  const processWithAI = async (userText) => {
    try {
      const service = AI_SERVICES[selectedProvider]
      if (!service || !service.key) {
        const errorMsg = `${selectedProvider} API key not configured.`
        throw new Error(errorMsg)
      }

      let response
      let requestBody

      if (selectedProvider === 'anthropic') {
        requestBody = {
          model: service.model,
          max_tokens: 800,
          messages: [{
            role: 'user',
            content: `You are iSpeak, an AI assistant for accessibility and voice interaction. Respond helpfully and concisely to: ${userText}`
          }]
        }
        response = await fetch(service.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': service.key,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify(requestBody)
        })
      } else {
        requestBody = {
          model: service.model,
          messages: [{
            role: 'system',
            content: 'You are iSpeak, an AI assistant for accessibility and voice interaction. Be helpful, concise, and friendly.'
          }, {
            role: 'user',
            content: userText
          }],
          max_tokens: 800,
          temperature: 0.7
        }

        response = await fetch(service.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${service.key}`
          },
          body: JSON.stringify(requestBody)
        })
      }

      if (!response.ok) {
        throw new Error(`AI API error ${response.status}`)
      }

      const data = await response.json()
      let aiResponse

      if (selectedProvider === 'anthropic') {
        aiResponse = data.content?.[0]?.text || 'I seem to be having trouble forming thoughts...'
      } else {
        aiResponse = data.choices?.[0]?.message?.content || 'I seem to be having trouble forming thoughts...'
      }

      setResponse(aiResponse)
      speakText(aiResponse)

      // Callback to parent application
      if (onResponse) {
        onResponse({
          userInput: userText,
          aiResponse: aiResponse,
          provider: selectedProvider
        })
      }

    } catch (error) {
      console.error('iSpeak AI Error:', error)
      const errorMessage = `I'm having trouble thinking clearly... ${error.message}`
      setResponse(errorMessage)
      speakText(errorMessage)
    }
  }

  // Voice Setup
  useEffect(() => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices()
      setAvailableVoices(voices)

      if (!selectedVoice && voices.length > 0) {
        const bestVoice = voices.find(v => 
          v.lang.startsWith(outputLanguage) && 
          (v.name.includes('Enhanced') || v.name.includes('Premium') || v.name.includes('Neural'))
        ) || voices.find(v => v.lang.startsWith(outputLanguage)) || voices[0]

        setSelectedVoice(bestVoice?.name || "")
      }
    }

    loadVoices()
    speechSynthesis.onvoiceschanged = loadVoices
    setTimeout(loadVoices, 100)
    setTimeout(loadVoices, 500)
    setTimeout(loadVoices, 1000)
  }, [outputLanguage])

  // Speech Recognition Setup
  useEffect(() => {
    if ("webkitSpeechRecognition" in window) {
      const rec = new window.webkitSpeechRecognition()
      rec.continuous = voiceActivated
      rec.interimResults = true
      rec.lang = outputLanguage

      rec.onstart = () => {
        setIsListening(true)
      }

      rec.onresult = async (event) => {
        const results = Array.from(event.results)
        const finalResult = results.find(result => result.isFinal)

        if (finalResult) {
          const text = finalResult[0].transcript.trim()
          if (text.length > 2) {
            setTranscript(text)
            await processWithAI(text)
          }
        }
      }

      rec.onerror = () => setIsListening(false)
      rec.onend = () => setIsListening(false)

      setRecognition(rec)
    }
  }, [voiceActivated, outputLanguage])

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      const voice = availableVoices.find(v => v.name === selectedVoice)

      if (voice) {
        utterance.voice = voice
      }

      utterance.rate = voiceSpeed
      utterance.pitch = 0.8
      utterance.volume = 0.85
      speechSynthesis.speak(utterance)
    }
  }

  const startListening = () => {
    if (recognition && !isListening) {
      recognition.start()
    }
  }

  const toggleVoiceActivation = () => {
    setVoiceActivated(!voiceActivated)
    if (!voiceActivated) {
      startListening()
    } else {
      if (recognition && isListening) {
        recognition.stop()
      }
    }
  }

  // Widget Dragging
  const handleMouseDown = (e) => {
    if (embeddedMode) return
    setIsDragging(true)
    e.preventDefault()
  }

  const handleMouseMove = (e) => {
    if (isDragging && !embeddedMode) {
      setPosition({
        x: e.clientX - 150,
        y: e.clientY - 25
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging])

  // Widget Style
  const widgetStyle = {
    position: embeddedMode ? 'relative' : 'fixed',
    top: embeddedMode ? 'auto' : `${position.y}px`,
    left: embeddedMode ? 'auto' : `${position.x}px`,
    width: embeddedMode ? '100%' : (isMinimized ? '300px' : '400px'),
    maxHeight: isMinimized ? '60px' : '500px',
    backgroundColor: currentTheme.bg,
    border: `2px solid ${currentTheme.primary}`,
    borderRadius: '15px',
    padding: isMinimized ? '10px' : '20px',
    color: currentTheme.text,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    boxShadow: `0 10px 25px ${currentTheme.glow}`,
    zIndex: embeddedMode ? 'auto' : '9999',
    cursor: embeddedMode ? 'auto' : 'move',
    transition: 'all 0.3s ease',
    overflow: 'hidden'
  }

  return (
    <div 
      style={widgetStyle}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: isMinimized ? '0' : '15px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: currentTheme.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            animation: isListening ? 'pulse 1s infinite' : 'none'
          }}>
            🧠
          </div>
          <h3 style={{
            margin: 0,
            color: currentTheme.primary,
            fontSize: '16px',
            fontWeight: '600'
          }}>
            iSpeak Widget
          </h3>
          <div style={{
            fontSize: '10px',
            backgroundColor: `${currentTheme.accent}30`,
            padding: '2px 6px',
            borderRadius: '8px',
            color: currentTheme.accent
          }}>
            {selectedProvider.toUpperCase()}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '5px' }}>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            style={{
              background: 'none',
              border: 'none',
              color: currentTheme.text,
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {isMinimized ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Response Area */}
          <div style={{
            padding: '15px',
            backgroundColor: `${currentTheme.primary}15`,
            borderRadius: '10px',
            marginBottom: '15px',
            maxHeight: '120px',
            overflowY: 'auto',
            border: `1px solid ${currentTheme.border}`
          }}>
            <p style={{
              margin: 0,
              fontSize: '14px',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap'
            }}>
              {response}
            </p>
          </div>

          {/* Voice Controls */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '15px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={voiceActivated ? null : startListening}
              disabled={voiceActivated}
              style={{
                padding: '8px 12px',
                backgroundColor: isListening ? currentTheme.accent : currentTheme.primary,
                color: currentTheme.bg,
                border: 'none',
                borderRadius: '6px',
                cursor: voiceActivated ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                opacity: voiceActivated ? 0.5 : 1
              }}
            >
              {isListening ? "● Listening" : "🎤 Talk"}
            </button>

            <button
              onClick={toggleVoiceActivation}
              style={{
                padding: '8px 12px',
                backgroundColor: voiceActivated ? '#ef4444' : currentTheme.accent,
                color: currentTheme.bg,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              {voiceActivated ? "⏹ Stop" : "▶ Always On"}
            </button>

            <button
              onClick={() => speakText("Hello, I'm iSpeak widget. I'm here to help you.")}
              style={{
                padding: '8px 12px',
                backgroundColor: `${currentTheme.primary}50`,
                color: currentTheme.text,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🔊 Test
            </button>
          </div>

          {/* Provider Selection */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '15px',
            alignItems: 'center'
          }}>
            <select 
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              style={{
                flex: 1,
                padding: '6px 8px',
                backgroundColor: currentTheme.bg,
                color: currentTheme.primary,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              <option value="groq">🚀 Groq</option>
              <option value="openai">🧠 OpenAI</option>
              <option value="anthropic">🤖 Claude</option>
            </select>
          </div>

          {/* Input Area */}
          {transcript && (
            <div style={{
              padding: '10px',
              backgroundColor: `${currentTheme.accent}15`,
              borderRadius: '8px',
              fontSize: '12px',
              border: `1px solid ${currentTheme.border}`
            }}>
              <strong>You said:</strong> {transcript}
            </div>
          )}

          {/* Status */}
          <div style={{
            marginTop: '10px',
            fontSize: '10px',
            color: `${currentTheme.text}70`,
            textAlign: 'center'
          }}>
            Provider: {selectedProvider.toUpperCase()} • Voice: {voiceSpeed}x speed
          </div>
        </>
      )}

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  )
}

export default iSpeakWidget

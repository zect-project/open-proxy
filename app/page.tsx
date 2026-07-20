'use client'

import { useState, useEffect } from 'react'

export default function Home() {
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [activeTab, setActiveTab] = useState<'opencode' | 'openai' | 'curl'>('opencode')

  useEffect(() => {
    setBaseUrl(window.location.origin + '/api/gemini')
    const saved = localStorage.getItem('gemini_api_key')
    if (saved) setApiKey(saved)
  }, [])

  const saveKey = () => {
    localStorage.setItem('gemini_api_key', apiKey)
    setStatus({ type: 'success', message: 'API ключ сохранён в браузере' })
  }

  const testConnection = async () => {
    if (!apiKey) {
      setStatus({ type: 'error', message: 'Введите API ключ' })
      return
    }

    setTesting(true)
    setStatus(null)

    try {
      const res = await fetch(`${baseUrl}/v1beta/models?key=${apiKey}`)
      const data = await res.json()

      if (res.ok && data.models) {
        setStatus({
          type: 'success',
          message: `✓ Прокси работает! Доступно моделей: ${data.models.length}`
        })
      } else {
        setStatus({
          type: 'error',
          message: `✗ Ошибка: ${data.error?.message || 'Неизвестная ошибка'}`
        })
      }
    } catch (e: any) {
      setStatus({ type: 'error', message: `✗ Ошибка соединения: ${e.message}` })
    } finally {
      setTesting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const opencodeConfig = `{
  "provider": {
    "name": "gemini-proxy",
    "type": "openai",
    "baseURL": "${baseUrl}/v1beta/openai",
    "apiKey": "${apiKey || 'YOUR_GEMINI_API_KEY'}"
  },
  "model": "gemini-2.0-flash-exp"
}`

  const openaiCompatConfig = `# OpenAI-совместимый формат
Base URL: ${baseUrl}/v1beta/openai
API Key: ${apiKey || 'YOUR_GEMINI_API_KEY'}
Model: gemini-2.0-flash-exp`

  const curlExample = `curl -X POST "${baseUrl}/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey || 'YOUR_GEMINI_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "contents": [{
      "parts": [{"text": "Привет, как дела?"}]
    }]
  }'`

  return (
    <div className="container">
      <h1>🔮 Gemini API Proxy</h1>
      <p className="subtitle">Прокси для использования Gemini API без VPN</p>

      <div className="card">
        <h2>🔑 Настройка API ключа</h2>
        <div className="input-group">
          <label>Gemini API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza..."
          />
        </div>
        <button onClick={saveKey}>💾 Сохранить ключ</button>
        <button onClick={testConnection} disabled={testing} style={{ marginLeft: 10 }}>
          {testing ? '⏳ Проверка...' : '🧪 Тест соединения'}
        </button>
        {status && (
          <div className={`status ${status.type}`}>
            {status.message}
          </div>
        )}
      </div>

      <div className="card">
        <h2>🌐 URL прокси</h2>
        <div className="code-block">
          <button className="copy-btn" onClick={() => copyToClipboard(baseUrl)}>
            📋 Копировать
          </button>
          {baseUrl}
        </div>
        <div className="info">
          <strong>OpenAI-совместимый URL:</strong><br />
          <code>{baseUrl}/v1beta/openai</code>
        </div>
      </div>

      <div className="card">
        <h2>📖 Инструкции по подключению</h2>
        
        <div className="tabs">
          <div 
            className={`tab ${activeTab === 'opencode' ? 'active' : ''}`}
            onClick={() => setActiveTab('opencode')}
          >
            OpenCode
          </div>
          <div 
            className={`tab ${activeTab === 'openai' ? 'active' : ''}`}
            onClick={() => setActiveTab('openai')}
          >
            OpenAI Compatible
          </div>
          <div 
            className={`tab ${activeTab === 'curl' ? 'active' : ''}`}
            onClick={() => setActiveTab('curl')}
          >
            cURL
          </div>
        </div>

        {activeTab === 'opencode' && (
          <>
            <p style={{ marginBottom: 12, color: '#aaa' }}>
              Добавьте в конфигурацию opencode:
            </p>
            <div className="code-block">
              <button className="copy-btn" onClick={() => copyToClipboard(opencodeConfig)}>
                📋 Копировать
              </button>
              {opencodeConfig}
            </div>
            <div className="info" style={{ marginTop: 12 }}>
              💡 Или используйте переменные окружения:<br />
              <code>OPENAI_BASE_URL={baseUrl}/v1beta/openai</code><br />
              <code>OPENAI_API_KEY={apiKey || 'YOUR_KEY'}</code>
            </div>
          </>
        )}

        {activeTab === 'openai' && (
          <div className="code-block">
            <button className="copy-btn" onClick={() => copyToClipboard(openaiCompatConfig)}>
              📋 Копировать
            </button>
            {openaiCompatConfig}
          </div>
        )}

        {activeTab === 'curl' && (
          <div className="code-block">
            <button className="copy-btn" onClick={() => copyToClipboard(curlExample)}>
              📋 Копировать
            </button>
            {curlExample}
          </div>
        )}
      </div>

      <div className="card">
        <h2>ℹ️ Как это работает</h2>
        <div className="info">
          <p style={{ marginBottom: 8 }}>
            Этот прокси перенаправляет запросы с вашего приложения на Gemini API через сервера Vercel, 
            которые доступны без VPN.
          </p>
          <p style={{ marginBottom: 8 }}>
            <strong>Поддерживаемые эндпоинты:</strong>
          </p>
          <ul style={{ paddingLeft: 20, lineHeight: 1.8 }}>
            <li><code>/v1beta/models/*</code> — нативный Gemini API</li>
            <li><code>/v1beta/openai/*</code> — OpenAI-совместимый API</li>
            <li>Streaming responses (SSE)</li>
          </ul>
          <p style={{ marginTop: 12 }}>
            🔒 API ключ хранится только в вашем браузере и передаётся напрямую в запросах.
          </p>
        </div>
      </div>
    </div>
  )
}

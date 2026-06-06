'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Wifi, WifiOff, QrCode, MessageSquare, Loader2,
  Save, Phone, Send, Eye, EyeOff, RefreshCw,
} from 'lucide-react'

type ConnStatus = 'loading' | 'unconfigured' | 'disconnected' | 'connecting' | 'connected' | 'error'

interface WaConfig {
  api_url: string
  api_key: string
  instance_name: string
}

const STATUS_MAP: Record<ConnStatus, { label: string; color: string; dot: string; pulse?: boolean }> = {
  loading:      { label: 'Verificando...',  color: '#6B7280', dot: '#9CA3AF' },
  unconfigured: { label: 'Sin configurar',  color: '#F97316', dot: '#FB923C' },
  disconnected: { label: 'Desconectado',    color: '#EF4444', dot: '#F87171' },
  connecting:   { label: 'Conectando...',   color: '#FBBF24', dot: '#FCD34D', pulse: true },
  connected:    { label: 'Conectado',       color: '#22C55E', dot: '#4ADE80' },
  error:        { label: 'Error',           color: '#EF4444', dot: '#F87171' },
}

const BTN =
  'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-ui font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed'
const BTN_PRIMARY = `${BTN} bg-primary text-white hover:bg-primary/90`
const BTN_OUTLINE = `${BTN} border border-brand-border text-brand-text hover:bg-brand-card`
const BTN_DANGER  = `${BTN} border border-red-500/30 text-red-400 hover:bg-red-500/10`
const INPUT =
  'w-full border border-brand-border rounded-xl px-3 py-2 text-sm text-white bg-[#161616] focus:outline-none focus:border-primary placeholder:text-white/30 font-body'

export default function AdminWhatsAppPage() {
  const [config, setConfig] = useState<WaConfig>({
    api_url: '',
    api_key: '',
    instance_name: 'rifandoplus',
  })
  const [status, setStatus]       = useState<ConnStatus>('loading')
  const [qrBase64, setQrBase64]   = useState<string | null>(null)
  const [savingCfg, setSavingCfg] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [showKey, setShowKey]     = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [testMsg, setTestMsg]     = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [qrError, setQrError]     = useState<string | null>(null)

  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const qrRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    loadConfig()
    return () => stopTimers()
  }, [])

  const stopTimers = () => {
    if (pollRef.current)      clearInterval(pollRef.current)
    if (qrRefreshRef.current) clearInterval(qrRefreshRef.current)
  }

  const loadConfig = async () => {
    try {
      const res  = await fetch('/api/admin/whatsapp/config')
      const data = await res.json()
      if (data.api_url) {
        setConfig({
          api_url:       data.api_url ?? '',
          api_key:       data.api_key ?? '',
          instance_name: data.instance_name ?? 'rifandoplus',
        })
        await checkStatus()
      } else {
        setStatus('unconfigured')
      }
    } catch {
      setStatus('error')
    }
  }

  const checkStatus = async () => {
    try {
      const res  = await fetch('/api/admin/whatsapp/status')
      const data = await res.json()
      if (data.state === 'open') {
        setStatus('connected')
        setQrBase64(null)
        stopTimers()
      } else if (data.state === 'unconfigured') {
        setStatus('unconfigured')
      } else {
        setStatus('disconnected')
      }
    } catch {
      setStatus('error')
    }
  }

  const saveConfig = async () => {
    setSavingCfg(true)
    try {
      const res = await fetch('/api/admin/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error()
      toast.success('Configuración guardada')
      await checkStatus()
    } catch {
      toast.error('Error al guardar la configuración')
    } finally {
      setSavingCfg(false)
    }
  }

  const fetchQR = async () => {
    setQrError(null)
    try {
      const res  = await fetch('/api/admin/whatsapp/qr')
      const data = await res.json()
      if (data.base64) {
        setQrBase64(data.base64)
      } else if (data.error) {
        setQrError(data.error)
      }
    } catch {
      setQrError('No se pudo obtener el código QR')
    }
  }

  const connect = async () => {
    setConnecting(true)
    setStatus('connecting')
    setQrBase64(null)
    setQrError(null)

    // Create/ensure the instance exists
    await fetch('/api/admin/whatsapp/instance', { method: 'POST' })

    // Small delay so Evolution API has a moment to register the instance
    await new Promise(r => setTimeout(r, 1200))

    // Fetch QR
    await fetchQR()
    setConnecting(false)

    // Poll connection state every 5 s
    pollRef.current = setInterval(async () => {
      const res  = await fetch('/api/admin/whatsapp/status')
      const data = await res.json()
      if (data.state === 'open') {
        setStatus('connected')
        setQrBase64(null)
        stopTimers()
        toast.success('¡WhatsApp conectado correctamente!')
      }
    }, 5000)

    // Refresh QR every 45 s (before it expires)
    qrRefreshRef.current = setInterval(fetchQR, 45000)
  }

  const disconnect = async () => {
    stopTimers()
    try {
      const res = await fetch('/api/admin/whatsapp/disconnect', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setStatus('disconnected')
      setQrBase64(null)
      toast.success('WhatsApp desconectado')
    } catch {
      toast.error('Error al desconectar')
    }
  }

  const cancelConnect = () => {
    stopTimers()
    setStatus('disconnected')
    setQrBase64(null)
    setQrError(null)
  }

  const sendTest = async () => {
    if (!testPhone.trim() || !testMsg.trim()) {
      toast.error('Ingresa teléfono y mensaje')
      return
    }
    setSendingTest(true)
    try {
      const res = await fetch('/api/admin/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: testPhone.trim(), text: testMsg.trim() }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Error al enviar el mensaje')
        return
      }
      toast.success('Mensaje enviado correctamente')
      setTestMsg('')
    } catch {
      toast.error('Error al enviar el mensaje')
    } finally {
      setSendingTest(false)
    }
  }

  const st = STATUS_MAP[status]

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Title */}
      <div>
        <h1 className="font-title text-4xl text-brand-text tracking-wide">WHATSAPP</h1>
        <p className="text-brand-muted text-sm font-body mt-1">
          Conecta tu número vía Evolution API para envío automático de mensajes.
        </p>
      </div>

      {/* Status card */}
      <div className="bg-brand-card border border-brand-border rounded-2xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={st.pulse ? 'animate-pulse' : ''}
            style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: st.dot, flexShrink: 0 }}
          />
          <div>
            <p className="font-ui font-semibold text-brand-text text-sm">Estado de la conexión</p>
            <p className="text-xs font-body mt-0.5" style={{ color: st.color }}>{st.label}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {status === 'loading' && (
            <Loader2 className="w-4 h-4 animate-spin text-brand-muted" />
          )}
          {(status === 'disconnected' || status === 'error') && (
            <button onClick={connect} disabled={connecting} className={BTN_PRIMARY}>
              {connecting
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Wifi className="w-3.5 h-3.5" />}
              Conectar
            </button>
          )}
          {status === 'connected' && (
            <>
              <button onClick={checkStatus} title="Verificar estado" className={BTN_OUTLINE}>
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button onClick={disconnect} className={BTN_DANGER}>
                <WifiOff className="w-3.5 h-3.5" />
                Desconectar
              </button>
            </>
          )}
          {status === 'connecting' && (
            <button onClick={cancelConnect} className={BTN_OUTLINE}>
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* QR Code */}
      {status === 'connecting' && (
        <div className="bg-brand-card border border-brand-border rounded-2xl p-6 flex flex-col items-center gap-5">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            <h2 className="font-ui font-semibold text-brand-text">Escanea el código QR</h2>
          </div>

          {qrBase64 ? (
            <div className="p-3 border border-brand-border rounded-xl bg-white">
              <img src={qrBase64} alt="QR WhatsApp" style={{ width: 224, height: 224, display: 'block' }} />
            </div>
          ) : qrError ? (
            <div className="text-center px-4">
              <p className="text-sm text-red-500 font-body">{qrError}</p>
              <button onClick={fetchQR} className={`${BTN_OUTLINE} mt-3`}>
                <RefreshCw className="w-3.5 h-3.5" /> Reintentar
              </button>
            </div>
          ) : (
            <div className="w-56 h-56 bg-brand-card rounded-xl flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-brand-muted" />
            </div>
          )}

          <div className="text-center max-w-xs">
            <p className="text-sm text-brand-muted font-body leading-relaxed">
              Abre WhatsApp en tu teléfono →{' '}
              <strong>Dispositivos vinculados</strong> →{' '}
              <strong>Vincular un dispositivo</strong>
            </p>
            <p className="text-xs text-brand-muted/60 font-body mt-2 flex items-center justify-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Esperando que escanees el código...
            </p>
          </div>
        </div>
      )}

      {/* Config form */}
      <div className="bg-brand-card border border-brand-border rounded-2xl p-6 space-y-5">
        <div>
          <h2 className="font-ui font-semibold text-brand-text text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            Configuración de Evolution API
          </h2>
          <p className="text-brand-muted text-xs font-body mt-1">
            Requiere un servidor con Evolution API.{' '}
            <a
              href="https://doc.evolution-api.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Ver documentación
            </a>
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-ui font-semibold text-brand-muted mb-1.5 block">
              URL del servidor
            </label>
            <input
              value={config.api_url}
              onChange={e => setConfig(c => ({ ...c, api_url: e.target.value }))}
              placeholder="http://tu-servidor:8080"
              className={INPUT}
            />
          </div>

          <div>
            <label className="text-xs font-ui font-semibold text-brand-muted mb-1.5 block">
              API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={config.api_key}
                onChange={e => setConfig(c => ({ ...c, api_key: e.target.value }))}
                placeholder="••••••••••••••••"
                className={`${INPUT} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-ui font-semibold text-brand-muted mb-1.5 block">
              Nombre de instancia
            </label>
            <input
              value={config.instance_name}
              onChange={e => setConfig(c => ({ ...c, instance_name: e.target.value }))}
              placeholder="rifandoplus"
              className={INPUT}
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button onClick={saveConfig} disabled={savingCfg} className={BTN_PRIMARY}>
            {savingCfg
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Save className="w-4 h-4" />}
            Guardar configuración
          </button>
        </div>
      </div>

      {/* Test message — only when connected */}
      {status === 'connected' && (
        <div className="bg-brand-card border border-brand-border rounded-2xl p-6 space-y-4">
          <h2 className="font-ui font-semibold text-brand-text text-base flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            Mensaje de prueba
          </h2>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-ui font-semibold text-brand-muted mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Teléfono (con código de país, solo números)
              </label>
              <input
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                placeholder="523317385212"
                className={INPUT}
              />
              <p className="text-xs text-brand-muted/60 font-body mt-1">
                Ejemplo México: 52 + 10 dígitos = 523317385212
              </p>
            </div>

            <div>
              <label className="text-xs font-ui font-semibold text-brand-muted mb-1.5 block">
                Mensaje
              </label>
              <textarea
                value={testMsg}
                onChange={e => setTestMsg(e.target.value)}
                placeholder="Hola, este es un mensaje de prueba desde RifandoPlus..."
                rows={3}
                className={`${INPUT} resize-none`}
              />
            </div>

            <div className="flex justify-end">
              <button onClick={sendTest} disabled={sendingTest} className={BTN_PRIMARY}>
                {sendingTest
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />}
                Enviar prueba
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info note */}
      <div
        className="rounded-xl p-4 text-sm font-body"
        style={{
          background: 'rgba(59,130,246,0.06)',
          border: '1px solid rgba(59,130,246,0.15)',
          color: '#3B82F6',
        }}
      >
        <strong className="font-ui">Mensajes automáticos:</strong> El sistema enviará mensajes al
        aprobar o pausar un sorteo, y al confirmar compras de boletos. El número conectado aquí
        es el que recibirán los clientes.
      </div>

    </div>
  )
}

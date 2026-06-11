import { useEffect, useRef, useState } from 'react'

// Web Speech API — free, on-device/browser. Not available in iOS Safari/PWA
// (use the keyboard's dictation mic there); we degrade gracefully.
function getRecognition(): any {
  const w = window as any
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export function useSpeechRecognition() {
  const Ctor = getRecognition()
  const supported = !!Ctor
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recRef = useRef<any>(null)

  useEffect(() => () => recRef.current?.stop?.(), [])

  const start = () => {
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.continuous = false
    rec.onresult = (e: any) => {
      let txt = ''
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript
      setTranscript(txt)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    setTranscript('')
    setListening(true)
    rec.start()
  }

  const stop = () => {
    recRef.current?.stop?.()
    setListening(false)
  }

  return { supported, listening, transcript, setTranscript, start, stop }
}

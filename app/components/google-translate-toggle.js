'use client'

import { useEffect, useMemo, useState } from 'react'
import Script from 'next/script'

const COOKIE_NAME = 'googtrans'
const DEFAULT_FROM = 'en'
const SUPPORTED = ['en', 'de']

function setGoogTransCookie(to) {
  const value = `/${DEFAULT_FROM}/${to}`
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=31536000`
}

function getLangFromCookie() {
  const match = document.cookie.match(/(?:^|;\s*)googtrans=\/en\/(\w+)/)
  return match && match[1] === 'de' ? 'de' : 'en'
}

function hardHideGoogleUI() {
  // Hide any injected Google gadget UI
  const nodes = document.querySelectorAll(
    '.goog-te-gadget, .goog-te-gadget-simple, .goog-te-gadget-icon, .goog-logo-link, .VIpgJd-ZVi9od-l4eHX-hSRGPd'
  )
  nodes.forEach((el) => {
    el.style.display = 'none'
    el.style.visibility = 'hidden'
    el.style.height = '0'
    el.style.overflow = 'hidden'
  })

  // Hide banner iframe if it appears
  const banner = document.querySelector('.goog-te-banner-frame')
  if (banner) {
    banner.style.display = 'none'
    banner.style.visibility = 'hidden'
    banner.style.height = '0'
  }

  // Undo Google pushing body down
  document.body.style.top = '0px'
}

export default function GoogleTranslateToggle() {
  const [lang, setLang] = useState('en')
  const [ready, setReady] = useState(false)

  const elementId = useMemo(() => `gt-el-${Math.random().toString(16).slice(2)}`, [])

  useEffect(() => {
    setLang(getLangFromCookie())
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    window.googleTranslateElementInit = () => {
      try {
        if (!window.google?.translate?.TranslateElement) {
          setReady(true)
          return
        }

        // Mount widget into OFFSCREEN div (not display:none)
        new window.google.translate.TranslateElement(
          {
            pageLanguage: DEFAULT_FROM,
            includedLanguages: SUPPORTED.join(','),
            autoDisplay: false,
          },
          elementId
        )

        setReady(true)

        // Aggressively hide any UI Google injects
        hardHideGoogleUI()
        setTimeout(hardHideGoogleUI, 200)
        setTimeout(hardHideGoogleUI, 800)
      } catch (e) {
        setReady(true)
      }
    }
  }, [elementId])

  useEffect(() => {
    if (!ready) return
    const i = setInterval(hardHideGoogleUI, 800)
    return () => clearInterval(i)
  }, [ready])

  const toggle = () => {
    if (!ready) return
    const next = lang === 'en' ? 'de' : 'en'
    setGoogTransCookie(next)
    setLang(next)
    window.location.reload()
  }

  return (
    <>
      <Script
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
        onLoad={() => setTimeout(() => window.googleTranslateElementInit?.(), 50)}
        onError={() => setReady(true)}
      />

      {/* IMPORTANT: offscreen, not display:none */}
      <div
        id={elementId}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '-9999px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          opacity: 0,
          pointerEvents: 'none',
        }}
      />

      <button
        type="button"
        onClick={toggle}
     
        className="px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        title={lang === 'en' ? 'Switch to German (DE)' : 'Switch to English (EN)'}
      >
        {lang === 'en' ? 'DE' : 'EN'} ⇄
      </button>
    </>
  )
}

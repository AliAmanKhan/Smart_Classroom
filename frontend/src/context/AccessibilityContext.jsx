import { createContext, useContext, useState, useEffect } from 'react'

const AccessibilityContext = createContext(null)

export function AccessibilityProvider({ children }) {
  const [fontSize, setFontSizeState] = useState(
    () => localStorage.getItem('a11y-font-size') || 'medium'
  )
  const [theme, setThemeState] = useState(
    () => localStorage.getItem('a11y-theme') || 'light'
  )

  // Apply font size to <html>
  const applyFontSize = (size) => {
    const root = document.documentElement
    root.classList.remove('font-small', 'font-medium', 'font-large')
    root.classList.add(`font-${size}`)
  }

  // Apply theme to <html>
  const applyTheme = (t) => {
    const root = document.documentElement
    root.classList.remove('theme-light', 'theme-dark', 'theme-high-contrast')
    root.classList.add(`theme-${t}`)
  }

  // On mount, apply saved preferences
  useEffect(() => {
    applyFontSize(fontSize)
    applyTheme(theme)
  }, [])

  const setFontSize = (size) => {
    setFontSizeState(size)
    localStorage.setItem('a11y-font-size', size)
    applyFontSize(size)
  }

  const setTheme = (t) => {
    setThemeState(t)
    localStorage.setItem('a11y-theme', t)
    applyTheme(t)
  }

  return (
    <AccessibilityContext.Provider value={{ fontSize, setFontSize, theme, setTheme }}>
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext)
  if (!ctx) throw new Error('useAccessibility must be used within AccessibilityProvider')
  return ctx
}

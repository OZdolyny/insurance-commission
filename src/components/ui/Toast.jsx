import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'
import { cn } from '../../lib/utils'

const ToastContext = createContext(null)

const DURATION = { success: 3000, error: 6000 }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(1)

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const show = useCallback((type, message) => {
    const id = nextId.current++
    setToasts((current) => [...current, { id, type, message }])
    setTimeout(() => dismiss(id), DURATION[type])
  }, [dismiss])

  const api = useMemo(() => ({
    success: (message) => show('success', message),
    error: (message) => show('error', message),
  }), [show])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2 sm:left-auto sm:w-96"
      >
        {toasts.map((toast) => {
          const Icon = toast.type === 'success' ? CheckCircle2 : AlertCircle
          return (
            <div
              key={toast.id}
              role={toast.type === 'error' ? 'alert' : 'status'}
              className={cn(
                'pointer-events-auto flex w-full items-start gap-3 rounded-xl border bg-popover p-4 text-sm shadow-popover',
                toast.type === 'success' ? 'border-success/30 text-success' : 'border-destructive/30 text-destructive'
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1 text-foreground">{toast.message}</span>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => dismiss(toast.id)}
                className="rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside <ToastProvider>')
  return context
}

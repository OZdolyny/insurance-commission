import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Dialog } from './Dialog'
import { Button } from './Button'

const ConfirmContext = createContext(null)

// Promise-based replacement for window.confirm():
//   const confirm = useConfirm()
//   if (!(await confirm({ title, message, confirmLabel, destructive }))) return
export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null)
  const resolver = useRef(null)

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolver.current = resolve
      setRequest(options)
    })
  }, [])

  const close = useCallback((result) => {
    resolver.current?.(result)
    resolver.current = null
    setRequest(null)
  }, [])

  const cancel = useCallback(() => close(false), [close])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={!!request} onClose={cancel} title={request?.title || 'Are you sure?'}>
        {request?.message && <p className="text-sm text-muted-foreground">{request.message}</p>}
        <div className="flex gap-2">
          <Button
            variant={request?.destructive ? 'destructive' : 'default'}
            className="flex-1"
            onClick={() => close(true)}
            autoFocus
          >
            {request?.confirmLabel || 'Confirm'}
          </Button>
          <Button variant="secondary" className="flex-1" onClick={cancel}>
            Cancel
          </Button>
        </div>
      </Dialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) throw new Error('useConfirm must be used inside <ConfirmProvider>')
  return context
}

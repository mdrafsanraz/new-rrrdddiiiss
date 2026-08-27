"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { CircleNotch } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { buttonVariants, type ButtonVariantProps } from "@/components/ui/button-variants"

function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonPrimitive.Props &
  ButtonVariantProps & {
    /** Shows an inline spinner and blocks re-submission (no double-click). */
    loading?: boolean
  }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading ? (
        <CircleNotch
          data-icon="inline-start"
          className="animate-spin"
          weight="bold"
          aria-hidden
        />
      ) : null}
      {children}
    </ButtonPrimitive>
  )
}

export { Button }

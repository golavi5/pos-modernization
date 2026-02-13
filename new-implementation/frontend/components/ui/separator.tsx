import * as React from "react"

const Separator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    orientation?: "horizontal" | "vertical"
    decorative?: boolean
  }
>(
  (
    {
      className,
      orientation = "horizontal",
      decorative = true,
      ...props
    },
    ref
  ) => (
    <div
      ref={ref}
      role={decorative ? "none" : "separator"}
      aria-orientation={orientation === "vertical" ? "vertical" : "horizontal"}
      className={`shrink-0 bg-border ${
        orientation === "vertical" ? "h-full w-[1px]" : "h-[1px] w-full"
      } ${className || ''}`}
      {...props}
    />
  )
)
Separator.displayName = "Separator"

export { Separator }
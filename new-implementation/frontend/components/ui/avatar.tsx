import * as React from "react"

const Avatar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`relative inline-flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted ${className || ''}`}
    {...props}
  />
))
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement>
>(({ className, ...props }, ref) => (
  // No angle-bracket tag in the comment below, on purpose: the i18n ratchet
  // anchors on JSX tags, so a literal tag inside a comment makes the prose after
  // it read as renderable text and fails that check.
  // eslint-disable-next-line @next/next/no-img-element -- generic image wrapper: the caller supplies an arbitrary remote src with no known dimensions, and next/image needs width/height or a sized fill parent
  <img
    alt=""
    ref={ref}
    className={`aspect-square h-full w-full object-cover ${className || ''}`}
    {...props}
  />
))
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`flex h-full w-full items-center justify-center bg-muted text-muted-foreground font-medium ${className || ''}`}
    {...props}
  />
))
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }
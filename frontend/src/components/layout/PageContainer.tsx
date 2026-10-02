import type { ReactNode } from "react"

interface PageContainerProps {
  children: ReactNode
  className?: string
}

export function PageContainer({
  children,
  className = "",
}: PageContainerProps) {
  return (
    <div
      className={`mx-auto w-full max-w-[1440px] px-4 py-6 md:px-6 lg:px-8 ${className}`}
    >
      {children}
    </div>
  )
}
type DashboardBrandProps = {
  name: string
  logoUrl?: string | null
  className?: string
}

export function DashboardBrand({
  name,
  logoUrl,
  className,
}: DashboardBrandProps) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={name}
        className={className ?? "h-8 w-auto max-w-[180px] object-contain"}
      />
    )
  }

  return (
    <p
      className={
        className ??
        "font-heading text-sm font-semibold text-sidebar-foreground"
      }
    >
      {name}
    </p>
  )
}

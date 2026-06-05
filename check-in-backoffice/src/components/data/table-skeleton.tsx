export function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid gap-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-10 rounded-md bg-muted" />
      ))}
    </div>
  )
}

import {
  Empty,
  EmptyDescription,
  EmptyHeader
} from '@/components/ui/empty'

export function EmptyState({ label }: { label: string }) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyDescription>{label}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

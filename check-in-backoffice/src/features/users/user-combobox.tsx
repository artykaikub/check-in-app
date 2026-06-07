"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandLoading
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import type { BackofficeUser } from "@/generated/api/model"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { listUsers } from "@/lib/api/backoffice"

const usersPerPage = 20

function getUserLabel(user: BackofficeUser) {
  return user.fullName ?? user.email ?? user.id
}

function getUserDescription(user: BackofficeUser) {
  const details = [user.employeeCode, user.email].filter(Boolean)
  return details.length > 0 ? details.join(" · ") : null
}

type UserComboboxProps = {
  value: string
  onValueChange: (value: string) => void
  selectedUser?: BackofficeUser | null | undefined
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function UserCombobox({
  value,
  onValueChange,
  selectedUser,
  disabled = false,
  placeholder,
  className
}: UserComboboxProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search.trim(), 300)

  const usersQuery = useInfiniteQuery({
    queryKey: ["backoffice-user-combobox", debouncedSearch],
    queryFn: ({ pageParam }) =>
      listUsers({
        page: pageParam,
        perPage: usersPerPage,
        ...(debouncedSearch ? { search: debouncedSearch } : {})
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const loadedCount = lastPage.page * lastPage.perPage
      return loadedCount < lastPage.total ? lastPage.page + 1 : undefined
    },
    enabled: open && !disabled
  })

  const users = useMemo(() => {
    const fetchedUsers = usersQuery.data?.pages.flatMap((page) => page.users) ?? []

    if (!selectedUser || fetchedUsers.some((user) => user.id === selectedUser.id)) {
      return fetchedUsers
    }

    return [selectedUser, ...fetchedUsers]
  }, [selectedUser, usersQuery.data?.pages])

  const selectedOption =
    selectedUser ?? users.find((user) => user.id === value) ?? null

  function handleListScroll(event: React.UIEvent<HTMLDivElement>) {
    const target = event.currentTarget
    const isNearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 32

    if (isNearBottom && usersQuery.hasNextPage && !usersQuery.isFetchingNextPage) {
      void usersQuery.fetchNextPage()
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className="truncate">
            {selectedOption ? getUserLabel(selectedOption) : placeholder ?? t("users.selectUser")}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width)" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            placeholder={t("users.searchPlaceholder")}
            onValueChange={setSearch}
          />
          <CommandList onScroll={handleListScroll}>
            {usersQuery.isLoading ? (
              <CommandLoading>
                <Loader2 className="mr-2 inline size-4 animate-spin" />
                {t("common.loading")}
              </CommandLoading>
            ) : null}
            {!usersQuery.isLoading ? <CommandEmpty>{t("users.empty")}</CommandEmpty> : null}
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.id}
                  onSelect={() => {
                    onValueChange(user.id)
                    setOpen(false)
                    setSearch("")
                  }}
                >
                  <Check
                    className={cn("size-4", value === user.id ? "opacity-100" : "opacity-0")}
                  />
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="truncate">{getUserLabel(user)}</span>
                    {getUserDescription(user) ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {getUserDescription(user)}
                      </span>
                    ) : null}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            {usersQuery.isFetchingNextPage ? (
              <CommandLoading>
                <Loader2 className="mr-2 inline size-4 animate-spin" />
                {t("common.loading")}
              </CommandLoading>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

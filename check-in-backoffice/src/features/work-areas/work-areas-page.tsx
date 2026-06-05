'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '@/components/data/empty-state'
import { ErrorBanner } from '@/components/data/error-banner'
import { TableSkeleton } from '@/components/data/table-skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import type { LatLngNode } from '@/generated/api/model'
import {
  createWorkLocation,
  getUserWorkArea,
  listUsers,
  listWorkLocations,
  setUserWorkArea,
  updateWorkLocation
} from '@/lib/api/backoffice'
import { getDefaultAreaNodes, MapAreaEditor } from './map-area-editor'

export function WorkAreasPage() {
  const queryClient = useQueryClient()
  const [locationName, setLocationName] = useState('')
  const [locationDescription, setLocationDescription] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [areaNodes, setAreaNodes] = useState<LatLngNode[]>(getDefaultAreaNodes())

  const usersQuery = useQuery({
    queryKey: ['backoffice-users', { page: 1, perPage: 50, search: userSearch }],
    queryFn: () => listUsers({ page: 1, perPage: 50, ...(userSearch ? { search: userSearch } : {}) })
  })
  const locationsQuery = useQuery({
    queryKey: ['work-locations'],
    queryFn: listWorkLocations
  })
  const workAreaQuery = useQuery({
    queryKey: ['user-work-area', selectedUserId],
    queryFn: () => getUserWorkArea(selectedUserId),
    enabled: Boolean(selectedUserId)
  })

  const activeLocations = useMemo(
    () => locationsQuery.data?.workLocations.filter((location) => location.isActive) ?? [],
    [locationsQuery.data?.workLocations]
  )

  useEffect(() => {
    if (!selectedUserId && usersQuery.data?.users[0]) {
      setSelectedUserId(usersQuery.data.users[0].id)
    }
  }, [selectedUserId, usersQuery.data?.users])

  useEffect(() => {
    if (!selectedLocationId && activeLocations[0]) {
      setSelectedLocationId(activeLocations[0].id)
    }
  }, [activeLocations, selectedLocationId])

  useEffect(() => {
    const workArea = workAreaQuery.data?.workArea

    if (!workArea) {
      return
    }

    setSelectedLocationId(workArea.workLocationId)
    setAreaNodes(workArea.areaNodes)
  }, [workAreaQuery.data?.workArea])

  const createLocationMutation = useMutation({
    mutationFn: () =>
      createWorkLocation({
        name: locationName,
        ...(locationDescription ? { description: locationDescription } : {}),
        isActive: true
      }),
    onSuccess: () => {
      setLocationName('')
      setLocationDescription('')
      queryClient.invalidateQueries({ queryKey: ['work-locations'] })
    }
  })
  const toggleLocationMutation = useMutation({
    mutationFn: (input: { id: string; isActive: boolean }) =>
      updateWorkLocation(input.id, { isActive: input.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['work-locations'] })
  })
  const saveAreaMutation = useMutation({
    mutationFn: () =>
      setUserWorkArea(selectedUserId, {
        workLocationId: selectedLocationId,
        areaNodes,
        isActive: true
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-work-area', selectedUserId] })
  })

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Work locations</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form
            className="grid gap-3 md:grid-cols-[1fr_1.4fr_auto]"
            onSubmit={(event) => {
              event.preventDefault()
              createLocationMutation.mutate()
            }}
          >
            <Input
              placeholder="Location name"
              value={locationName}
              onChange={(event) => setLocationName(event.target.value)}
              required
            />
            <Input
              placeholder="Description"
              value={locationDescription}
              onChange={(event) => setLocationDescription(event.target.value)}
            />
            <Button type="submit" disabled={createLocationMutation.isPending || !locationName}>
              <Plus className="size-4" />
              Add
            </Button>
          </form>

          {locationsQuery.isLoading ? <TableSkeleton rows={3} /> : null}
          {locationsQuery.isError ? <ErrorBanner error={locationsQuery.error} /> : null}
          {locationsQuery.data ? (
            locationsQuery.data.workLocations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-32 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locationsQuery.data.workLocations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell className="font-medium">{location.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {location.description ?? '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={location.isActive ? 'outline' : 'secondary'}>
                          {location.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={toggleLocationMutation.isPending}
                          onClick={() =>
                            toggleLocationMutation.mutate({
                              id: location.id,
                              isActive: !location.isActive
                            })
                          }
                        >
                          {location.isActive ? 'Disable' : 'Enable'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState label="No work locations yet" />
            )
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employee work area</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="user-search">Search user</Label>
              <Input
                id="user-search"
                value={userSearch}
                placeholder="Email, name, employee code"
                onChange={(event) => setUserSearch(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="employee">Employee</Label>
              <NativeSelect
                id="employee"
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
              >
                {(usersQuery.data?.users ?? []).map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName ?? user.email ?? user.id}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Work location</Label>
              <NativeSelect
                id="location"
                value={selectedLocationId}
                onChange={(event) => setSelectedLocationId(event.target.value)}
              >
                {activeLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          {workAreaQuery.isError ? <ErrorBanner error={workAreaQuery.error} /> : null}
          {saveAreaMutation.isError ? <ErrorBanner error={saveAreaMutation.error} /> : null}

          <MapAreaEditor value={areaNodes} onChange={setAreaNodes} />

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Textarea
              readOnly
              className="min-h-16 font-mono text-xs"
              value={JSON.stringify(areaNodes, null, 2)}
            />
            <Button
              className="md:w-40"
              disabled={!selectedUserId || !selectedLocationId || saveAreaMutation.isPending}
              onClick={() => saveAreaMutation.mutate()}
            >
              <Save className="size-4" />
              Save area
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

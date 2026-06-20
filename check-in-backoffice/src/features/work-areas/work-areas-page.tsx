'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/data/empty-state'
import { ErrorBanner } from '@/components/data/error-banner'
import { TableSkeleton } from '@/components/data/table-skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import type { LatLngNode } from '@/generated/api/model'
import { usePermissions } from '@/hooks/use-permissions'
import {
  createWorkLocation,
  getUserWorkArea,
  listWorkLocations,
  setUserWorkArea,
  updateWorkLocation
} from '@/lib/api/backoffice'
import { getErrorMessage } from '@/lib/api/errors'
import { useI18n } from '@/lib/i18n'
import { UserCombobox } from '../users/user-combobox'
import { getDefaultAreaNodes, MapAreaEditor } from './map-area-editor'

export function WorkAreasPage() {
  const queryClient = useQueryClient()
  const { locale, t } = useI18n()
  const { has, permissions } = usePermissions()
  const canManageWorkAreas = has(permissions.workAreasManage)
  const [locationName, setLocationName] = useState('')
  const [locationDescription, setLocationDescription] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [areaNodes, setAreaNodes] = useState<LatLngNode[]>(getDefaultAreaNodes())

  const locationsQuery = useQuery({
    queryKey: ['work-locations'],
    queryFn: listWorkLocations
  })
  const workAreaQuery = useQuery({
    queryKey: ['user-work-area', selectedUserId],
    queryFn: () => getUserWorkArea(selectedUserId),
    enabled: Boolean(selectedUserId)
  })

  // The shared WorkLocation schema is emitted as nullable (it is reused in a
  // nullable response elsewhere), so drop any nulls before use.
  const workLocations = useMemo(
    () =>
      (locationsQuery.data?.workLocations ?? []).filter(
        (location): location is NonNullable<typeof location> => location !== null
      ),
    [locationsQuery.data?.workLocations]
  )
  const activeLocations = useMemo(
    () => workLocations.filter((location) => location.isActive),
    [workLocations]
  )
  const workLocationsById = useMemo(
    () => new Map(workLocations.map((location) => [location.id, location])),
    [workLocations]
  )
  const savedWorkArea = workAreaQuery.data?.workArea ?? null
  const savedWorkLocation = savedWorkArea
    ? workLocationsById.get(savedWorkArea.workLocationId)
    : null

  useEffect(() => {
    if (!selectedLocationId && activeLocations[0]) {
      setSelectedLocationId(activeLocations[0].id)
    }
  }, [activeLocations, selectedLocationId])

  useEffect(() => {
    setAreaNodes(getDefaultAreaNodes())
  }, [selectedUserId])

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
      toast.success(t('workAreas.toastLocationCreated'))
    },
    onError: (error) =>
      toast.error(t('toast.actionFailed'), {
        description: getErrorMessage(error)
      })
  })
  const toggleLocationMutation = useMutation({
    mutationFn: (input: { id: string; isActive: boolean }) =>
      updateWorkLocation(input.id, { isActive: input.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-locations'] })
      toast.success(t('workAreas.toastLocationUpdated'))
    },
    onError: (error) =>
      toast.error(t('toast.actionFailed'), {
        description: getErrorMessage(error)
      })
  })
  const saveAreaMutation = useMutation({
    mutationFn: () =>
      setUserWorkArea(selectedUserId, {
        workLocationId: selectedLocationId,
        areaNodes,
        isActive: true
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-work-area', selectedUserId] })
      toast.success(t('workAreas.toastAreaSaved'))
    },
    onError: (error) =>
      toast.error(t('toast.actionFailed'), {
        description: getErrorMessage(error)
      })
  })

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('workAreas.locationsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {canManageWorkAreas ? (
          <form
            className="grid gap-3 md:grid-cols-[1fr_1.4fr_auto]"
            onSubmit={(event) => {
              event.preventDefault()
              createLocationMutation.mutate()
            }}
          >
            <Input
              placeholder={t('workAreas.locationName')}
              value={locationName}
              onChange={(event) => setLocationName(event.target.value)}
              required
            />
            <Input
              placeholder={t('common.description')}
              value={locationDescription}
              onChange={(event) => setLocationDescription(event.target.value)}
            />
            <Button type="submit" disabled={createLocationMutation.isPending || !locationName}>
              <Plus className="size-4" />
              {t('common.add')}
            </Button>
          </form>
          ) : null}

          {locationsQuery.isLoading ? <TableSkeleton rows={3} /> : null}
          {locationsQuery.isError ? <ErrorBanner error={locationsQuery.error} /> : null}
          {locationsQuery.data ? (
            workLocations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.name')}</TableHead>
                    <TableHead>{t('common.description')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead className="w-32 text-right">{t('common.action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workLocations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell className="font-medium">{location.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {location.description ?? '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={location.isActive ? 'outline' : 'secondary'}>
                          {location.isActive ? t('common.active') : t('common.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={toggleLocationMutation.isPending || !canManageWorkAreas}
                          onClick={() =>
                            toggleLocationMutation.mutate({
                              id: location.id,
                              isActive: !location.isActive
                            })
                          }
                        >
                          {location.isActive ? t('common.disable') : t('common.enable')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState label={t('workAreas.emptyLocations')} />
            )
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('workAreas.employeeAreaTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="employee">{t('common.employee')}</Label>
              <UserCombobox
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                placeholder={t('workAreas.userSearchPlaceholder')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">{t('workAreas.workLocation')}</Label>
              <Select
                value={selectedLocationId}
                onValueChange={setSelectedLocationId}
              >
                <SelectTrigger id="location">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activeLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {workAreaQuery.isError ? <ErrorBanner error={workAreaQuery.error} /> : null}
          {saveAreaMutation.isError ? <ErrorBanner error={saveAreaMutation.error} /> : null}

          <div className="grid gap-4 rounded-md border p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div className="grid gap-1">
                <div className="text-sm font-medium">{t('workAreas.currentAreaTitle')}</div>
                <div className="text-sm text-muted-foreground">
                  {t('workAreas.currentAreaDescription')}
                </div>
              </div>
              {savedWorkArea ? (
                <Badge variant={savedWorkArea.isActive ? 'outline' : 'secondary'}>
                  {savedWorkArea.isActive ? t('common.active') : t('common.inactive')}
                </Badge>
              ) : null}
            </div>

            {workAreaQuery.isLoading ? <TableSkeleton rows={2} /> : null}

            {!selectedUserId ? <EmptyState label={t('workAreas.selectUserToViewArea')} /> : null}

            {selectedUserId && workAreaQuery.data && !savedWorkArea ? (
              <EmptyState label={t('workAreas.emptyUserArea')} />
            ) : null}

            {savedWorkArea ? (
              <div className="grid gap-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="grid gap-1 rounded-md bg-muted p-3">
                    <div className="text-xs text-muted-foreground">
                      {t('workAreas.workLocation')}
                    </div>
                    <div className="text-sm font-medium">
                      {savedWorkLocation?.name ?? savedWorkArea.workLocationId}
                    </div>
                  </div>
                  <div className="grid gap-1 rounded-md bg-muted p-3">
                    <div className="text-xs text-muted-foreground">{t('common.created')}</div>
                    <div className="text-sm font-medium">
                      {new Date(savedWorkArea.createdAt).toLocaleString(locale)}
                    </div>
                  </div>
                  <div className="grid gap-1 rounded-md bg-muted p-3">
                    <div className="text-xs text-muted-foreground">
                      {t('workAreas.updatedAt')}
                    </div>
                    <div className="text-sm font-medium">
                      {new Date(savedWorkArea.updatedAt).toLocaleString(locale)}
                    </div>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('workAreas.node')}</TableHead>
                      <TableHead>{t('workAreas.lat')}</TableHead>
                      <TableHead>{t('workAreas.lng')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {savedWorkArea.areaNodes.map((node, index) => (
                      <TableRow key={`${node.lat}-${node.lng}-${index}`}>
                        <TableCell>
                          {t('workAreas.node')} {index + 1}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{node.lat}</TableCell>
                        <TableCell className="font-mono text-xs">{node.lng}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </div>

          <MapAreaEditor
            value={areaNodes}
            onChange={canManageWorkAreas ? setAreaNodes : () => undefined}
          />

          <div className="flex justify-end">
            <Button
              className="md:w-40"
              disabled={
                !selectedUserId ||
                !selectedLocationId ||
                saveAreaMutation.isPending ||
                !canManageWorkAreas
              }
              onClick={() => saveAreaMutation.mutate()}
            >
              <Save className="size-4" />
              {t('workAreas.saveArea')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

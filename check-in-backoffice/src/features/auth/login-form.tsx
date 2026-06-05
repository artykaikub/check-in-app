'use client'

import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { setStoredSession } from '@/lib/api/session'
import { signIn } from './auth-api'

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    typeof error.error === 'object' &&
    error.error !== null &&
    'message' in error.error &&
    typeof error.error.message === 'string'
  ) {
    return error.error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Sign in failed'
}

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: signIn,
    onSuccess: (response) => {
      if (!response.session) {
        return
      }

      setStoredSession({
        accessToken: response.session.accessToken,
        refreshToken: response.session.refreshToken
      })
      router.replace('/dashboard')
    }
  })

  const errorMessage = getErrorMessage(mutation.error)

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Backoffice</CardTitle>
        <CardDescription>Sign in with your team account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            mutation.mutate({ email, password })
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {mutation.isError ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : null}

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Sign in
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

import { defineConfig } from 'orval'

export default defineConfig({
  checkInBackend: {
    input: {
      target: './src/generated/openapi.json'
    },
    output: {
      mode: 'tags-split',
      target: './src/generated/api/check-in-backend.ts',
      schemas: './src/generated/api/model',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      override: {
        fetch: {
          includeHttpResponseReturnType: false
        },
        query: {
          options: {
            staleTime: 30000,
            refetchOnWindowFocus: false
          },
          useQuery: true,
          useMutation: true
        }
      }
    }
  }
})

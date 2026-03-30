import '@testing-library/jest-dom'

// Mock sonner (toast notifications)
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}))

// Mock AppLayout to avoid rendering sidebar/navbar in tests
vi.mock('@/components/layout/AppLayout', () => ({
  default: ({ children, title }) => (
    <div data-testid="app-layout">
      {title && <h1>{title}</h1>}
      {children}
    </div>
  ),
}))

// Mock LoadingSpinner
vi.mock('@/components/common/LoadingSpinner', () => ({
  LoadingPage: () => <div data-testid="loading">Chargement...</div>,
  Spinner: () => <div data-testid="spinner" />,
}))

// Mock StatusBadge
vi.mock('@/components/common/StatusBadge', () => ({
  AppointmentBadge: ({ status }) => <span data-testid="badge">{status}</span>,
}))

// Mock EmptyState
vi.mock('@/components/common/EmptyState', () => ({
  default: ({ title, description }) => (
    <div data-testid="empty-state">
      {title && <p>{title}</p>}
      {description && <p>{description}</p>}
    </div>
  ),
}))

// Reset mocks between tests
afterEach(() => {
  vi.clearAllMocks()
})

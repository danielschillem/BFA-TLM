import { useEffect, useState, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "@/api";
import { Spinner } from "@/components/common/LoadingSpinner";
import { useWebSocket } from "@/hooks/useWebSocket";
import { disconnectEcho } from "@/api/echo";

// Auth pages (eagerly loaded — first screens seen)
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import TwoFactor from "@/pages/auth/TwoFactor";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";

// Dashboards (eagerly loaded — immediate after login)
import DashboardPatient from "@/pages/dashboard/DashboardPatient";
import DashboardDoctor from "@/pages/dashboard/DashboardDoctor";
import DashboardAdmin from "@/pages/dashboard/DashboardAdmin";

// Lazy-loaded pages (loaded on navigation)
const DoctorSearch = lazy(() => import("@/pages/directory/DoctorSearch"));
const DoctorProfile = lazy(() => import("@/pages/directory/DoctorProfile"));
const BookAppointment = lazy(() => import("@/pages/directory/BookAppointment"));
const PatientBookAppointment = lazy(
  () => import("@/pages/directory/PatientBookAppointment"),
);
const AppointmentList = lazy(
  () => import("@/pages/appointments/AppointmentList"),
);
const AppointmentDetail = lazy(
  () => import("@/pages/appointments/AppointmentDetail"),
);
const WaitingRoom = lazy(() => import("@/pages/consultations/WaitingRoom"));
const ConsultationRoom = lazy(
  () => import("@/pages/consultations/ConsultationRoom"),
);
const ConsultationReport = lazy(
  () => import("@/pages/consultations/ConsultationReport"),
);
const ConsultationDetail = lazy(
  () => import("@/pages/consultations/ConsultationDetail"),
);
const PhysicalConsultation = lazy(
  () => import("@/pages/consultations/PhysicalConsultation"),
);
const ConsultationList = lazy(
  () => import("@/pages/consultations/ConsultationList"),
);
const TeleexpertiseList = lazy(
  () => import("@/pages/teleexpertise/TeleexpertiseList"),
);
const TeleexpertiseDetail = lazy(
  () => import("@/pages/teleexpertise/TeleexpertiseDetail"),
);
const TeleexpertiseRequest = lazy(
  () => import("@/pages/teleexpertise/TeleexpertiseRequest"),
);
const TeleexpertiseRespond = lazy(
  () => import("@/pages/teleexpertise/TeleexpertiseRespond"),
);
const DocumentList = lazy(() => import("@/pages/documents/DocumentList"));
const MessageInbox = lazy(() => import("@/pages/messages/MessageInbox"));
const UserProfile = lazy(() => import("@/pages/profile/UserProfile"));
const PrescriptionList = lazy(
  () => import("@/pages/prescriptions/PrescriptionList"),
);
const PrescriptionCreate = lazy(
  () => import("@/pages/prescriptions/PrescriptionCreate"),
);
const PatientRecord = lazy(() => import("@/pages/patients/PatientRecord"));
const PatientSearch = lazy(() => import("@/pages/patients/PatientSearch"));
const DoctorSchedule = lazy(() => import("@/pages/directory/DoctorSchedule"));
const GestionnaireManagement = lazy(
  () => import("@/pages/gestionnaire/GestionnaireManagement"),
);
const UserManagement = lazy(() => import("@/pages/admin/UserManagement"));
const AuditLogs = lazy(() => import("@/pages/admin/AuditLogs"));
const StructureManagement = lazy(
  () => import("@/pages/admin/StructureManagement"),
);
const AdminStats = lazy(() => import("@/pages/admin/AdminStats"));
const AnnouncementsAdmin = lazy(
  () => import("@/pages/admin/AnnouncementsAdmin"),
);
const GestionnaireAdmin = lazy(() => import("@/pages/admin/GestionnaireAdmin"));
const RoleManagement = lazy(() => import("@/pages/admin/RoleManagement"));
const PaymentList = lazy(() => import("@/pages/payments/PaymentList"));
const PaymentInitiate = lazy(() => import("@/pages/payments/PaymentInitiate"));
const LicenseManagement = lazy(() => import("@/pages/admin/LicenseManagement"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));

// Interopérabilité
const InteropDashboard = lazy(() => import("@/pages/interop/InteropDashboard"));
const FhirExplorer = lazy(() => import("@/pages/interop/FhirExplorer"));
const CdaViewer = lazy(() => import("@/pages/interop/CdaViewer"));
const TerminologyBrowser = lazy(
  () => import("@/pages/interop/TerminologyBrowser"),
);
const DicomViewer = lazy(() => import("@/pages/interop/DicomViewer"));
const Dhis2Dashboard = lazy(() => import("@/pages/interop/Dhis2Dashboard"));

// Certificats de décès
const CertificatDecesList = lazy(
  () => import("@/pages/certificats/CertificatDecesList"),
);
const CertificatDecesForm = lazy(
  () => import("@/pages/certificats/CertificatDecesForm"),
);
const CertificatDecesDetail = lazy(
  () => import("@/pages/certificats/CertificatDecesDetail"),
);
const MortalityStatistics = lazy(
  () => import("@/pages/certificats/MortalityStatistics"),
);

// Notifications & Consentements
const NotificationCenter = lazy(
  () => import("@/pages/notifications/NotificationCenter"),
);
const ConsentManagement = lazy(
  () => import("@/pages/consentements/ConsentManagement"),
);

// Errors
import NotFound from "@/pages/errors/NotFound";

// ── Route guards ──────────────────────────────────────────────────────────────

function useAuthGuard() {
  const { isAuthenticated, requiresTwoFactor } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated)
    return <Navigate to="/login" state={{ from: location }} replace />;
  if (requiresTwoFactor) return <Navigate to="/two-factor" replace />;
  return null;
}

// GuestRoute: redirige vers /dashboard si déjà connecté
function GuestRoute({ children }) {
  const { isAuthenticated, requiresTwoFactor } = useAuthStore();
  if (isAuthenticated && !requiresTwoFactor)
    return <Navigate to="/dashboard" replace />;
  return children;
}

// TwoFactorGuard: accès uniquement si 2FA est en attente
function TwoFactorGuard({ children }) {
  const { isAuthenticated, requiresTwoFactor, pendingUserId } = useAuthStore();
  if (isAuthenticated && !requiresTwoFactor)
    return <Navigate to="/dashboard" replace />;
  if (!requiresTwoFactor || !pendingUserId)
    return <Navigate to="/login" replace />;
  return children;
}

// ProtectedRoute: requires authentication
function ProtectedRoute({ children }) {
  const redirect = useAuthGuard();
  return redirect ?? children;
}

// RoleRoute: requires specific role(s)
function RoleRoute({ children, roles, fallback = "/dashboard" }) {
  const redirect = useAuthGuard();
  if (redirect) return redirect;
  const { user } = useAuthStore();
  const userRoles = user?.roles ?? [];
  const hasAccess = roles.some((r) => userRoles.includes(r));
  if (!hasAccess) return <Navigate to={fallback} replace />;
  return children;
}

// Shortcuts for common role gates
function DoctorRoute({ children }) {
  return (
    <RoleRoute roles={["doctor", "specialist", "health_professional"]}>
      {children}
    </RoleRoute>
  );
}

function PatientRoute({ children }) {
  return <RoleRoute roles={["patient"]}>{children}</RoleRoute>;
}

function AdminRoute({ children }) {
  return (
    <RoleRoute roles={["admin"]} fallback="/dashboard">
      {children}
    </RoleRoute>
  );
}

// SmartDashboard: redirect based on role
function SmartDashboard() {
  const { user } = useAuthStore();
  const role = user?.roles?.[0];

  if (role === "admin") return <DashboardAdmin />;
  if (role === "structure_manager")
    return <Navigate to="/gestionnaire" replace />;
  if (
    role === "doctor" ||
    role === "specialist" ||
    role === "health_professional"
  )
    return <DashboardDoctor />;
  return <DashboardPatient />;
}

// AuthInitializer: vérifie la validité du token au démarrage
function AuthInitializer({ children }) {
  const { isAuthenticated, setUser, logout } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setReady(true);
      return;
    }
    authApi
      .me()
      .then((res) => {
        const userData = res.data?.data ?? res.data;
        setUser(userData);
        setReady(true);
      })
      .catch(() => {
        logout();
        setReady(true);
      });
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-gray-500">Vérification de la session…</p>
      </div>
    );
  }
  return children;
}

// WebSocketConnector: initialise les canaux temps réel après l'authentification
function WebSocketConnector({ children }) {
  useWebSocket();
  return children;
}

export default function App() {
  return (
    <AuthInitializer>
      <WebSocketConnector>
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center">
              <Spinner size="lg" />
            </div>
          }
        >
          <Routes>
            {/* Public routes — redirigent si déjà connecté */}
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <Login />
                </GuestRoute>
              }
            />
            <Route
              path="/register"
              element={
                <GuestRoute>
                  <Register />
                </GuestRoute>
              }
            />
            <Route
              path="/two-factor"
              element={
                <TwoFactorGuard>
                  <TwoFactor />
                </TwoFactorGuard>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <GuestRoute>
                  <ForgotPassword />
                </GuestRoute>
              }
            />
            <Route
              path="/reset-password"
              element={
                <GuestRoute>
                  <ResetPassword />
                </GuestRoute>
              }
            />

            {/* Dashboard (tout rôle authentifié) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <SmartDashboard />
                </ProtectedRoute>
              }
            />

            {/* Annuaire */}
            <Route
              path="/directory"
              element={
                <ProtectedRoute>
                  <DoctorSearch />
                </ProtectedRoute>
              }
            />
            <Route
              path="/directory/:id"
              element={
                <ProtectedRoute>
                  <DoctorProfile />
                </ProtectedRoute>
              }
            />

            {/* Prise de rendez-vous par le patient */}
            <Route
              path="/directory/:doctorId/book"
              element={
                <ProtectedRoute>
                  <PatientBookAppointment />
                </ProtectedRoute>
              }
            />

            {/* Prise de rendez-vous par le PS */}
            <Route
              path="/appointments/new"
              element={
                <DoctorRoute>
                  <BookAppointment />
                </DoctorRoute>
              }
            />
            <Route
              path="/appointments/new/:patientId"
              element={
                <DoctorRoute>
                  <BookAppointment />
                </DoctorRoute>
              }
            />

            {/* Rendez-vous */}
            <Route
              path="/appointments"
              element={
                <ProtectedRoute>
                  <AppointmentList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/appointments/:id"
              element={
                <ProtectedRoute>
                  <AppointmentDetail />
                </ProtectedRoute>
              }
            />

            {/* Consultations */}
            <Route
              path="/consultations"
              element={
                <ProtectedRoute>
                  <ConsultationList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/appointments/:id/waiting"
              element={
                <ProtectedRoute>
                  <WaitingRoom />
                </ProtectedRoute>
              }
            />
            <Route
              path="/consultations/:id"
              element={
                <ProtectedRoute>
                  <ConsultationRoom />
                </ProtectedRoute>
              }
            />
            <Route
              path="/consultations/:id/room"
              element={
                <ProtectedRoute>
                  <ConsultationRoom />
                </ProtectedRoute>
              }
            />
            <Route
              path="/consultations/:id/report"
              element={
                <DoctorRoute>
                  <ConsultationReport />
                </DoctorRoute>
              }
            />
            <Route
              path="/consultations/:id/detail"
              element={
                <ProtectedRoute>
                  <ConsultationDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/consultations/:id/physical"
              element={
                <DoctorRoute>
                  <PhysicalConsultation />
                </DoctorRoute>
              }
            />

            {/* Téléexpertise */}
            <Route
              path="/teleexpertise"
              element={
                <DoctorRoute>
                  <TeleexpertiseList />
                </DoctorRoute>
              }
            />
            <Route
              path="/teleexpertise/new"
              element={
                <DoctorRoute>
                  <TeleexpertiseRequest />
                </DoctorRoute>
              }
            />
            <Route
              path="/teleexpertise/:id"
              element={
                <DoctorRoute>
                  <TeleexpertiseDetail />
                </DoctorRoute>
              }
            />
            <Route
              path="/teleexpertise/:id/respond"
              element={
                <DoctorRoute>
                  <TeleexpertiseRespond />
                </DoctorRoute>
              }
            />

            {/* Ordonnances */}
            <Route
              path="/prescriptions"
              element={
                <ProtectedRoute>
                  <PrescriptionList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/consultations/:consultationId/prescriptions/new"
              element={
                <DoctorRoute>
                  <PrescriptionCreate />
                </DoctorRoute>
              }
            />

            {/* Dossier patient */}
            <Route
              path="/patients/:patientId/record"
              element={
                <ProtectedRoute>
                  <PatientRecord />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patients"
              element={
                <DoctorRoute>
                  <PatientSearch />
                </DoctorRoute>
              }
            />

            {/* Agenda médecin */}
            <Route
              path="/schedule"
              element={
                <DoctorRoute>
                  <DoctorSchedule />
                </DoctorRoute>
              }
            />

            {/* Gestionnaire de structure */}
            <Route
              path="/gestionnaire"
              element={
                <RoleRoute roles={["structure_manager"]}>
                  <GestionnaireManagement />
                </RoleRoute>
              }
            />

            {/* Documents */}
            <Route
              path="/documents"
              element={
                <ProtectedRoute>
                  <DocumentList />
                </ProtectedRoute>
              }
            />

            {/* Paiements */}
            <Route
              path="/payments"
              element={
                <ProtectedRoute>
                  <PaymentList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/consultations/:consultationId/payment"
              element={
                <ProtectedRoute>
                  <PaymentInitiate />
                </ProtectedRoute>
              }
            />

            {/* Interopérabilité */}
            <Route
              path="/interop"
              element={
                <DoctorRoute>
                  <InteropDashboard />
                </DoctorRoute>
              }
            />
            <Route
              path="/interop/fhir"
              element={
                <DoctorRoute>
                  <FhirExplorer />
                </DoctorRoute>
              }
            />
            <Route
              path="/interop/cda"
              element={
                <DoctorRoute>
                  <CdaViewer />
                </DoctorRoute>
              }
            />
            <Route
              path="/interop/terminology"
              element={
                <DoctorRoute>
                  <TerminologyBrowser />
                </DoctorRoute>
              }
            />
            <Route
              path="/interop/dicom"
              element={
                <DoctorRoute>
                  <DicomViewer />
                </DoctorRoute>
              }
            />
            <Route
              path="/interop/dhis2"
              element={
                <DoctorRoute>
                  <Dhis2Dashboard />
                </DoctorRoute>
              }
            />

            {/* Certificats de décès */}
            <Route
              path="/certificats-deces"
              element={
                <RoleRoute
                  roles={[
                    "doctor",
                    "specialist",
                    "health_professional",
                    "admin",
                  ]}
                >
                  <CertificatDecesList />
                </RoleRoute>
              }
            />
            <Route
              path="/certificats-deces/nouveau"
              element={
                <RoleRoute
                  roles={["doctor", "specialist", "health_professional"]}
                >
                  <CertificatDecesForm />
                </RoleRoute>
              }
            />
            <Route
              path="/certificats-deces/statistiques"
              element={
                <RoleRoute
                  roles={[
                    "doctor",
                    "specialist",
                    "health_professional",
                    "admin",
                  ]}
                >
                  <MortalityStatistics />
                </RoleRoute>
              }
            />
            <Route
              path="/certificats-deces/:id"
              element={
                <RoleRoute
                  roles={[
                    "doctor",
                    "specialist",
                    "health_professional",
                    "admin",
                  ]}
                >
                  <CertificatDecesDetail />
                </RoleRoute>
              }
            />
            <Route
              path="/certificats-deces/:id/modifier"
              element={
                <RoleRoute
                  roles={["doctor", "specialist", "health_professional"]}
                >
                  <CertificatDecesForm />
                </RoleRoute>
              }
            />

            {/* Notifications */}
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationCenter />
                </ProtectedRoute>
              }
            />

            {/* Consentements */}
            <Route
              path="/consentements"
              element={
                <ProtectedRoute>
                  <ConsentManagement />
                </ProtectedRoute>
              }
            />

            {/* Messages */}
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <MessageInbox />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages/:conversationId"
              element={
                <ProtectedRoute>
                  <MessageInbox />
                </ProtectedRoute>
              }
            />

            {/* Profile */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin/dashboard"
              element={
                <AdminRoute>
                  <DashboardAdmin />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <UserManagement />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/structures"
              element={
                <AdminRoute>
                  <StructureManagement />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/gestionnaires"
              element={
                <AdminRoute>
                  <GestionnaireAdmin />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/stats"
              element={
                <AdminRoute>
                  <AdminStats />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/audit"
              element={
                <AdminRoute>
                  <AuditLogs />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/announcements"
              element={
                <AdminRoute>
                  <AnnouncementsAdmin />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/roles"
              element={
                <AdminRoute>
                  <RoleManagement />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/licenses"
              element={
                <AdminRoute>
                  <LicenseManagement />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <AdminRoute>
                  <AdminSettings />
                </AdminRoute>
              }
            />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </WebSocketConnector>
    </AuthInitializer>
  );
}

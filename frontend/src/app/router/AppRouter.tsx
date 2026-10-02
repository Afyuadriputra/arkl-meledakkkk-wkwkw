import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom"

import {
  ProtectedRoute,
} from "@/app/guards/ProtectedRoute"
import {
  RoleRoute,
} from "@/app/guards/RoleRoute"
import {
  WorkerSetupGuard,
} from "@/app/guards/WorkerSetupGuard"

import {
  AuthLayout,
} from "@/app/layouts/AuthLayout"
import {
  OperationalLayout,
} from "@/app/layouts/OperationalLayout"
import {
  ResearchLayout,
} from "@/app/layouts/ResearchLayout"
import {
  WorkerLayout,
} from "@/app/layouts/WorkerLayout"

import {
  NotFoundPage,
} from "@/pages/NotFoundPage"

import {
  LoginPage,
} from "@/pages/auth/LoginPage"

import {
  AlertDetailPage,
} from "@/pages/operational/AlertDetailPage"
import {
  AlertsPage,
} from "@/pages/operational/AlertsPage"
import {
  ARKLPage,
} from "@/pages/operational/ARKLPage"
import {
  DashboardPage,
} from "@/pages/operational/DashboardPage"
import {
  DeviceDetailPage,
} from "@/pages/operational/DeviceDetailPage"
import {
  DevicesPage,
} from "@/pages/operational/DevicesPage"
import {
  ExposureProfilePage,
} from "@/pages/operational/ExposureProfilePage"
import {
  MonitoringPage,
} from "@/pages/operational/MonitoringPage"
import {
  WorkerDetailPage,
} from "@/pages/operational/WorkerDetailPage"
import {
  WorkersPage,
} from "@/pages/operational/WorkersPage"

import {
  ResearchARKLPage,
} from "@/pages/research/ResearchARKLPage"
import {
  ResearchDashboardPage,
} from "@/pages/research/ResearchDashboardPage"

import {
  WorkerAlertDetailPage,
} from "@/pages/worker/WorkerAlertDetailPage"
import {
  WorkerAlertsPage,
} from "@/pages/worker/WorkerAlertsPage"
import {
  WorkerExposurePage,
} from "@/pages/worker/WorkerExposurePage"
import {
  WorkerHomePage,
} from "@/pages/worker/WorkerHomePage"
import {
  WorkerMonitoringPage,
} from "@/pages/worker/WorkerMonitoringPage"
import {
  WorkerOnboardingPage,
} from "@/pages/worker/WorkerOnboardingPage"
import {
  WorkerProfilePage,
} from "@/pages/worker/WorkerProfilePage"
import {
  WorkerRiskPage,
} from "@/pages/worker/WorkerRiskPage"


export function AppRouter() {
  return (
    <Routes>
      {/* =========================
          PUBLIC
      ========================== */}
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={<LoginPage />}
        />
      </Route>


      {/* =========================
          PROTECTED
      ========================== */}
      <Route element={<ProtectedRoute />}>
        {/* =========================
            ADMIN / OPERATOR
        ========================== */}
        <Route
          element={
            <RoleRoute
              allowedRoles={[
                "ADMIN",
                "OPERATOR",
              ]}
            />
          }
        >
          <Route
            path="/app"
            element={<OperationalLayout />}
          >
            <Route
              index
              element={
                <Navigate
                  to="dashboard"
                  replace
                />
              }
            />

            <Route
              path="dashboard"
              element={<DashboardPage />}
            />

            <Route
              path="monitoring"
              element={<MonitoringPage />}
            />

            <Route
              path="devices"
              element={<DevicesPage />}
            />

            <Route
              path="devices/:id"
              element={<DeviceDetailPage />}
            />

            <Route
              path="workers"
              element={<WorkersPage />}
            />

            <Route
              path="workers/:id"
              element={<WorkerDetailPage />}
            />

            <Route
              path="workers/:id/exposure"
              element={<ExposureProfilePage />}
            />

            <Route
              path="arkl"
              element={<ARKLPage />}
            />

            <Route
              path="alerts"
              element={<AlertsPage />}
            />

            <Route
              path="alerts/:id"
              element={<AlertDetailPage />}
            />
          </Route>
        </Route>


        {/* =========================
            RESEARCHER
        ========================== */}
        <Route
          element={
            <RoleRoute
              allowedRoles={[
                "RESEARCHER",
              ]}
            />
          }
        >
          <Route
            path="/research"
            element={<ResearchLayout />}
          >
            <Route
              index
              element={
                <Navigate
                  to="dashboard"
                  replace
                />
              }
            />

            <Route
              path="dashboard"
              element={
                <ResearchDashboardPage />
              }
            />

            <Route
              path="arkl"
              element={
                <ResearchARKLPage />
              }
            />
          </Route>
        </Route>


        {/* =========================
            WORKER
        ========================== */}
        <Route
          element={
            <RoleRoute
              allowedRoles={[
                "WORKER",
              ]}
            />
          }
        >
          <Route element={<WorkerSetupGuard />}>
            {/* Onboarding tidak memakai WorkerLayout */}
            <Route
              path="/worker/onboarding"
              element={
                <WorkerOnboardingPage />
              }
            />

            {/* Worker setelah setup */}
            <Route
              path="/worker"
              element={<WorkerLayout />}
            >
              <Route
                index
                element={
                  <Navigate
                    to="home"
                    replace
                  />
                }
              />

              <Route
                path="home"
                element={
                  <WorkerHomePage />
                }
              />

              <Route
                path="monitoring"
                element={
                  <WorkerMonitoringPage />
                }
              />

              <Route
                path="risk"
                element={
                  <WorkerRiskPage />
                }
              />

              <Route
                path="alerts"
                element={
                  <WorkerAlertsPage />
                }
              />

              <Route
                path="alerts/:id"
                element={
                  <WorkerAlertDetailPage />
                }
              />

              <Route
                path="profile"
                element={
                  <WorkerProfilePage />
                }
              />

              <Route
                path="profile/exposure"
                element={
                  <WorkerExposurePage />
                }
              />
            </Route>
          </Route>
        </Route>
      </Route>


      {/* =========================
          ROOT
      ========================== */}
      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />


      {/* =========================
          FALLBACK
      ========================== */}
      <Route
        path="*"
        element={<NotFoundPage />}
      />
    </Routes>
  )
}
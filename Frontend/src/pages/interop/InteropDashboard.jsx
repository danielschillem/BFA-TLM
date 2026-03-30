import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  FileJson, FileCode2, BookOpen, MonitorDot, Globe, Pill,
  CheckCircle2, XCircle, ArrowRight, Activity, Shield, Zap,
  Database, Building2
} from 'lucide-react'
import { fhirApi, cdaApi, terminologyApi, icd11Api, dicomApi, dhis2Api } from '@/api'
import AppLayout from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, StatCard } from '@/components/ui/Card'
import { Spinner } from '@/components/common/LoadingSpinner'

function ServiceStatus({ name, icon: Icon, color, healthQuery, description, linkTo }) {
  const isOnline = healthQuery.data && !healthQuery.isError
  const isLoading = healthQuery.isLoading

  return (
    <Link to={linkTo} className="block">
      <Card hover className="p-4 transition-all hover:shadow-md">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${color}-50`}>
            <Icon className={`w-5 h-5 text-${color}-600`} />
          </div>
          {isLoading ? (
            <Spinner size="sm" />
          ) : isOnline ? (
            <span className="flex items-center gap-1 text-xs font-medium text-green-600">
              <CheckCircle2 className="w-3.5 h-3.5" /> En ligne
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-medium text-red-500">
              <XCircle className="w-3.5 h-3.5" /> Hors ligne
            </span>
          )}
        </div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">{name}</h3>
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{description}</p>
        <div className="flex items-center gap-1 text-xs font-medium text-primary-600 group-hover:text-primary-700">
          Explorer <ArrowRight className="w-3 h-3" />
        </div>
      </Card>
    </Link>
  )
}

export default function InteropDashboard() {
  // Health checks
  const fhirHealth = useQuery({
    queryKey: ['fhir', 'metadata'],
    queryFn: () => fhirApi.metadata().then(r => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const cdaHealth = useQuery({
    queryKey: ['cda', 'metadata'],
    queryFn: () => cdaApi.metadata().then(r => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const snomedHealth = useQuery({
    queryKey: ['snomed', 'health'],
    queryFn: () => terminologyApi.snomedHealth().then(r => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const icd11Health = useQuery({
    queryKey: ['icd11', 'health'],
    queryFn: () => icd11Api.health().then(r => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const dicomHealth = useQuery({
    queryKey: ['dicom', 'health'],
    queryFn: () => dicomApi.health().then(r => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const dhis2Health = useQuery({
    queryKey: ['dhis2', 'health'],
    queryFn: () => dhis2Api.health().then(r => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const endosHealth = useQuery({
    queryKey: ['endos', 'health'],
    queryFn: () => dhis2Api.endosHealth().then(r => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const healthChecks = [fhirHealth, cdaHealth, snomedHealth, icd11Health, dicomHealth, dhis2Health, endosHealth]
  const onlineCount = healthChecks.filter(h => h.data && !h.isError).length
  const totalCount = healthChecks.length

  return (
    <AppLayout title="Interopérabilité">
      <div className="space-y-6 animate-fade-in">
        {/* Hero stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Zap}       label="Services actifs"    value={`${onlineCount}/${totalCount}`} color="green" />
          <StatCard icon={FileJson}   label="Ressources FHIR"   value={fhirHealth.data?.rest?.[0]?.resource?.length ?? '—'} color="blue" />
          <StatCard icon={Shield}     label="Standards"          value="8" color="purple" />
          <StatCard icon={Activity}   label="Protocoles DICOM"  value="QIDO/WADO/STOW" color="teal" />
        </div>

        {/* Standards grid */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Standards d'interopérabilité</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ServiceStatus
              name="HL7 FHIR R4"
              icon={FileJson}
              color="orange"
              healthQuery={fhirHealth}
              description="14 types de ressources · Patient/$everything · Codage LOINC, ICD-10/11, SNOMED"
              linkTo="/interop/fhir"
            />
            <ServiceStatus
              name="HL7 CDA R2 / C-CDA 2.1"
              icon={FileCode2}
              color="purple"
              healthQuery={cdaHealth}
              description="Documents cliniques structurés XML · CCD, Consultation Note, Patient Summary"
              linkTo="/interop/cda"
            />
            <ServiceStatus
              name="SNOMED CT"
              icon={BookOpen}
              color="blue"
              healthQuery={snomedHealth}
              description="Classification clinique internationale · 350 000+ concepts · Snowstorm API"
              linkTo="/interop/terminology"
            />
            <ServiceStatus
              name="ICD-11 (OMS)"
              icon={Globe}
              color="green"
              healthQuery={icd11Health}
              description="CIM-11 · Recherche, validation, crosswalk ICD-10→ICD-11 · API WHO"
              linkTo="/interop/terminology"
            />
            <ServiceStatus
              name="ATC (Médicaments)"
              icon={Pill}
              color="purple"
              healthQuery={fhirHealth}
              description="Classification Anatomique, Thérapeutique et Chimique · 14 groupes ATC"
              linkTo="/interop/terminology"
            />
            <ServiceStatus
              name="DICOM / DICOMweb"
              icon={MonitorDot}
              color="red"
              healthQuery={dicomHealth}
              description="Imagerie médicale · dcm4chee-arc PACS · OHIF Viewer · STOW-RS / WADO-RS / QIDO-RS"
              linkTo="/interop/dicom"
            />
            <ServiceStatus
              name="DHIS2"
              icon={Database}
              color="teal"
              healthQuery={dhis2Health}
              description="Système national d'information sanitaire · Indicateurs agrégés · OMS Web API v2.40"
              linkTo="/interop/dhis2"
            />
            <ServiceStatus
              name="ENDOS (Burkina Faso)"
              icon={Building2}
              color="amber"
              healthQuery={endosHealth}
              description="Entrepôt National de Données Sanitaires · MSHP · Reporting mensuel télémédecine"
              linkTo="/interop/dhis2"
            />
          </div>
        </div>

        {/* Architecture overview */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-gray-900">Architecture d'interopérabilité</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Échange de données</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2"><FileJson className="w-4 h-4 text-orange-500" /> FHIR R4 (REST + JSON)</li>
                  <li className="flex items-center gap-2"><FileCode2 className="w-4 h-4 text-purple-500" /> CDA R2 (XML structuré)</li>
                  <li className="flex items-center gap-2"><MonitorDot className="w-4 h-4 text-red-500" /> DICOMweb (imagerie)</li>
                  <li className="flex items-center gap-2"><Database className="w-4 h-4 text-teal-500" /> DHIS2 (agrégé)</li>
                  <li className="flex items-center gap-2"><Building2 className="w-4 h-4 text-amber-500" /> ENDOS (national)</li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Terminologies</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-blue-500" /> SNOMED CT (Snowstorm)</li>
                  <li className="flex items-center gap-2"><Globe className="w-4 h-4 text-green-500" /> ICD-11 / CIM-11 (OMS)</li>
                  <li className="flex items-center gap-2"><Pill className="w-4 h-4 text-purple-500" /> ATC (médicaments)</li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Codages complémentaires</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2"><Activity className="w-4 h-4 text-teal-500" /> LOINC (observations)</li>
                  <li className="flex items-center gap-2"><Globe className="w-4 h-4 text-orange-500" /> ICD-10 (hérité)</li>
                  <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-gray-500" /> OID 2.16.854.1 (BFA)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

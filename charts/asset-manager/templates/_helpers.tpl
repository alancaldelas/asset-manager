{{/*
Expand the name of the chart.
*/}}
{{- define "asset-manager.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Fully qualified app name.
*/}}
{{- define "asset-manager.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "asset-manager.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "asset-manager.labels" -}}
helm.sh/chart: {{ include "asset-manager.chart" . }}
{{ include "asset-manager.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: asset-manager
{{- end }}

{{/*
Selector labels
*/}}
{{- define "asset-manager.selectorLabels" -}}
app.kubernetes.io/name: {{ include "asset-manager.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
The image reference (repository:tag), defaulting tag to the chart appVersion.
*/}}
{{- define "asset-manager.image" -}}
{{- $tag := default .Chart.AppVersion .Values.image.tag -}}
{{- printf "%s:%s" .Values.image.repository $tag -}}
{{- end }}

{{/*
Name of the chart-managed Secret (session secret, admin password, and — in
OpenShift mode — the database password).
*/}}
{{- define "asset-manager.secretName" -}}
{{- printf "%s-secret" (include "asset-manager.fullname" .) }}
{{- end }}

{{/*
Name of the in-chart (OpenShift) PostgreSQL Service / workload.
*/}}
{{- define "asset-manager.postgresql.fullname" -}}
{{- printf "%s-postgresql" (include "asset-manager.fullname" .) }}
{{- end }}

{{/*
Guard: reject nonsensical database combinations early with a clear message.
*/}}
{{- define "asset-manager.validateDatabase" -}}
{{- if and .Values.openshift.enabled .Values.postgresql.enabled -}}
{{- fail "openshift.enabled=true uses the in-chart SCLorg PostgreSQL; set postgresql.enabled=false (see values-openshift.yaml)." -}}
{{- end -}}
{{- if and (not .Values.openshift.enabled) (not .Values.postgresql.enabled) (not .Values.database.external.host) -}}
{{- fail "No database configured: enable Bitnami (postgresql.enabled=true), enable OpenShift mode (openshift.enabled=true), or set database.external.host." -}}
{{- end -}}
{{- end }}

{{/*
Database mode: "openshift", "bitnami", or "external".
*/}}
{{- define "asset-manager.db.mode" -}}
{{- if .Values.openshift.enabled -}}
openshift
{{- else if .Values.postgresql.enabled -}}
bitnami
{{- else -}}
external
{{- end -}}
{{- end }}

{{/*
Database username.
*/}}
{{- define "asset-manager.db.user" -}}
{{- if .Values.openshift.enabled -}}
{{- .Values.database.user -}}
{{- else if .Values.postgresql.enabled -}}
{{- .Values.postgresql.auth.username -}}
{{- else -}}
{{- .Values.database.user -}}
{{- end -}}
{{- end }}

{{/*
Database name.
*/}}
{{- define "asset-manager.db.name" -}}
{{- if .Values.openshift.enabled -}}
{{- .Values.database.name -}}
{{- else if .Values.postgresql.enabled -}}
{{- .Values.postgresql.auth.database -}}
{{- else -}}
{{- .Values.database.name -}}
{{- end -}}
{{- end }}

{{/*
Database host (Service DNS name).
*/}}
{{- define "asset-manager.db.host" -}}
{{- if .Values.openshift.enabled -}}
{{- include "asset-manager.postgresql.fullname" . -}}
{{- else if .Values.postgresql.enabled -}}
{{- printf "%s-postgresql" .Release.Name -}}
{{- else -}}
{{- .Values.database.external.host -}}
{{- end -}}
{{- end }}

{{/*
Name of the Secret holding the DB password.
  * openshift -> chart-managed Secret
  * bitnami   -> Secret created by the Bitnami subchart (<release>-postgresql)
  * external  -> user-provided existing Secret
*/}}
{{- define "asset-manager.db.secretName" -}}
{{- if .Values.openshift.enabled -}}
{{- include "asset-manager.secretName" . -}}
{{- else if .Values.postgresql.enabled -}}
{{- printf "%s-postgresql" .Release.Name -}}
{{- else -}}
{{- .Values.database.external.existingSecret -}}
{{- end -}}
{{- end }}

{{/*
Key within the DB password Secret. Bitnami stores the custom-user password
under "password"; the chart Secret and the external default also use "password".
*/}}
{{- define "asset-manager.db.passwordKey" -}}
{{- if .Values.openshift.enabled -}}
password
{{- else if .Values.postgresql.enabled -}}
password
{{- else -}}
{{- .Values.database.external.passwordKey -}}
{{- end -}}
{{- end }}

{{- define "paperclip.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "paperclip.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s" (include "paperclip.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "paperclip.labels" -}}
app.kubernetes.io/name: {{ include "paperclip.name" . }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "paperclip.selectorLabels" -}}
app.kubernetes.io/name: {{ include "paperclip.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "paperclip.serverService" -}}
{{ include "paperclip.fullname" . }}-server
{{- end -}}

{{- define "paperclip.postgresService" -}}
{{ include "paperclip.fullname" . }}-postgres
{{- end -}}

{{- define "paperclip.databaseUrl" -}}
{{- printf "postgresql://%s:%s@%s:5432/%s" .Values.postgres.auth.username .Values.secrets.postgresPassword (include "paperclip.postgresService" .) .Values.postgres.auth.database -}}
{{- end -}}

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Rapport de consultation #{{ $consultation->id }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #333; margin: 0; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #0891b2; padding-bottom: 12px; margin-bottom: 15px; }
        .header h1 { color: #0891b2; margin: 0; font-size: 20px; }
        .header p { color: #666; margin: 4px 0 0; font-size: 10px; }
        .meta-grid { display: table; width: 100%; margin-bottom: 15px; }
        .meta-col { display: table-cell; width: 50%; vertical-align: top; padding-right: 10px; }
        .meta-col h3 { color: #0891b2; border-bottom: 1px solid #ddd; padding-bottom: 4px; font-size: 12px; margin: 0 0 6px; }
        .meta-col p { margin: 2px 0; }
        .label { color: #666; font-size: 10px; }
        .section { margin-bottom: 14px; }
        .section h3 { color: #0891b2; font-size: 13px; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; margin: 0 0 6px; }
        .section-content { padding-left: 8px; }
        .badge { display: inline-block; padding: 1px 6px; border-radius: 8px; font-size: 9px; font-weight: bold; }
        .badge-green { background: #dcfce7; color: #166534; }
        .badge-red { background: #fecaca; color: #991b1b; }
        .badge-yellow { background: #fef3c7; color: #92400e; }
        .badge-blue { background: #dbeafe; color: #1e40af; }
        .badge-gray { background: #f3f4f6; color: #4b5563; }
        table.entity { width: 100%; border-collapse: collapse; margin: 4px 0 10px; font-size: 10px; }
        table.entity th { background: #f1f5f9; color: #334155; padding: 5px 8px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        table.entity td { padding: 4px 8px; border-bottom: 1px solid #f1f5f9; }
        .signed { text-align: center; margin: 20px 0 10px; padding: 10px; border: 1px solid #16a34a; border-radius: 6px; background: #f0fdf4; }
        .signed p { margin: 2px 0; color: #166534; }
        .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; color: #999; font-size: 9px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>TLM-BFA / BFA TLM</h1>
        <p>Plateforme de Télémédecine du Burkina Faso</p>
    </div>

    <h2 style="text-align:center; color:#333; font-size:16px; margin-bottom:15px;">COMPTE-RENDU DE CONSULTATION</h2>

    <div class="meta-grid">
        <div class="meta-col">
            <h3>Consultation</h3>
            <p><span class="label">N° :</span> {{ $consultation->id }}</p>
            <p><span class="label">Date :</span> {{ $consultation->started_at ? $consultation->started_at->format('d/m/Y H:i') : $consultation->created_at->format('d/m/Y H:i') }}</p>
            <p><span class="label">Statut :</span> {{ ucfirst($consultation->statut) }}</p>
            @if($consultation->user)
                <p><span class="label">Médecin :</span> Dr. {{ $consultation->user->prenoms }} {{ $consultation->user->nom }}</p>
            @endif
        </div>
        <div class="meta-col">
            <h3>Patient</h3>
            @if($patient)
                <p><span class="label">Nom :</span> {{ $patient->prenoms }} {{ $patient->nom }}</p>
                <p><span class="label">Date de naissance :</span> {{ $patient->date_naissance ? $patient->date_naissance->format('d/m/Y') : '—' }}</p>
                <p><span class="label">Sexe :</span> {{ $patient->sexe === 'M' ? 'Masculin' : ($patient->sexe === 'F' ? 'Féminin' : ($patient->sexe ?? '—')) }}</p>
            @endif
        </div>
    </div>

    {{-- Compte-rendu structuré --}}
    @if($structured)
        @foreach([
            'chief_complaint' => 'Motif de consultation',
            'history' => 'Anamnèse',
            'examination' => 'Examen clinique',
            'diagnosis' => 'Diagnostic',
            'treatment_plan' => 'Plan thérapeutique',
            'notes' => 'Notes',
        ] as $key => $label)
            @if(!empty($structured[$key]))
                <div class="section">
                    <h3>{{ $label }}</h3>
                    <div class="section-content">{!! nl2br(e($structured[$key])) !!}</div>
                </div>
            @endif
        @endforeach
    @endif

    {{-- Consignes de suivi --}}
    @if(!empty($report['follow_up_instructions']))
        <div class="section" style="background:#fffbeb; padding:8px; border-radius:4px; border:1px solid #fde68a;">
            <h3 style="color:#b45309;">Consignes de suivi</h3>
            <div class="section-content">{!! nl2br(e($report['follow_up_instructions'])) !!}</div>
        </div>
    @endif

    {{-- Diagnostics --}}
    @if($consultation->diagnostics->count() > 0)
        <div class="section">
            <h3>Diagnostics ({{ $consultation->diagnostics->count() }})</h3>
            <table class="entity">
                <thead><tr><th>Libellé</th><th>Type</th><th>Code CIM</th><th>Gravité</th><th>Statut</th></tr></thead>
                <tbody>
                @foreach($consultation->diagnostics as $d)
                    <tr>
                        <td>{{ $d->libelle }}</td>
                        <td>{{ $d->type ?? '—' }}</td>
                        <td>{{ $d->code_cim ?? '—' }}</td>
                        <td>{{ $d->gravite ?? '—' }}</td>
                        <td><span class="badge {{ $d->statut === 'confirme' ? 'badge-green' : ($d->statut === 'infirme' ? 'badge-red' : 'badge-yellow') }}">{{ $d->statut ?? '—' }}</span></td>
                    </tr>
                @endforeach
                </tbody>
            </table>
        </div>
    @endif

    {{-- Prescriptions --}}
    @if($consultation->prescriptions->count() > 0)
        <div class="section">
            <h3>Prescriptions ({{ $consultation->prescriptions->count() }})</h3>
            <table class="entity">
                <thead><tr><th>Dénomination</th><th>Posologie</th><th>Durée</th><th>Instructions</th></tr></thead>
                <tbody>
                @foreach($consultation->prescriptions as $p)
                    <tr>
                        <td>{{ $p->denomination }}</td>
                        <td>{{ $p->posologie ?? '—' }}</td>
                        <td>{{ $p->duree_jours ? $p->duree_jours . ' jours' : '—' }}</td>
                        <td>{{ $p->instructions ?? '—' }}</td>
                    </tr>
                @endforeach
                </tbody>
            </table>
        </div>
    @endif

    {{-- Examens --}}
    @if($consultation->examens->count() > 0)
        <div class="section">
            <h3>Examens ({{ $consultation->examens->count() }})</h3>
            <table class="entity">
                <thead><tr><th>Libellé</th><th>Type</th><th>Statut</th><th>Résultats</th></tr></thead>
                <tbody>
                @foreach($consultation->examens as $e)
                    <tr>
                        <td>{{ $e->libelle }}@if($e->urgent) <span class="badge badge-red">Urgent</span>@endif</td>
                        <td>{{ $e->type ?? '—' }}</td>
                        <td><span class="badge {{ $e->statut === 'interprete' ? 'badge-green' : ($e->statut === 'resultat_disponible' ? 'badge-yellow' : 'badge-gray') }}">{{ $e->statut }}</span></td>
                        <td>{{ $e->resultats ?? '—' }}</td>
                    </tr>
                @endforeach
                </tbody>
            </table>
        </div>
    @endif

    {{-- Traitements --}}
    @if($consultation->traitements->count() > 0)
        <div class="section">
            <h3>Traitements ({{ $consultation->traitements->count() }})</h3>
            <table class="entity">
                <thead><tr><th>Type</th><th>Médicaments</th><th>Dosages</th><th>Posologie</th><th>Durée</th></tr></thead>
                <tbody>
                @foreach($consultation->traitements as $t)
                    <tr>
                        <td>{{ ucfirst($t->type) }}</td>
                        <td>{{ $t->medicaments ?? '—' }}</td>
                        <td>{{ $t->dosages ?? '—' }}</td>
                        <td>{{ $t->posologies ?? '—' }}</td>
                        <td>{{ $t->duree ?? '—' }}</td>
                    </tr>
                @endforeach
                </tbody>
            </table>
        </div>
    @endif

    {{-- Signature --}}
    @if(!empty($report['signed_at']))
        <div class="signed">
            <p style="font-weight:bold; font-size:12px;">&check; Rapport sign&eacute; &eacute;lectroniquement</p>
            <p><span class="label">Date :</span> {{ \Carbon\Carbon::parse($report['signed_at'])->format('d/m/Y à H:i') }}</p>
            @if(!empty($report['signed_by_name']))
                <p><span class="label">Par :</span> Dr. {{ $report['signed_by_name'] }}</p>
            @endif
        </div>
    @endif

    <div class="footer">
        <p>Document généré automatiquement par la plateforme TLM-BFA / BFA TLM — {{ now()->format('d/m/Y H:i') }}</p>
        <p>Ce document est confidentiel et couvert par le secret médical.</p>
    </div>
</body>
</html>

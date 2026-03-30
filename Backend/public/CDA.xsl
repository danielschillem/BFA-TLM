<?xml version="1.0" encoding="UTF-8"?>
<!--
  CDA R2 Stylesheet — TLM-BFA
  Transforme un document CDA R2 / C-CDA 2.1 en HTML lisible.
  Basé sur la spécification HL7 CDA Narrative Block rendering.
-->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:cda="urn:hl7-org:v3"
  xmlns:sdtc="urn:hl7-org:sdtc"
  exclude-result-prefixes="cda sdtc">

  <xsl:output method="html" indent="yes" encoding="UTF-8"
    doctype-system="about:legacy-compat"/>

  <!-- ══════════════════════════════════════════════════════════════════════ -->
  <!--  ROOT TEMPLATE                                                        -->
  <!-- ══════════════════════════════════════════════════════════════════════ -->
  <xsl:template match="/">
    <html lang="fr">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>
          <xsl:value-of select="cda:ClinicalDocument/cda:title"/>
        </title>
        <style>
          :root {
            --primary: #1e40af;
            --primary-light: #dbeafe;
            --border: #e5e7eb;
            --bg: #f9fafb;
            --text: #111827;
            --text-muted: #6b7280;
            --success: #059669;
            --danger: #dc2626;
            --warning: #d97706;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: var(--text);
            background: var(--bg);
            line-height: 1.6;
            padding: 0;
          }
          .cda-doc {
            max-width: 960px;
            margin: 2rem auto;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          /* Header */
          .cda-header {
            background: var(--primary);
            color: #fff;
            padding: 1.5rem 2rem;
          }
          .cda-header h1 {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
          }
          .cda-header .meta {
            display: flex;
            flex-wrap: wrap;
            gap: 1.5rem;
            font-size: 0.875rem;
            opacity: 0.9;
          }
          .cda-header .meta span { white-space: nowrap; }

          /* Patient banner */
          .patient-banner {
            background: var(--primary-light);
            padding: 1rem 2rem;
            border-bottom: 2px solid var(--primary);
            display: flex;
            flex-wrap: wrap;
            gap: 2rem;
            align-items: center;
          }
          .patient-banner .name {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--primary);
          }
          .patient-banner .detail {
            font-size: 0.875rem;
            color: var(--text-muted);
          }
          .patient-banner .detail strong { color: var(--text); }

          /* Sections */
          .cda-body { padding: 1rem 2rem 2rem; }
          .cda-section {
            margin-top: 1.5rem;
            border: 1px solid var(--border);
            border-radius: 6px;
            overflow: hidden;
          }
          .cda-section-title {
            background: var(--bg);
            padding: 0.75rem 1rem;
            font-size: 1rem;
            font-weight: 600;
            border-bottom: 1px solid var(--border);
            color: var(--primary);
            cursor: pointer;
            user-select: none;
          }
          .cda-section-title::before {
            content: '▸ ';
            font-size: 0.75rem;
          }
          .cda-section-content {
            padding: 1rem;
            font-size: 0.9rem;
          }

          /* Narrative block tables */
          .cda-section-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 0.5rem 0;
          }
          .cda-section-content th {
            background: var(--bg);
            text-align: left;
            padding: 0.5rem 0.75rem;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.02em;
            color: var(--text-muted);
            border-bottom: 2px solid var(--border);
          }
          .cda-section-content td {
            padding: 0.5rem 0.75rem;
            border-bottom: 1px solid var(--border);
            vertical-align: top;
          }
          .cda-section-content tr:last-child td { border-bottom: none; }
          .cda-section-content tr:hover td { background: #f0f9ff; }

          /* Lists */
          .cda-section-content ul, .cda-section-content ol {
            padding-left: 1.5rem;
            margin: 0.5rem 0;
          }
          .cda-section-content li { margin-bottom: 0.25rem; }

          /* Paragraphs */
          .cda-section-content p { margin-bottom: 0.5rem; }
          .cda-section-content br { line-height: 1.8; }

          /* Footer */
          .cda-footer {
            margin-top: 2rem;
            padding: 1rem 2rem;
            background: var(--bg);
            border-top: 1px solid var(--border);
            font-size: 0.75rem;
            color: var(--text-muted);
            text-align: center;
          }

          /* Author / Custodian info */
          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
            padding: 1rem 2rem;
            border-bottom: 1px solid var(--border);
          }
          .info-card {
            background: var(--bg);
            padding: 0.75rem 1rem;
            border-radius: 6px;
            font-size: 0.85rem;
          }
          .info-card .label {
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            font-weight: 600;
            margin-bottom: 0.25rem;
          }

          /* Status badges */
          .status-active { color: var(--success); font-weight: 600; }
          .status-completed { color: var(--primary); font-weight: 600; }
          .status-aborted { color: var(--danger); font-weight: 600; }

          /* No data */
          .no-data {
            color: var(--text-muted);
            font-style: italic;
            padding: 0.5rem 0;
          }

          @media print {
            body { background: #fff; }
            .cda-doc { box-shadow: none; margin: 0; max-width: none; }
            .cda-header { background: #333 !important; -webkit-print-color-adjust: exact; }
          }
          @media (max-width: 640px) {
            .cda-doc { margin: 0; border-radius: 0; }
            .cda-header, .cda-body, .info-grid { padding-left: 1rem; padding-right: 1rem; }
          }
        </style>
      </head>
      <body>
        <div class="cda-doc">
          <xsl:apply-templates select="cda:ClinicalDocument"/>
        </div>
      </body>
    </html>
  </xsl:template>

  <!-- ══════════════════════════════════════════════════════════════════════ -->
  <!--  CLINICAL DOCUMENT                                                    -->
  <!-- ══════════════════════════════════════════════════════════════════════ -->
  <xsl:template match="cda:ClinicalDocument">
    <!-- Header -->
    <div class="cda-header">
      <h1><xsl:value-of select="cda:title"/></h1>
      <div class="meta">
        <span>
          <xsl:text>Date : </xsl:text>
          <xsl:call-template name="formatDateTime">
            <xsl:with-param name="ts" select="cda:effectiveTime/@value"/>
          </xsl:call-template>
        </span>
        <span>
          <xsl:text>ID : </xsl:text>
          <xsl:value-of select="cda:id/@extension"/>
        </span>
        <span>
          <xsl:text>Confidentialité : </xsl:text>
          <xsl:call-template name="confidentialityLabel">
            <xsl:with-param name="code" select="cda:confidentialityCode/@code"/>
          </xsl:call-template>
        </span>
      </div>
    </div>

    <!-- Patient banner -->
    <xsl:apply-templates select="cda:recordTarget/cda:patientRole"/>

    <!-- Author / Custodian -->
    <div class="info-grid">
      <xsl:if test="cda:author/cda:assignedAuthor">
        <div class="info-card">
          <div class="label">Auteur</div>
          <div>
            <xsl:call-template name="formatName">
              <xsl:with-param name="name" select="cda:author/cda:assignedAuthor/cda:assignedPerson/cda:name"/>
            </xsl:call-template>
          </div>
        </div>
      </xsl:if>
      <xsl:if test="cda:custodian/cda:assignedCustodian/cda:representedCustodianOrganization">
        <div class="info-card">
          <div class="label">Organisation</div>
          <div>
            <xsl:value-of select="cda:custodian/cda:assignedCustodian/cda:representedCustodianOrganization/cda:name"/>
          </div>
        </div>
      </xsl:if>
      <xsl:if test="cda:documentationOf/cda:serviceEvent">
        <div class="info-card">
          <div class="label">Période de soins</div>
          <div>
            <xsl:call-template name="formatDateTime">
              <xsl:with-param name="ts" select="cda:documentationOf/cda:serviceEvent/cda:effectiveTime/cda:low/@value"/>
            </xsl:call-template>
            <xsl:text> — </xsl:text>
            <xsl:call-template name="formatDateTime">
              <xsl:with-param name="ts" select="cda:documentationOf/cda:serviceEvent/cda:effectiveTime/cda:high/@value"/>
            </xsl:call-template>
          </div>
        </div>
      </xsl:if>
    </div>

    <!-- Body sections -->
    <div class="cda-body">
      <xsl:apply-templates select="cda:component/cda:structuredBody/cda:component/cda:section"/>
    </div>

    <!-- Footer -->
    <div class="cda-footer">
      Document CDA R2 — C-CDA 2.1 | Généré par TLM-BFA
      <xsl:text> | </xsl:text>
      <xsl:call-template name="formatDateTime">
        <xsl:with-param name="ts" select="cda:effectiveTime/@value"/>
      </xsl:call-template>
    </div>
  </xsl:template>

  <!-- ══════════════════════════════════════════════════════════════════════ -->
  <!--  PATIENT ROLE                                                          -->
  <!-- ══════════════════════════════════════════════════════════════════════ -->
  <xsl:template match="cda:patientRole">
    <div class="patient-banner">
      <div>
        <div class="name">
          <xsl:call-template name="formatName">
            <xsl:with-param name="name" select="cda:patient/cda:name"/>
          </xsl:call-template>
        </div>
        <div class="detail">
          <xsl:text>ID : </xsl:text>
          <strong><xsl:value-of select="cda:id/@extension"/></strong>
        </div>
      </div>
      <xsl:if test="cda:patient/cda:birthTime/@value">
        <div class="detail">
          <xsl:text>Né(e) le </xsl:text>
          <strong>
            <xsl:call-template name="formatDateTime">
              <xsl:with-param name="ts" select="cda:patient/cda:birthTime/@value"/>
            </xsl:call-template>
          </strong>
        </div>
      </xsl:if>
      <xsl:if test="cda:patient/cda:administrativeGenderCode/@displayName">
        <div class="detail">
          <xsl:text>Sexe : </xsl:text>
          <strong><xsl:value-of select="cda:patient/cda:administrativeGenderCode/@displayName"/></strong>
        </div>
      </xsl:if>
      <xsl:if test="cda:addr">
        <div class="detail">
          <xsl:value-of select="cda:addr/cda:streetAddressLine"/>
          <xsl:if test="cda:addr/cda:city">
            <xsl:text>, </xsl:text>
            <xsl:value-of select="cda:addr/cda:city"/>
          </xsl:if>
          <xsl:if test="cda:addr/cda:country">
            <xsl:text> — </xsl:text>
            <xsl:value-of select="cda:addr/cda:country"/>
          </xsl:if>
        </div>
      </xsl:if>
      <xsl:if test="cda:telecom/@value">
        <div class="detail">
          <xsl:value-of select="cda:telecom/@value"/>
        </div>
      </xsl:if>
    </div>
  </xsl:template>

  <!-- ══════════════════════════════════════════════════════════════════════ -->
  <!--  SECTIONS                                                              -->
  <!-- ══════════════════════════════════════════════════════════════════════ -->
  <xsl:template match="cda:section">
    <div class="cda-section">
      <div class="cda-section-title">
        <xsl:choose>
          <xsl:when test="cda:title">
            <xsl:value-of select="cda:title"/>
          </xsl:when>
          <xsl:when test="cda:code/@displayName">
            <xsl:value-of select="cda:code/@displayName"/>
          </xsl:when>
          <xsl:otherwise>Section</xsl:otherwise>
        </xsl:choose>
      </div>
      <div class="cda-section-content">
        <xsl:choose>
          <xsl:when test="cda:text">
            <xsl:apply-templates select="cda:text"/>
          </xsl:when>
          <xsl:otherwise>
            <p class="no-data">Aucune donnée narrative disponible.</p>
          </xsl:otherwise>
        </xsl:choose>
      </div>
    </div>
  </xsl:template>

  <!-- ══════════════════════════════════════════════════════════════════════ -->
  <!--  NARRATIVE BLOCK ELEMENTS                                              -->
  <!-- ══════════════════════════════════════════════════════════════════════ -->

  <!-- Tables -->
  <xsl:template match="cda:table">
    <table>
      <xsl:apply-templates/>
    </table>
  </xsl:template>

  <xsl:template match="cda:thead">
    <thead><xsl:apply-templates/></thead>
  </xsl:template>

  <xsl:template match="cda:tbody">
    <tbody><xsl:apply-templates/></tbody>
  </xsl:template>

  <xsl:template match="cda:tr">
    <tr><xsl:apply-templates/></tr>
  </xsl:template>

  <xsl:template match="cda:th">
    <th>
      <xsl:copy-of select="@colspan|@rowspan"/>
      <xsl:apply-templates/>
    </th>
  </xsl:template>

  <xsl:template match="cda:td">
    <td>
      <xsl:copy-of select="@colspan|@rowspan"/>
      <xsl:apply-templates/>
    </td>
  </xsl:template>

  <!-- Lists -->
  <xsl:template match="cda:list[@listType='ordered']">
    <ol><xsl:apply-templates select="cda:item"/></ol>
  </xsl:template>

  <xsl:template match="cda:list">
    <ul><xsl:apply-templates select="cda:item"/></ul>
  </xsl:template>

  <xsl:template match="cda:item">
    <li><xsl:apply-templates/></li>
  </xsl:template>

  <!-- Paragraphs and line breaks -->
  <xsl:template match="cda:paragraph">
    <p><xsl:apply-templates/></p>
  </xsl:template>

  <xsl:template match="cda:br">
    <br/>
  </xsl:template>

  <xsl:template match="cda:content">
    <span>
      <xsl:if test="@styleCode">
        <xsl:attribute name="class">
          <xsl:value-of select="translate(@styleCode, ' ', ' ')"/>
        </xsl:attribute>
      </xsl:if>
      <xsl:apply-templates/>
    </span>
  </xsl:template>

  <!-- Render observation media (images) placeholder -->
  <xsl:template match="cda:renderMultiMedia">
    <div style="color: var(--text-muted); font-style: italic;">
      [Média référencé : <xsl:value-of select="@referencedObject"/>]
    </div>
  </xsl:template>

  <!-- Links -->
  <xsl:template match="cda:linkHtml">
    <a href="{@href}" target="_blank" rel="noopener noreferrer">
      <xsl:apply-templates/>
    </a>
  </xsl:template>

  <!-- Caption -->
  <xsl:template match="cda:caption">
    <caption style="font-weight: 600; text-align: left; padding: 0.5rem 0;">
      <xsl:apply-templates/>
    </caption>
  </xsl:template>

  <!-- Fallback: pass through text -->
  <xsl:template match="cda:text">
    <xsl:apply-templates/>
  </xsl:template>

  <!-- ══════════════════════════════════════════════════════════════════════ -->
  <!--  NAMED TEMPLATES (UTILITIES)                                           -->
  <!-- ══════════════════════════════════════════════════════════════════════ -->

  <!-- Format HL7 timestamp (YYYYMMDD[HHmmss]) → human-readable -->
  <xsl:template name="formatDateTime">
    <xsl:param name="ts"/>
    <xsl:if test="string-length($ts) &gt;= 8">
      <xsl:value-of select="substring($ts, 7, 2)"/>
      <xsl:text>/</xsl:text>
      <xsl:value-of select="substring($ts, 5, 2)"/>
      <xsl:text>/</xsl:text>
      <xsl:value-of select="substring($ts, 1, 4)"/>
      <xsl:if test="string-length($ts) &gt;= 12">
        <xsl:text> </xsl:text>
        <xsl:value-of select="substring($ts, 9, 2)"/>
        <xsl:text>:</xsl:text>
        <xsl:value-of select="substring($ts, 11, 2)"/>
      </xsl:if>
    </xsl:if>
  </xsl:template>

  <!-- Format CDA name element -->
  <xsl:template name="formatName">
    <xsl:param name="name"/>
    <xsl:if test="$name/cda:prefix">
      <xsl:value-of select="$name/cda:prefix"/>
      <xsl:text> </xsl:text>
    </xsl:if>
    <xsl:choose>
      <xsl:when test="$name/cda:given or $name/cda:family">
        <xsl:value-of select="$name/cda:given"/>
        <xsl:text> </xsl:text>
        <xsl:value-of select="$name/cda:family"/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$name"/>
      </xsl:otherwise>
    </xsl:choose>
    <xsl:if test="$name/cda:suffix">
      <xsl:text>, </xsl:text>
      <xsl:value-of select="$name/cda:suffix"/>
    </xsl:if>
  </xsl:template>

  <!-- Confidentiality code label -->
  <xsl:template name="confidentialityLabel">
    <xsl:param name="code"/>
    <xsl:choose>
      <xsl:when test="$code = 'N'">Normal</xsl:when>
      <xsl:when test="$code = 'R'">Restreint</xsl:when>
      <xsl:when test="$code = 'V'">Très restreint</xsl:when>
      <xsl:otherwise><xsl:value-of select="$code"/></xsl:otherwise>
    </xsl:choose>
  </xsl:template>

</xsl:stylesheet>
